import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
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

const STATUS_NOTIFY_MSG: Partial<Record<string, string>> = {
  DONE:      "✅ Tu vehículo está listo para retirar. ¡Gracias por confiar en nosotros!",
  DELIVERED: "🙏 Gracias por tu visita. ¡Hasta la próxima!",
};

@Injectable()
export class BotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async handle(
    workshopId: string,
    phone: string,
    employeeName: string,
    permissions: string[],
    incomingText: string,
  ): Promise<string> {
    await this.getOrCreateSession(workshopId, phone);
    const text = incomingText.trim().toLowerCase();

    // Reset keywords
    if (["menu", "menú", "inicio", "0", "salir", "hola", "hi"].includes(text)) {
      await this.updateSession(workshopId, phone, "IDLE", null);
      return this.mainMenu(employeeName, permissions);
    }

    const session = await this.prisma.botSession.findUnique({
      where: { workshopId_phone: { workshopId, phone } },
    });
    const step = session?.step ?? "IDLE";
    const context = session?.context as any;

    switch (step) {
      case "IDLE":
        return this.handleIdle(workshopId, phone, permissions, employeeName, text);

      case "ORDER_STATUS_SELECT":
        return this.handleOrderStatusSelect(workshopId, phone, text, context);

      case "ORDER_STATUS_CHANGE":
        return this.handleOrderStatusChange(workshopId, phone, text, context);

      case "NOTE_ORDER_SELECT":
        return this.handleNoteOrderSelect(workshopId, phone, text, context);

      case "NOTE_TEXT_INPUT":
        return this.handleNoteTextInput(workshopId, phone, incomingText, context);

      case "CLIENT_SEARCH":
        return this.handleClientSearch(workshopId, phone, permissions, text);

      default:
        await this.updateSession(workshopId, phone, "IDLE", null);
        return this.mainMenu(employeeName, permissions);
    }
  }

  private mainMenu(name: string, permissions: string[]): string {
    const lines = [`👋 Hola *${name}*! ¿Qué necesitás?\n`];
    const opts = this.buildMenuOptions(permissions);
    opts.forEach((opt, i) => {
      const labels: Record<string, string> = {
        orders_today:  "Ver órdenes de hoy",
        order_status:  "Cambiar estado de una orden",
        add_note:      "Agregar nota a una orden",
        client_search: "Buscar cliente",
      };
      lines.push(`${i + 1}️⃣ ${labels[opt]}`);
    });
    lines.push(`\nRespondé con el número o escribí *menu* para volver acá.`);
    return lines.join("\n");
  }

  private buildMenuOptions(permissions: string[]): string[] {
    const opts: string[] = [];
    if (permissions.includes(Permission.VIEW_ORDERS)) opts.push("orders_today");
    if (permissions.includes(Permission.CHANGE_ORDER_STATUS)) opts.push("order_status");
    if (permissions.includes(Permission.EDIT_ORDERS)) opts.push("add_note");
    if (permissions.includes(Permission.VIEW_CLIENTS)) opts.push("client_search");
    return opts;
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
      return this.listTodayOrders(workshopId);
    }
    if (action === "order_status") {
      return this.startOrderStatusFlow(workshopId, phone);
    }
    if (action === "add_note") {
      return this.startAddNoteFlow(workshopId, phone);
    }
    if (action === "client_search") {
      await this.updateSession(workshopId, phone, "CLIENT_SEARCH", null);
      return "🔍 Escribí el nombre o teléfono del cliente:";
    }
    return this.mainMenu(name, permissions);
  }

  // ─── Orders: today view ──────────────────────────────────────────────────

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

  // ─── Orders: status change flow ──────────────────────────────────────────

  private async startOrderStatusFlow(workshopId: string, phone: string): Promise<string> {
    const orders = await this.prisma.workOrder.findMany({
      where: { workshopId, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      include: {
        client: { select: { name: true, phone: true } },
        vehicle: { select: { plate: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    if (!orders.length) return "📋 No hay órdenes activas.\n\nEscribí *menu* para volver.";

    const orderSummaries = orders.map((o) => ({
      id: o.id,
      client: o.client.name,
      clientPhone: o.client.phone,
      plate: o.vehicle.plate,
      status: o.status,
    }));

    await this.updateSession(workshopId, phone, "ORDER_STATUS_SELECT", { orders: orderSummaries });

    const lines = ["📋 *Órdenes activas* — elegí una:\n"];
    orders.forEach((o, i) => {
      lines.push(`${i + 1}. ${o.client.name} (${o.vehicle.plate}) — ${STATUS_LABELS[o.status]}`);
    });
    lines.push("\nRespondé con el número de la orden:");
    return lines.join("\n");
  }

  private async handleOrderStatusSelect(
    workshopId: string,
    phone: string,
    text: string,
    context: { orders: { id: string; client: string; clientPhone: string; plate: string; status: string }[] } | null,
  ): Promise<string> {
    const orders = context?.orders ?? [];
    const idx = parseInt(text) - 1;
    if (isNaN(idx) || !orders[idx]) {
      return "⚠️ Número inválido. Respondé con el número de la orden o escribí *menu*.";
    }
    const order = orders[idx];
    await this.updateSession(workshopId, phone, "ORDER_STATUS_CHANGE", {
      orderId: order.id,
      clientPhone: order.clientPhone,
    });

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
    context: { orderId: string; clientPhone?: string } | null,
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

    // Notify client if applicable
    const notifMsg = STATUS_NOTIFY_MSG[newStatus];
    if (notifMsg && context?.clientPhone) {
      void this.notifications.sendWhatsApp(context.clientPhone, notifMsg);
    }

    await this.updateSession(workshopId, phone, "IDLE", null);
    return `✅ Estado actualizado a *${STATUS_LABELS[newStatus]}*.\n\nEscribí *menu* para volver.`;
  }

  // ─── Orders: add note flow ───────────────────────────────────────────────

  private async startAddNoteFlow(workshopId: string, phone: string): Promise<string> {
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

    const orderSummaries = orders.map((o) => ({
      id: o.id,
      client: o.client.name,
      plate: o.vehicle.plate,
    }));

    await this.updateSession(workshopId, phone, "NOTE_ORDER_SELECT", { orders: orderSummaries });

    const lines = ["📋 *Elegí la orden para agregar una nota:*\n"];
    orders.forEach((o, i) => {
      lines.push(`${i + 1}. ${o.client.name} (${o.vehicle.plate})`);
    });
    lines.push("\nRespondé con el número:");
    return lines.join("\n");
  }

  private async handleNoteOrderSelect(
    workshopId: string,
    phone: string,
    text: string,
    context: { orders: { id: string; client: string; plate: string }[] } | null,
  ): Promise<string> {
    const orders = context?.orders ?? [];
    const idx = parseInt(text) - 1;
    if (isNaN(idx) || !orders[idx]) {
      return "⚠️ Número inválido. Respondé con el número de la orden o escribí *menu*.";
    }
    const order = orders[idx];
    await this.updateSession(workshopId, phone, "NOTE_TEXT_INPUT", { orderId: order.id, orderLabel: `${order.client} (${order.plate})` });
    return `📝 Escribí la nota para *${order.client}* (${order.plate}):`;
  }

  private async handleNoteTextInput(
    workshopId: string,
    phone: string,
    text: string,
    context: { orderId: string; orderLabel: string } | null,
  ): Promise<string> {
    if (!context?.orderId) {
      await this.updateSession(workshopId, phone, "IDLE", null);
      return "⚠️ Sesión perdida. Escribí *menu* para volver.";
    }

    await this.prisma.workOrder.update({
      where: { id: context.orderId },
      data: { mechanicNotes: text.trim() },
    });

    await this.updateSession(workshopId, phone, "IDLE", null);
    return `✅ Nota guardada en *${context.orderLabel}*.\n\nEscribí *menu* para volver.`;
  }

  // ─── Client search ───────────────────────────────────────────────────────

  private async handleClientSearch(
    workshopId: string,
    phone: string,
    _permissions: string[],
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

  // ─── Session helpers ─────────────────────────────────────────────────────

  private async getOrCreateSession(workshopId: string, phone: string) {
    return this.prisma.botSession.upsert({
      where: { workshopId_phone: { workshopId, phone } },
      update: {},
      create: { workshopId, phone, step: "IDLE" },
    });
  }

  private async updateSession(workshopId: string, phone: string, step: string, context: any) {
    if (!phone) return;
    await this.prisma.botSession.upsert({
      where: { workshopId_phone: { workshopId, phone } },
      update: { step, context: context ?? undefined },
      create: { workshopId, phone, step, context: context ?? undefined },
    });
  }
}
