import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En progreso",
  WAITING_PARTS: "Esperando repuestos",
  DONE: "Listo para retirar ✅",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

@Injectable()
export class TrackService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const order = await this.prisma.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        description: true,
        scheduledAt: true,
        estimatedCost: true,
        finalCost: true,
        createdAt: true,
        completedAt: true,
        workshop: { select: { name: true } },
        vehicle: {
          select: {
            brand: true,
            model: true,
            year: true,
            plate: true,
            color: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException("Work order not found");

    return {
      id: order.id,
      workshopName: order.workshop.name,
      vehicle: order.vehicle,
      status: order.status,
      statusLabel: STATUS_LABELS[order.status] ?? order.status,
      description: order.description,
      scheduledAt: order.scheduledAt,
      estimatedCost: order.estimatedCost,
      finalCost: order.finalCost,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
    };
  }
}
