import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGuideDto, UpdateGuideDto } from "@mecanico/shared";

@Injectable()
export class GuidesService {
  constructor(private readonly prisma: PrismaService) {}

  create(workshopId: string, dto: CreateGuideDto) {
    return this.prisma.technicalGuide.create({ data: { ...dto, workshopId } });
  }

  findAll(workshopId: string, search?: string) {
    return this.prisma.technicalGuide.findMany({
      where: {
        workshopId,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { vehicle: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, vehicle: true, category: true, createdAt: true },
    });
  }

  async findOne(workshopId: string, id: string) {
    const guide = await this.prisma.technicalGuide.findFirst({ where: { id, workshopId } });
    if (!guide) throw new NotFoundException("Guide not found");
    return guide;
  }

  async update(workshopId: string, id: string, dto: UpdateGuideDto) {
    await this.findOne(workshopId, id);
    return this.prisma.technicalGuide.update({ where: { id }, data: dto });
  }

  async remove(workshopId: string, id: string) {
    await this.findOne(workshopId, id);
    return this.prisma.technicalGuide.delete({ where: { id } });
  }

  findRelevant(workshopId: string, keywords: string[]) {
    if (keywords.length === 0) return Promise.resolve([]);
    return this.prisma.technicalGuide.findMany({
      where: {
        workshopId,
        OR: keywords.flatMap((kw) => [
          { title: { contains: kw, mode: "insensitive" } },
          { vehicle: { contains: kw, mode: "insensitive" } },
          { category: { contains: kw, mode: "insensitive" } },
          { content: { contains: kw, mode: "insensitive" } },
        ]),
      },
      take: 4,
      orderBy: { updatedAt: "desc" },
    });
  }
}
