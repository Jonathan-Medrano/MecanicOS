import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProcessDto, UpdateProcessDto } from "@mecanico/shared";

@Injectable()
export class ProcessesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workshopId: string, dto: CreateProcessDto) {
    const { steps, ...processData } = dto;
    return this.prisma.process.create({
      data: {
        ...processData,
        workshopId,
        steps: {
          create: steps.map((step) => ({
            order: step.order,
            title: step.title,
            description: step.description,
            durationMinutes: step.durationMinutes,
            tools: { create: step.tools },
          })),
        },
      },
      include: {
        steps: { include: { tools: true }, orderBy: { order: "asc" } },
      },
    });
  }

  findAll(workshopId: string, search?: string) {
    return this.prisma.process.findMany({
      where: {
        workshopId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        estimatedMinutes: true,
        createdAt: true,
        _count: { select: { steps: true } },
      },
    });
  }

  async findOne(workshopId: string, id: string) {
    const process = await this.prisma.process.findFirst({
      where: { id, workshopId },
      include: {
        steps: { include: { tools: true }, orderBy: { order: "asc" } },
      },
    });
    if (!process) throw new NotFoundException("Process not found");
    return process;
  }

  async update(workshopId: string, id: string, dto: UpdateProcessDto) {
    await this.findOne(workshopId, id);

    const { steps, ...processData } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (steps !== undefined) {
        await tx.processStep.deleteMany({ where: { processId: id } });
        await tx.process.update({
          where: { id },
          data: {
            ...processData,
            steps: {
              create: steps.map((step) => ({
                order: step.order,
                title: step.title,
                description: step.description,
                durationMinutes: step.durationMinutes,
                tools: { create: step.tools },
              })),
            },
          },
        });
      } else {
        await tx.process.update({ where: { id }, data: processData });
      }

      return tx.process.findUnique({
        where: { id },
        include: {
          steps: { include: { tools: true }, orderBy: { order: "asc" } },
        },
      });
    });
  }

  async remove(workshopId: string, id: string) {
    await this.findOne(workshopId, id);
    return this.prisma.process.delete({ where: { id } });
  }
}
