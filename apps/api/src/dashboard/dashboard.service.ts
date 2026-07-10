import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(workshopId: string) {
    // Argentina is UTC-3. Compute day/month boundaries in local time then convert to UTC.
    const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
    const nowAR = new Date(Date.now() - AR_OFFSET_MS);

    const todayStartAR = new Date(nowAR);
    todayStartAR.setUTCHours(0, 0, 0, 0);
    const todayStart = new Date(todayStartAR.getTime() + AR_OFFSET_MS);

    const monthStartAR = new Date(nowAR);
    monthStartAR.setUTCDate(1);
    monthStartAR.setUTCHours(0, 0, 0, 0);
    const monthStart = new Date(monthStartAR.getTime() + AR_OFFSET_MS);

    const todayEnd = new Date(todayStart);
    todayEnd.setUTCHours(todayEnd.getUTCHours() + 24);

    const [
      totalClients,
      totalVehicles,
      activeOrders,
      pendingOrders,
      inProgressOrders,
      todayOrders,
      unpaidOrders,
      recentOrders,
      completedThisMonth,
      allParts,
    ] = await this.prisma.$transaction([
      this.prisma.client.count({ where: { workshopId } }),
      this.prisma.vehicle.count({ where: { workshopId } }),
      this.prisma.workOrder.count({
        where: { workshopId, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      }),
      this.prisma.workOrder.count({ where: { workshopId, status: "PENDING" } }),
      this.prisma.workOrder.count({ where: { workshopId, status: "IN_PROGRESS" } }),
      this.prisma.workOrder.count({
        where: {
          workshopId,
          scheduledAt: { gte: todayStart, lt: todayEnd },
        },
      }),
      this.prisma.workOrder.count({
        where: {
          workshopId,
          status: { in: ["DONE", "DELIVERED"] },
          paymentStatus: { not: "PAID" },
        },
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
      this.prisma.part.findMany({
        where: { workshopId },
        select: { id: true, name: true, stock: true, minStock: true, unit: true },
      }),
    ]);

    const monthRevenue = completedThisMonth.reduce((sum, o) => {
      if (o.items.length > 0) {
        return sum + o.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
      }
      return sum + Number(o.finalCost ?? o.estimatedCost ?? 0);
    }, 0);

    const lowStockParts = allParts
      .filter((p) => Number(p.minStock) > 0 && Number(p.stock) <= Number(p.minStock))
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        stock: Number(p.stock),
        minStock: Number(p.minStock),
        unit: p.unit,
      }));

    return {
      stats: {
        totalClients,
        totalVehicles,
        activeOrders,
        pendingOrders,
        inProgressOrders,
        todayOrders,
        unpaidOrders,
        monthRevenue,
        doneThisMonth: completedThisMonth.length,
      },
      recentOrders,
      lowStockParts,
    };
  }

  async getDormantClients(workshopId: string) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    return this.prisma.client.findMany({
      where: {
        workshopId,
        workOrders: {
          some: {},
          none: { createdAt: { gte: ninetyDaysAgo } },
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        _count: { select: { workOrders: true } },
      },
      orderBy: { name: "asc" },
      take: 20,
    });
  }

  async getRevenueByMechanic(workshopId: string) {
    const orders = await this.prisma.workOrder.findMany({
      where: {
        workshopId,
        status: { in: ["DONE", "DELIVERED"] },
      },
      select: {
        assignedToId: true,
        assignedTo: { select: { name: true } },
        finalCost: true,
        estimatedCost: true,
        items: { select: { quantity: true, unitPrice: true } },
      },
    });

    const map = new Map<
      string,
      { mechanicId: string | null; mechanicName: string; orderCount: number; revenue: number }
    >();

    for (const order of orders) {
      const key = order.assignedToId ?? "__unassigned__";
      const mechanicName = order.assignedTo?.name ?? "Sin asignar";

      if (!map.has(key)) {
        map.set(key, {
          mechanicId: order.assignedToId ?? null,
          mechanicName,
          orderCount: 0,
          revenue: 0,
        });
      }

      const entry = map.get(key)!;
      entry.orderCount += 1;

      const revenue =
        order.items.length > 0
          ? order.items.reduce(
              (sum, i) => sum + Number(i.quantity) * Number(i.unitPrice),
              0,
            )
          : Number(order.finalCost ?? order.estimatedCost ?? 0);

      entry.revenue += revenue;
    }

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }

  async getAvgRepairTime(workshopId: string) {
    const orders = await this.prisma.workOrder.findMany({
      where: {
        workshopId,
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: { startedAt: true, completedAt: true },
    });

    if (orders.length === 0) {
      return { avgHours: 0, count: 0 };
    }

    const totalHours = orders.reduce((sum, o) => {
      const diffMs = o.completedAt!.getTime() - o.startedAt!.getTime();
      return sum + diffMs / (1000 * 60 * 60);
    }, 0);

    return {
      avgHours: Math.round((totalHours / orders.length) * 100) / 100,
      count: orders.length,
    };
  }

  async getTopServices(workshopId: string) {
    return this.prisma.workOrderItem.groupBy({
      by: ["description"],
      where: {
        type: "LABOR",
        workOrder: { workshopId },
      },
      _count: { description: true },
      orderBy: { _count: { description: "desc" } },
      take: 10,
    });
  }

  async getRevenueChart(workshopId: string) {
    const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
    const nowAR = new Date(Date.now() - AR_OFFSET_MS);

    // Build last 6 months metadata
    const months: { year: number; month: number; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(nowAR.getUTCFullYear(), nowAR.getUTCMonth() - i, 1));
      months.push({
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        label: d.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" }),
      });
    }

    const sixMonthsAgoUtc = new Date(
      Date.UTC(months[0].year, months[0].month, 1) + AR_OFFSET_MS,
    );

    const orders = await this.prisma.workOrder.findMany({
      where: {
        workshopId,
        status: { in: ["DONE", "DELIVERED"] },
        completedAt: { gte: sixMonthsAgoUtc },
      },
      select: {
        completedAt: true,
        finalCost: true,
        estimatedCost: true,
        items: { select: { quantity: true, unitPrice: true } },
      },
    });

    const revenueByKey = new Map<string, number>(
      months.map((m) => [`${m.year}-${m.month}`, 0]),
    );

    for (const o of orders) {
      if (!o.completedAt) continue;
      const localDate = new Date(o.completedAt.getTime() - AR_OFFSET_MS);
      const key = `${localDate.getUTCFullYear()}-${localDate.getUTCMonth()}`;
      const revenue =
        o.items.length > 0
          ? o.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0)
          : Number(o.finalCost ?? o.estimatedCost ?? 0);
      revenueByKey.set(key, (revenueByKey.get(key) ?? 0) + revenue);
    }

    return months.map((m) => ({
      label: m.label,
      revenue: revenueByKey.get(`${m.year}-${m.month}`) ?? 0,
    }));
  }
}
