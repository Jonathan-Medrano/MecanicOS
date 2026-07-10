import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  CreateWorkOrderItemDto,
  UpdateWorkOrderItemDto,
  CreatePaymentDto,
} from "@mecanico/shared";

function buildStatusMessage(status: string, orderId: string): string | undefined {
  const APP_URL = process.env.APP_URL ?? "https://app.talleros.com";
  if (status === "DONE") {
    return (
      `✅ Tu vehículo está listo para retirar. ¡Gracias por confiar en nosotros!\n` +
      `🔗 Seguí el estado de tu orden acá: ${APP_URL}/track/${orderId}`
    );
  }
  if (status === "DELIVERED") {
    return "🙏 Gracias por tu visita. ¡Hasta la próxima!";
  }
  return undefined;
}

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(workshopId: string, dto: CreateWorkOrderDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, clientId: dto.clientId, workshopId },
    });
    if (!vehicle) throw new BadRequestException("Vehicle does not belong to this client");

    return this.prisma.workOrder.create({
      data: { ...dto, workshopId },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, brand: true, model: true, plate: true } },
      },
    });
  }

  async findAll(
    workshopId: string,
    filters?: {
      clientId?: string;
      vehicleId?: string;
      status?: string;
      paymentStatus?: string;
      search?: string;
      scheduledDate?: string;
      scheduledFrom?: string;
      scheduledTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const search = filters?.search?.trim();
    const page  = Math.max(1, filters?.page  ?? 1);
    const limit = Math.min(Math.max(1, filters?.limit ?? 25), 100);
    const skip  = (page - 1) * limit;

    let scheduledAtFilter: any = {};
    if (filters?.scheduledDate === "today") {
      const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
      const nowAR  = new Date(Date.now() - AR_OFFSET_MS);
      const startAR = new Date(nowAR); startAR.setUTCHours(0, 0, 0, 0);
      const endAR   = new Date(nowAR); endAR.setUTCHours(23, 59, 59, 999);
      scheduledAtFilter = {
        scheduledAt: {
          gte: new Date(startAR.getTime() + AR_OFFSET_MS),
          lte: new Date(endAR.getTime()   + AR_OFFSET_MS),
        },
      };
    } else if (filters?.scheduledFrom || filters?.scheduledTo) {
      scheduledAtFilter = {
        scheduledAt: {
          ...(filters.scheduledFrom ? { gte: new Date(filters.scheduledFrom) } : {}),
          ...(filters.scheduledTo   ? { lte: new Date(filters.scheduledTo)   } : {}),
        },
      };
    }

    const where = {
      workshopId,
      ...(filters?.clientId     ? { clientId:     filters.clientId }            : {}),
      ...(filters?.vehicleId    ? { vehicleId:    filters.vehicleId }           : {}),
      ...(filters?.status       ? { status:       filters.status as any }       : {}),
      ...(filters?.paymentStatus ? { paymentStatus: filters.paymentStatus as any } : {}),
      ...scheduledAtFilter,
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: "insensitive" } },
              { client:  { name:  { contains: search, mode: "insensitive" } } },
              { vehicle: { plate: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const include = {
      client:     { select: { id: true, name: true, phone: true } },
      vehicle:    { select: { id: true, brand: true, model: true, plate: true } },
      assignedTo: { select: { id: true, name: true } },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
        include,
        take: limit,
        skip,
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async findOne(workshopId: string, id: string) {
    const order = await this.prisma.workOrder.findFirst({
      where: { id, workshopId },
      include: {
        client: true,
        vehicle: true,
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { createdAt: "asc" } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
    if (!order) throw new NotFoundException("Work order not found");
    return order;
  }

  async addItem(workshopId: string, workOrderId: string, dto: CreateWorkOrderItemDto) {
    await this.findOne(workshopId, workOrderId);
    return this.prisma.workOrderItem.create({
      data: { ...dto, workOrderId },
    });
  }

  async updateItem(
    workshopId: string,
    workOrderId: string,
    itemId: string,
    dto: UpdateWorkOrderItemDto,
  ) {
    await this.findOne(workshopId, workOrderId);
    const item = await this.prisma.workOrderItem.findFirst({
      where: { id: itemId, workOrderId },
    });
    if (!item) throw new NotFoundException("Item not found");
    return this.prisma.workOrderItem.update({ where: { id: itemId }, data: dto });
  }

  async removeItem(workshopId: string, workOrderId: string, itemId: string) {
    await this.findOne(workshopId, workOrderId);
    const result = await this.prisma.workOrderItem.deleteMany({
      where: { id: itemId, workOrderId },
    });
    if (result.count === 0) throw new NotFoundException("Item not found");
    return result;
  }

  async update(workshopId: string, id: string, dto: UpdateWorkOrderDto) {
    const existing = await this.findOne(workshopId, id);

    const data: any = { ...dto };
    if (dto.status === "IN_PROGRESS" && !existing.startedAt) {
      data.startedAt = new Date();
    }
    if ((dto.status === "DONE" || dto.status === "DELIVERED") && !existing.completedAt) {
      data.completedAt = new Date();
    }

    const updated = await this.prisma.workOrder.update({
      where: { id, workshopId },
      data,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, brand: true, model: true, plate: true } },
      },
    });

    // Send WhatsApp to client when status changes to a notifiable state
    const prevStatus = existing.status;
    if (dto.status && dto.status !== prevStatus && updated.client?.phone) {
      const notifMsg = buildStatusMessage(dto.status, id);
      if (notifMsg) {
        void this.notifications.sendWhatsApp(updated.client.phone, notifMsg);
      }
    }

    return updated;
  }

  async remove(workshopId: string, id: string) {
    await this.findOne(workshopId, id);
    return this.prisma.workOrder.deleteMany({ where: { id, workshopId } });
  }

  async addPayment(workshopId: string, workOrderId: string, dto: CreatePaymentDto) {
    await this.findOne(workshopId, workOrderId);
    return this.prisma.payment.create({
      data: {
        workshopId,
        workOrderId,
        amount: dto.amount,
        method: dto.method as any,
        note: dto.note,
      },
    });
  }

  async getPayments(workshopId: string, workOrderId: string) {
    await this.findOne(workshopId, workOrderId);
    return this.prisma.payment.findMany({
      where: { workOrderId },
      orderBy: { createdAt: "asc" },
    });
  }

  async notifyClient(workshopId: string, id: string) {
    const order = await this.findOne(workshopId, id);

    const STATUS_LABELS: Record<string, string> = {
      PENDING: "Pendiente",
      IN_PROGRESS: "En progreso",
      WAITING_PARTS: "Esperando piezas",
      DONE: "Listo para retirar ✅",
      DELIVERED: "Entregado",
      CANCELLED: "Cancelado",
    };

    const itemsTotal = (order.items ?? []).reduce(
      (s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice),
      0,
    );
    const cost = order.items?.length > 0
      ? itemsTotal
      : Number(order.finalCost ?? order.estimatedCost ?? 0);

    const lines = [
      `⚙️ *Actualización de tu vehículo*`,
      `*${order.vehicle.brand} ${order.vehicle.model}* (${order.vehicle.plate})`,
      ``,
      `*Trabajo:* ${order.description}`,
      `*Estado:* ${STATUS_LABELS[order.status] ?? order.status}`,
    ];
    if (cost > 0) {
      lines.push(`*Costo:* $${cost.toLocaleString("es-AR")}`);
    }

    if (order.client?.phone) {
      await this.notifications.sendWhatsApp(order.client.phone, lines.join("\n"));
    }

    return { sent: !!order.client?.phone };
  }
}
