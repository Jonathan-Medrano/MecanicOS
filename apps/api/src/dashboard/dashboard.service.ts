import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(workshopId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalClients,
      totalVehicles,
      activeOrders,
      pendingOrders,
      inProgressOrders,
      todayOrders,
      recentOrders,
      deliveredThisMonth,
      doneThisMonth,
    ] = await this.prisma.$transaction([
      this.prisma.client.count({ where: { workshopId } }),
      this.prisma.vehicle.count({ where: { workshopId } }),
      this.prisma.workOrder.count({
        where: { workshopId, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      }),
      this.prisma.workOrder.count({ where: { workshopId, status: "PENDING" } }),
      this.prisma.workOrder.count({ where: { workshopId, status: "IN_PROGRESS" } }),
      this.prisma.workOrder.count({
        where: { workshopId, createdAt: { gte: todayStart } },
      }),
      this.prisma.workOrder.findMany({
        where: { workshopId, status: { notIn: ["DELIVERED", "CANCELLED"] } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          description: true,
          status: true,
          createdAt: true,
          estimatedCost: true,
          client: { select: { id: true, name: true } },
          vehicle: { select: { brand: true, model: true, plate: true } },
        },
      }),
      this.prisma.workOrder.findMany({
        where: {
          workshopId,
          status: { in: ["DONE", "DELIVERED"] },
          completedAt: { gte: monthStart },
        },
        select: { finalCost: true, estimatedCost: true, items: { select: { quantity: true, unitPrice: true } } },
      }),
      this.prisma.workOrder.count({
        where: {
          workshopId,
          status: { in: ["DONE", "DELIVERED"] },
          completedAt: { gte: monthStart },
        },
      }),
    ]);

    const monthRevenue = deliveredThisMonth.reduce((sum, o) => {
      if (o.items.length > 0) {
        return sum + o.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
      }
      return sum + Number(o.finalCost ?? o.estimatedCost ?? 0);
    }, 0);

    return {
      stats: {
        totalClients,
        totalVehicles,
        activeOrders,
        pendingOrders,
        inProgressOrders,
        todayOrders,
        monthRevenue,
        doneThisMonth,
      },
      recentOrders,
    };
  }
}
