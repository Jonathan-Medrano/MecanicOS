import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateWorkOrderDto, UpdateWorkOrderDto } from "@mecanico/shared";

const STATUS_MESSAGES: Partial<Record<string, string>> = {
  DONE: "✅ Tu vehículo está listo para retirar. ¡Gracias por confiar en nosotros!",
  DELIVERED: "🙏 Gracias por tu visita. ¡Hasta la próxima!",
};

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(workshopId: string, dto: CreateWorkOrderDto) {
    return this.prisma.workOrder.create({
      data: { ...dto, workshopId },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, brand: true, model: true, plate: true } },
      },
    });
  }

  findAll(
    workshopId: string,
    filters?: { clientId?: string; vehicleId?: string; status?: string; search?: string; scheduledDate?: string },
  ) {
    const search = filters?.search?.trim();
    let scheduledAtFilter: any = undefined;
    if (filters?.scheduledDate === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      scheduledAtFilter = { scheduledAt: { gte: start, lte: end } };
    }
    return this.prisma.workOrder.findMany({
      where: {
        workshopId,
        ...(filters?.clientId ? { clientId: filters.clientId } : {}),
        ...(filters?.vehicleId ? { vehicleId: filters.vehicleId } : {}),
        ...(filters?.status ? { status: filters.status as any } : {}),
        ...(scheduledAtFilter ?? {}),
        ...(search
          ? {
              OR: [
                { description: { contains: search, mode: "insensitive" } },
                { client: { name: { contains: search, mode: "insensitive" } } },
                { vehicle: { plate: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      include: {
        client: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, brand: true, model: true, plate: true } },
      },
    });
  }

  async findOne(workshopId: string, id: string) {
    const order = await this.prisma.workOrder.findFirst({
      where: { id, workshopId },
      include: { client: true, vehicle: true },
    });
    if (!order) throw new NotFoundException("Work order not found");
    return order;
  }

  async update(workshopId: string, id: string, dto: UpdateWorkOrderDto) {
    const existing = await this.findOne(workshopId, id);

    const data: any = { ...dto };
    if (dto.status === "IN_PROGRESS" && !data.startedAt) {
      data.startedAt = new Date();
    }
    if ((dto.status === "DONE" || dto.status === "DELIVERED") && !data.completedAt) {
      data.completedAt = new Date();
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, brand: true, model: true, plate: true } },
      },
    });

    // Send WhatsApp to client when status changes to a notifiable state
    const notifMsg = dto.status ? STATUS_MESSAGES[dto.status] : undefined;
    const prevStatus = existing.status;
    if (notifMsg && dto.status !== prevStatus && updated.client?.phone) {
      void this.notifications.sendWhatsApp(updated.client.phone, notifMsg);
    }

    return updated;
  }

  async remove(workshopId: string, id: string) {
    await this.findOne(workshopId, id);
    return this.prisma.workOrder.delete({ where: { id } });
  }
}
