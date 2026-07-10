import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron("0 10 * * *")
  async sendPaymentReminders(): Promise<void> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const orders = await this.prisma.workOrder.findMany({
      where: {
        status: { in: ["DONE" as const, "DELIVERED" as const] },
        paymentStatus: { not: "PAID" as const },
        completedAt: { lt: threeDaysAgo },
      },
      include: {
        client: { select: { phone: true } },
      },
    });

    this.logger.log(`Payment reminder: found ${orders.length} pending order(s)`);

    for (const order of orders) {
      const phone = order.client?.phone;
      if (!phone) continue;

      const amount = Number(order.finalCost ?? order.estimatedCost ?? 0);
      const amountStr = amount > 0 ? `$${amount.toLocaleString("es-AR")}` : "pendiente";

      const message =
        `⏰ Recordatorio de pago: tu vehículo está listo y el pago de ` +
        `${amountStr} está pendiente. Contáctonos cuando gustés. ¡Gracias! 🙏`;

      await this.notifications.sendWhatsApp(phone, message);
    }
  }

  @Cron("0 9 * * *")
  async sendServiceReminders(): Promise<void> {
    const now = new Date();
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        nextServiceDate: { gte: now, lte: in7Days },
      },
      include: {
        client: { select: { name: true, phone: true } },
      },
    });

    this.logger.log(`Service reminder: found ${vehicles.length} vehicle(s) due soon`);

    for (const vehicle of vehicles) {
      const phone = vehicle.client?.phone;
      if (!phone) continue;

      const dateStr = vehicle.nextServiceDate!.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "America/Argentina/Buenos_Aires",
      });

      const parts = [
        `🔧 Hola ${vehicle.client.name}! Tu ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) tiene el próximo servicio programado para el *${dateStr}*.`,
      ];
      if (vehicle.nextServiceKm) {
        parts.push(`📍 También recordá que el próximo servicio es a los ${vehicle.nextServiceKm.toLocaleString("es-AR")} km.`);
      }
      parts.push("Agendá tu turno cuando quieras. ¡Gracias! 😊");

      await this.notifications.sendWhatsApp(phone, parts.join("\n"));
    }
  }
}
