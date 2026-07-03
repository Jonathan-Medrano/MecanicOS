import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Permission } from "../common/permissions";

const STATUS_LABELS: Record<string, string> = {
  PENDING:       "Pendiente",
  IN_PROGRESS:   "En progreso",
  WAITING_PARTS: "Esperando piezas",
  DONE:          "Listo",
  DELIVERED:     "Entregado",
  CANCELLED:     "Cancelado",
};

const STATUS_KEYS = Object.keys(STATUS_LABELS);

@Injectable()
export class BotService {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    workshopId: string,
    phone: string,
    employeeName: string,
    permissions: string[],
    incomingText: string,
  ): Promise<string> {
    const session = await this.getOrCreateSession(workshopId, phone);
    const text = incomingText.trim().toLowerCase();

    // Reset keywords
    if (["menu", "menú", "inicio", "0", "salir", "hola", "hi"].includes(text)) {
      await this.updateSession(workshopId, phone, "IDLE", null);
      return this.mainMenu(employeeName, permissions);
    }

    switch (session.step) {
      case "IDLE":
        return this.handleIdle(workshopId, phone, permissions, employeeName, text);

      case "ORDERS_LIST":
        return this.handleOrdersList(workshopId, phone, permissions, employeeName, text, session.context as any);

      case "ORDER_STATUS_SELECT":
        return this.handleOrderStatusSelect(workshopId, phone, text, session.context as any);

      case "ORDER_STATUS_CHANGE":
        return this.handleOrderStatusChange(workshopId, phone, text, session.context as any);

      case "CLIENT_SEARCH":
        return this.handleClientSearch(workshopId, phone, permissions, text);

      default:
        await this.updateSession(workshopId, phone, "IDLE", null);
        return this.mainMenu(employeeName, permissions);
    }
  }

  private mainMenu(name: string, permissions: string[]): string {
    const lines = [`👋 Hola *${name}*! ¿Qué necesitás?\n`];
    let i = 1;
    if (permissions.includes(Permission.VIEW_ORDERS)) {
      lines.push(`${i++}️⃣ Ver órdenes de hoy`);
    }
    if (permissions.includes(Permission.CHANGE_ORDER_STATUS)) {
      lines.push(`${i++}️⃣ Cambiar estado de una orden`);
    }
    if (permissions.includes(Permission.VIEW_CLIENTS)) {
      lines.push(`${i++}️⃣ Buscar cliente`);
    }
    lines.push(`\nRespondé con el número o escribí *menu* para volver acá.`);
    return lines.join("\n");
  }

  private async handleIdle(
    workshopId: string,
    phone: string,
    permissions: string[],
    name: string,
    text: string,
  ): Promise<string> {
    const options = this.buildMenuOptions(permissions);
    const choice = parseInt(text);
    if (!choice || !options[choice - 1]) return this.mainMenu(name, permissions);

    const action = options[choice - 1];
    if (action === "orders_today") {
      await this.updateSession(workshopId, phone, "ORDERS_LIST", null);
      return this.listTodayOrders(workshopId);
    }
    if (action === "order_status") {
      await this.updateSession(workshopId, phone, "ORDER_STATUS_SELECT", null);
      return this.listActiveOrders(workshopId);
    }
    if (action === "client_search") {
      await this.updateSession(workshopId, phone, "CLIENT_SEARCH", null);
      return "🔍 Escribí el nombre o teléfono del cliente:";
    }
    return this.mainMenu(name, permissions);
  }

  private buildMenuOptions(permissions: string[]): string[] {
    const opts: string[] = [];
    if (permissions.includes(Permission.VIEW_ORDERS)) opts.push("orders_today");
    if (permissions.includes(Permission.CHANGE_ORDER_STATUS)) opts.push("order_status");
    if (permissions.includes(Permission.VIEW_CLIENTS)) opts.push("client_search");
    return opts;
  }

  private async listTodayOrders(workshopId: string): Promise<string> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const orders = await this.prisma.workOrder.findMany({
      where: {
        workshopId,
        createdAt: { gte: start },
        status: { notIn: ["DELIVERED", "CANCELLED"] },
      },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { brand: true, model: true, plate: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (!orders.length) return "📋 No hay órdenes activas hoy.\n\nEscribí *menu* para volver.";

    const lines = ["📋 *Órdenes de hoy:*\n"];
    orders.forEach((o, i) => {
      lines.push(
        `${i + 1}. ${o.client.name} — ${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate})\n   📍 ${STATUS_LABELS[o.status]}\n   📝 ${o.description.slice(0, 60)}${o.description.length > 60 ? "..." : ""}`,
      );
    });
    lines.push("\nEscribí *menu* para volver.");
    return lines.join("\n");
  }

  private async listActiveOrders(workshopId: string): Promise<string> {
    const orders = await this.prisma.workOrder.findMany({
      where: { workshopId, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { plate: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    if (!orders.length) return "📋 No hay órdenes activas.\n\nEscribí *menu* para volver.";

    const lines = ["📋 *Órdenes activas* — elegí una:\n"];
    orders.forEach((o, i) => {
      lines.push(`${i + 1}. ${o.client.name} (${o.vehicle.plate}) — ${STATUS_LABELS[o.status]}`);
    });
    lines.push("\nRespondé con el número de la orden:");

    await this.updateSession(
      orders[0].workshopId,
      "",
      "ORDER_STATUS_SELECT",
      { orders: orders.map((o) => ({ id: o.id, client: o.client.name, plate: o.vehicle.plate, status: o.status })) },
    );

    return lines.join("\n");
  }

  private async handleOrdersList(
    workshopId: string,
    phone: string,
    permissions: string[],
    name: string,
    text: string,
    _context: any,
  ): Promise<string> {
    await this.updateSession(workshopId, phone, "IDLE", null);
    return this.mainMenu(name, permissions);
  }

  private async handleOrderStatusSelect(
    workshopId: string,
    phone: string,
    text: string,
    context: { orders: { id: string; client: string; plate: string; status: string }[] } | null,
  ): Promise<string> {
    const orders = context?.orders ?? [];
    const idx = parseInt(text) - 1;
    if (isNaN(idx) || !orders[idx]) {
      return "⚠️ Número inválido. Respondé con el número de la orden o escribí *menu*.";
    }
    const order = orders[idx];
    await this.updateSession(workshopId, phone, "ORDER_STATUS_CHANGE", { orderId: order.id });

    const lines = [
      `*${order.client}* (${order.plate})\nEstado actual: *${STATUS_LABELS[order.status]}*\n\n¿Cambiar a?\n`,
    ];
    STATUS_KEYS.forEach((k, i) => lines.push(`${i + 1}. ${STATUS_LABELS[k]}`));
    lines.push("\nRespondé con el número:");
    return lines.join("\n");
  }

  private async handleOrderStatusChange(
    workshopId: string,
    phone: string,
    text: string,
    context: { orderId: string } | null,
  ): Promise<string> {
    const idx = parseInt(text) - 1;
    if (isNaN(idx) || !STATUS_KEYS[idx]) {
      return "⚠️ Número inválido. Intentá de nuevo o escribí *menu*.";
    }
    const newStatus = STATUS_KEYS[idx];
    const orderId = context?.orderId;
    if (!orderId) {
      await this.updateSession(workshopId, phone, "IDLE", null);
      return "⚠️ Sesión perdida. Escribí *menu* para volver.";
    }

    await this.prisma.workOrder.update({
      where: { id: orderId },
      data: {
        status: newStatus as any,
        ...(newStatus === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
        ...((newStatus === "DONE" || newStatus === "DELIVERED") ? { completedAt: new Date() } : {}),
      },
    });

    await this.updateSession(workshopId, phone, "IDLE", null);
    return `✅ Estado actualizado a *${STATUS_LABELS[newStatus]}*.\n\nEscribí *menu* para volver.`;
  }

  private async handleClientSearch(
    workshopId: string,
    phone: string,
    permissions: string[],
    text: string,
  ): Promise<string> {
    const clients = await this.prisma.client.findMany({
      where: {
        workshopId,
        OR: [
          { name: { contains: text, mode: "insensitive" } },
          { phone: { contains: text } },
        ],
      },
      include: { _count: { select: { vehicles: true, workOrders: true } } },
      take: 5,
    });

    await this.updateSession(workshopId, phone, "IDLE", null);

    if (!clients.length) return `🔍 Sin resultados para "${text}".\n\nEscribí *menu* para volver.`;

    const lines = [`🔍 *Resultados para "${text}":*\n`];
    clients.forEach((c) => {
      lines.push(
        `👤 *${c.name}*\n   📱 ${c.phone}${c.email ? `\n   ✉️ ${c.email}` : ""}\n   🚗 ${c._count.vehicles} vehículo(s) · 📋 ${c._count.workOrders} orden(es)`,
      );
    });
    lines.push("\nEscribí *menu* para volver.");
    return lines.join("\n\n");
  }

  private async getOrCreateSession(workshopId: string, phone: string) {
    return this.prisma.botSession.upsert({
      where: { workshopId_phone: { workshopId, phone } },
      update: {},
      create: { workshopId, phone, step: "IDLE" },
    });
  }

  private async updateSession(
    workshopId: string,
    phone: string,
    step: string,
    context: any,
  ) {
    if (!phone) return;
    await this.prisma.botSession.upsert({
      where: { workshopId_phone: { workshopId, phone } },
      update: { step, context: context ?? undefined },
      create: { workshopId, phone, step, context: context ?? undefined },
    });
  }
}
