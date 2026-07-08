import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

interface CreateEmployeeDto {
  name: string;
  email: string;
  phone?: string;
  permissions: string[];
}

interface UpdateEmployeeDto {
  name?: string;
  phone?: string;
  permissions?: string[];
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(workshopId: string, dto: CreateEmployeeDto) {
    const existing = await this.prisma.workshopEmployee.findFirst({
      where: { workshopId, email: dto.email },
    });
    if (existing) throw new ConflictException("Email already registered");

    return this.prisma.workshopEmployee.create({
      data: { workshopId, ...dto },
    });
  }

  findAll(workshopId: string) {
    return this.prisma.workshopEmployee.findMany({
      where: { workshopId },
      orderBy: { name: "asc" },
    });
  }

  async findOne(workshopId: string, id: string) {
    const emp = await this.prisma.workshopEmployee.findFirst({
      where: { id, workshopId },
    });
    if (!emp) throw new NotFoundException("Employee not found");
    return emp;
  }

  async update(workshopId: string, id: string, dto: UpdateEmployeeDto) {
    const existing = await this.findOne(workshopId, id);
    const updated = await this.prisma.workshopEmployee.update({ where: { id }, data: dto });

    if (dto.phone && dto.phone !== existing.phone) {
      const workshop = await this.prisma.workshop.findUnique({
        where: { id: workshopId },
        select: { name: true },
      });
      const workshopName = workshop?.name ?? "TallerOS";
      const welcomeMsg = [
        `👋 ¡Hola *${updated.name}*! Ya estás vinculado a *${workshopName}* en TallerOS.`,
        ``,
        `Desde acá podés gestionar órdenes por WhatsApp:`,
        `• _"Se terminó el corola"_ — marcarlo como listo`,
        `• _"Notificá al cliente del Focus"_ — enviarle un mensaje`,
        `• _"Mostrá las órdenes de hoy"_ — ver el estado`,
        ``,
        `Escribí *menu* para ver todas las opciones. 🚗`,
      ].join("\n");
      void this.notifications.sendWhatsApp(dto.phone, welcomeMsg);
    }

    return updated;
  }

  async remove(workshopId: string, id: string) {
    await this.findOne(workshopId, id);
    return this.prisma.workshopEmployee.delete({ where: { id } });
  }
}
