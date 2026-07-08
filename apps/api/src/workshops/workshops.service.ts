import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkshopsService {
  constructor(private readonly prisma: PrismaService) {}

  findOrCreate(clerkUserId: string) {
    return this.prisma.workshop.upsert({
      where: { clerkOrgId: clerkUserId },
      update: {},
      create: { clerkOrgId: clerkUserId, name: "Mi Taller" },
    });
  }

  findByClerkUser(clerkUserId: string) {
    return this.prisma.workshop.findUnique({
      where: { clerkOrgId: clerkUserId },
    });
  }

  update(id: string, data: { name?: string; phone?: string; address?: string; botAutoReply?: boolean; botAutoReplyMsg?: string }) {
    if (data.name != null && !data.name.trim()) throw new BadRequestException("Name cannot be empty");
    if (data.botAutoReply != null && typeof data.botAutoReply !== "boolean") {
      throw new BadRequestException("botAutoReply must be boolean");
    }
    return this.prisma.workshop.update({ where: { id }, data });
  }
}
