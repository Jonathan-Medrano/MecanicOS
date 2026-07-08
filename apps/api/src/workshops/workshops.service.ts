import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateWorkshopSettingsDto } from "@mecanico/shared";

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

  update(id: string, data: UpdateWorkshopSettingsDto) {
    return this.prisma.workshop.update({ where: { id }, data });
  }
}
