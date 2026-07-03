import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(workshopId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalClients,
      totalVehicles,
      activeOrders,
      pendingOrders,
      inProgressOrders,
      todayOrders,
      recentOrders,
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
    ]);

    return {
      stats: { totalClients, totalVehicles, activeOrders, pendingOrders, inProgressOrders, todayOrders },
      recentOrders,
    };
  }
}
