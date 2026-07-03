import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkshopsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(clerkUserId: string) {
    const existing = await this.prisma.workshop.findUnique({
      where: { clerkOrgId: clerkUserId },
    });
    if (existing) return existing;

    return this.prisma.workshop.create({
      data: {
        clerkOrgId: clerkUserId,
        name: "Mi Taller",
      },
    });
  }

  findByClerkUser(clerkUserId: string) {
    return this.prisma.workshop.findUnique({
      where: { clerkOrgId: clerkUserId },
    });
  }

  update(id: string, data: { name?: string; phone?: string; address?: string }) {
    return this.prisma.workshop.update({ where: { id }, data });
  }
}
