import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(workshopId: string) {
    const [totalClients, totalVehicles, activeOrders, pendingOrders, inProgressOrders] =
      await this.prisma.$transaction([
        this.prisma.client.count({ where: { workshopId } }),
        this.prisma.vehicle.count({ where: { workshopId } }),
        this.prisma.workOrder.count({
          where: { workshopId, status: { notIn: ["DELIVERED", "CANCELLED"] } },
        }),
        this.prisma.workOrder.count({ where: { workshopId, status: "PENDING" } }),
        this.prisma.workOrder.count({ where: { workshopId, status: "IN_PROGRESS" } }),
      ]);

    return { totalClients, totalVehicles, activeOrders, pendingOrders, inProgressOrders };
  }
}
