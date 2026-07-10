import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePartDto, UpdatePartDto } from "./dto/parts.schema";

@Injectable()
export class PartsService {
  constructor(private readonly prisma: PrismaService) {}

  create(workshopId: string, dto: CreatePartDto) {
    return this.prisma.part.create({
      data: { ...dto, workshopId },
    });
  }

  findAll(workshopId: string, lowStock?: boolean, search?: string) {
    const q = search?.trim();

    return this.prisma.part.findMany({
      where: {
        workshopId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    }).then((parts) => {
      if (!lowStock) return parts;
      return parts.filter((p) => Number(p.minStock) > 0 && Number(p.stock) <= Number(p.minStock));
    });
  }

  async findOne(workshopId: string, id: string) {
    const part = await this.prisma.part.findFirst({ where: { id, workshopId } });
    if (!part) throw new NotFoundException("Part not found");
    return part;
  }

  async update(workshopId: string, id: string, dto: UpdatePartDto) {
    await this.findOne(workshopId, id);
    return this.prisma.part.update({ where: { id }, data: dto });
  }

  async adjustStock(workshopId: string, id: string, delta: number) {
    await this.findOne(workshopId, id);
    return this.prisma.part.update({
      where: { id },
      data: { stock: { increment: delta } },
    });
  }

  async remove(workshopId: string, id: string) {
    await this.findOne(workshopId, id);
    return this.prisma.part.delete({ where: { id } });
  }
}
