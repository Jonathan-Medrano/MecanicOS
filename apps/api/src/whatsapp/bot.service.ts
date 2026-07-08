import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

const YES_WORDS = new Set(["si", "sí", "s", "yes", "dale", "ok", "claro", "confirmo", "bueno", "1"]);
const NO_WORDS  = new Set(["no", "n", "nel", "cancelar", "cancel", "nope", "2"]);

type NlpResult = {
  intent: "COMPLETE_ORDER" | "NOTIFY_CLIENT" | "CHANGE_STATUS" | "LIST_ORDERS" | "ADD_NOTE" | "SEARCH_CLIENT" | "MENU" | "CONFIRM_YES" | "CONFIRM_NO" | "UNKNOWN";
  vehicleQuery: string | null;
  newStatus: string | null;
  noteText: string | null;
};

@Injectable()
export class BotService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>("GEMINI_API_KEY");
    if (apiKey) this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // ─── Entry point ─────────────────────────────────────────────────────────

  async handle(
    workshopId: string,
    phone: string,
    employeeName: string,
    permissions: string[],
    incomingText: string,
  ): Promise<string> {
    await this.getOrCreateSession(workshopId, phone);
    const text = incomingText.trim().toLowerCase();

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
        return this.handleIdle(workshopId, phone, permissions, employeeName, text, incomingText);

      case "CONFIRM_COMPLETE":
        return this.handleConfirmComplete(workshopId, phone, text, context);

      case "CONFIRM_NOTIFY":
        return this.handleConfirmNotify(workshopId, phone, text, context);

      case "REQUEST_PHONE":
        return this.handleRequestPhone(workshopId, phone, incomingText.trim(), context);

      case "VEHICLE_AMBIGUOUS":
        return this.handleVehicleAmbiguous(workshopId, phone, text, context);

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

  // ─── IDLE: numbered menu OR NLP ──────────────────────────────────────────

  private async handleIdle(
    workshopId: string,
    phone: string,
    permissions: string[],
    name: string,
    text: string,
    rawText: string,
  ): Promise<string> {
    if (/^\d+$/.test(text)) {
      const options = this.buildMenuOptions(permissions);
      const choice = parseInt(text);
      if (!choice || !options[choice - 1]) return this.mainMenu(name, permissions);

      const action = options[choice - 1];
      if (action === "orders_today") return this.listTodayOrders(workshopId);
      if (action === "order_status") return this.startOrderStatusFlow(workshopId, phone);
      if (action === "add_note") return this.startAddNoteFlow(workshopId, phone);
      if (action === "client_search") {
        await this.updateSession(workshopId, phone, "CLIENT_SEARCH", null);
        return "🔍 Escribí el nombre o teléfono del cliente:";
      }
    }

    return this.handleNlp(workshopId, phone, permissions, name, rawText);
  }

  // ─── NLP via Gemini ───────────────────────────────────────────────────────

  private async handleNlp(
    workshopId: string,
    phone: string,
    permissions: string[],
    name: string,
    rawText: string,
  ): Promise<string> {
    if (!this.genAI) return this.mainMenu(name, permissions);

    const parsed = await this.parseIntent(rawText);

    switch (parsed.intent) {
      case "CONFIRM_YES":
      case "MENU":
        return this.mainMenu(name, permissions);

      case "CONFIRM_NO":
        return "❌ Ok, cancelado.\n\nEscribí *menu* para volver.";

      case "LIST_ORDERS":
        return this.listTodayOrders(workshopId);

      case "COMPLETE_ORDER":
      case "CHANGE_STATUS": {
        if (!parsed.vehicleQuery) {
          return "¿A qué vehículo te referís? Dame la patente o el modelo.";
        }
        const status = parsed.newStatus ?? (parsed.intent === "COMPLETE_ORDER" ? "DONE" : null);
        if (!status) {
          return "¿A qué estado lo cambio? Ej: _listo_, _en progreso_, _esperando pieza_.";
        }
        return this.startConfirmStatusChange(workshopId, phone, parsed.vehicleQuery, status);
      }

      case "NOTIFY_CLIENT": {
        if (!parsed.vehicleQuery) {
          return "¿A qué vehículo le mando la notificación? Dame la patente o el modelo.";
        }
        return this.startConfirmNotify(workshopId, phone, parsed.vehicleQuery);
      }

      case "ADD_NOTE":
        return this.startAddNoteFlow(workshopId, phone);

      case "SEARCH_CLIENT": {
        await this.updateSession(workshopId, phone, "CLIENT_SEARCH", null);
        if (parsed.vehicleQuery) return this.handleClientSearch(workshopId, phone, permissions, parsed.vehicleQuery);
        return "🔍 Escribí el nombre o teléfono del cliente:";
      }

      default:
        return this.mainMenu(name, permissions);
    }
  }

  private async parseIntent(text: string): Promise<NlpResult> {
    const fallback: NlpResult = { intent: "UNKNOWN", vehicleQuery: null, newStatus: null, noteText: null };
    if (!this.genAI) return fallback;

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Sos un asistente de un taller mecánico en Argentina. El mecánico escribió o dijo: "${text.replace(/"/g, "'")}"

Analizá la intención y extraé entidades. Devolvé ÚNICAMENTE JSON válido, sin texto adicional ni markdown:
{"intent":"...","vehicleQuery":"...","newStatus":"...","noteText":"..."}

Valores posibles para intent: COMPLETE_ORDER, NOTIFY_CLIENT, CHANGE_STATUS, LIST_ORDERS, ADD_NOTE, SEARCH_CLIENT, MENU, CONFIRM_YES, CONFIRM_NO, UNKNOWN

Mapeo de estados (newStatus):
"listo", "terminado", "se terminó", "completado", "está listo" → DONE
"en progreso", "empezado", "arrancó", "empezamos" → IN_PROGRESS
"esperando repuesto", "esperando pieza", "sin pieza" → WAITING_PARTS
"entregado", "lo retiraron" → DELIVERED
"cancelado" → CANCELLED

Ejemplos:
"se terminó el corola" → {"intent":"COMPLETE_ORDER","vehicleQuery":"corola","newStatus":"DONE","noteText":null}
"notificá al cliente del clio rojo" → {"intent":"NOTIFY_CLIENT","vehicleQuery":"clio","newStatus":null,"noteText":null}
"ponele en progreso al volkswagen ABC123" → {"intent":"CHANGE_STATUS","vehicleQuery":"volkswagen ABC123","newStatus":"IN_PROGRESS","noteText":null}
"mostrá las órdenes de hoy" → {"intent":"LIST_ORDERS","vehicleQuery":null,"newStatus":null,"noteText":null}
"sí, dale" → {"intent":"CONFIRM_YES","vehicleQuery":null,"newStatus":null,"noteText":null}
"no" → {"intent":"CONFIRM_NO","vehicleQuery":null,"newStatus":null,"noteText":null}`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return fallback;
      return JSON.parse(match[0]) as NlpResult;
    } catch {
      return fallback;
    }
  }

  // ─── Status change confirm flow ───────────────────────────────────────────

  private async startConfirmStatusChange(
    workshopId: string,
    phone: string,
    vehicleQuery: string,
    newStatus: string,
  ): Promise<string> {
    const orders = await this.findOrdersByVehicleQuery(workshopId, vehicleQuery);
    if (!orders.length) {
      return `🔍 No encontré órdenes activas para "${vehicleQuery}".\n\nEscribí *menu* para volver.`;
    }

    if (orders.length === 1) {
      const o = orders[0];
      await this.updateSession(workshopId, phone, "CONFIRM_COMPLETE", {
        orderId: o.id,
        clientId: o.client.id,
        clientName: o.client.name,
        clientPhone: o.client.phone,
        vehicleLabel: `${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate})`,
        newStatus,
      });
      return `¿Cambio *${o.vehicle.brand} ${o.vehicle.model}* (${o.vehicle.plate}) de *${o.client.name}* a *${STATUS_LABELS[newStatus] ?? newStatus}*?\n\nRespondé *sí* o *no*.`;
    }

    await this.updateSession(workshopId, phone, "VEHICLE_AMBIGUOUS", {
      intent: "CHANGE_STATUS",
      newStatus,
      candidates: orders.map((o) => ({
        id: o.id,
        clientId: o.client.id,
        clientName: o.client.name,
        clientPhone: o.client.phone,
        vehicleLabel: `${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate})`,
      })),
    });
    const lines = [`🚗 Hay ${orders.length} vehículos que coinciden. ¿Cuál?\n`];
    orders.forEach((o, i) => lines.push(`${i + 1}. ${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate}) — ${o.client.name}`));
    return lines.join("\n");
  }

  private async startConfirmNotify(
    workshopId: string,
    phone: string,
    vehicleQuery: string,
  ): Promise<string> {
    const orders = await this.findOrdersByVehicleQuery(workshopId, vehicleQuery);
    if (!orders.length) {
      return `🔍 No encontré órdenes activas para "${vehicleQuery}".\n\nEscribí *menu* para volver.`;
    }

    if (orders.length === 1) {
      const o = orders[0];
      if (!o.client.phone) {
        await this.updateSession(workshopId, phone, "REQUEST_PHONE", {
          clientId: o.client.id,
          clientName: o.client.name,
          vehicleLabel: `${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate})`,
        });
        return `*${o.client.name}* no tiene número registrado.\n¿Me pasás el WhatsApp para notificarlo?`;
      }
      await this.updateSession(workshopId, phone, "CONFIRM_NOTIFY", {
        clientPhone: o.client.phone,
        clientName: o.client.name,
        vehicleLabel: `${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate})`,
      });
      return `¿Le mando un mensaje a *${o.client.name}* (${o.client.phone}) sobre su *${o.vehicle.brand} ${o.vehicle.model}*?\n\nRespondé *sí* o *no*.`;
    }

    await this.updateSession(workshopId, phone, "VEHICLE_AMBIGUOUS", {
      intent: "NOTIFY_CLIENT",
      newStatus: null,
      candidates: orders.map((o) => ({
        id: o.id,
        clientId: o.client.id,
        clientName: o.client.name,
        clientPhone: o.client.phone,
        vehicleLabel: `${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate})`,
      })),
    });
    const lines = [`🚗 Hay ${orders.length} vehículos que coinciden. ¿Cuál?\n`];
    orders.forEach((o, i) => lines.push(`${i + 1}. ${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate}) — ${o.client.name}`));
    return lines.join("\n");
  }

  // ─── Confirmation step handlers ───────────────────────────────────────────

  private async handleConfirmComplete(
    workshopId: string,
    phone: string,
    text: string,
    context: any,
  ): Promise<string> {
    if (NO_WORDS.has(text)) {
      await this.updateSession(workshopId, phone, "IDLE", null);
      return "❌ Cancelado.\n\nEscribí *menu* para volver.";
    }
    if (!YES_WORDS.has(text)) {
      return `¿Confirmo el cambio de estado? Respondé *sí* o *no*.`;
    }

    const { orderId, clientId, clientPhone, clientName, vehicleLabel, newStatus } = context;

    await this.prisma.workOrder.update({
      where: { id: orderId },
      data: {
        status: newStatus as any,
        ...(newStatus === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
        ...((newStatus === "DONE" || newStatus === "DELIVERED") ? { completedAt: new Date() } : {}),
      },
    });

    const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;
    const notifiable = newStatus === "DONE" || newStatus === "DELIVERED";

    if (notifiable && clientPhone) {
      await this.updateSession(workshopId, phone, "CONFIRM_NOTIFY", {
        clientPhone,
        clientName,
        vehicleLabel,
      });
      return `✅ *${vehicleLabel}* marcado como *${statusLabel}*.\n\n¿Le notifico a *${clientName}* por WhatsApp?\n\nRespondé *sí* o *no*.`;
    }

    if (notifiable && !clientPhone) {
      await this.updateSession(workshopId, phone, "REQUEST_PHONE", {
        clientId,
        clientName,
        vehicleLabel,
      });
      return `✅ *${vehicleLabel}* marcado como *${statusLabel}*.\n\n*${clientName}* no tiene número. ¿Me lo pasás para notificarlo?`;
    }

    await this.updateSession(workshopId, phone, "IDLE", null);
    return `✅ *${vehicleLabel}* marcado como *${statusLabel}*.\n\nEscribí *menu* para volver.`;
  }

  private async handleConfirmNotify(
    workshopId: string,
    phone: string,
    text: string,
    context: any,
  ): Promise<string> {
    if (NO_WORDS.has(text)) {
      await this.updateSession(workshopId, phone, "IDLE", null);
      return "❌ No se envió notificación.\n\nEscribí *menu* para volver.";
    }
    if (!YES_WORDS.has(text)) {
      return `¿Le mando el mensaje a *${context.clientName}*? Respondé *sí* o *no*.`;
    }

    const { clientPhone, clientName, vehicleLabel } = context;
    const msg = [
      `⚙️ *Actualización de tu vehículo*`,
      `*${vehicleLabel}*`,
      ``,
      `✅ Tu vehículo está *listo para retirar*.`,
      `¡Gracias por confiar en nosotros!`,
    ].join("\n");

    void this.notifications.sendWhatsApp(clientPhone, msg);

    await this.updateSession(workshopId, phone, "IDLE", null);
    return `✅ Notificación enviada a *${clientName}*.\n\nEscribí *menu* para volver.`;
  }

  private async handleRequestPhone(
    workshopId: string,
    phone: string,
    rawText: string,
    context: any,
  ): Promise<string> {
    const { clientId, clientName, vehicleLabel } = context;
    const clean = rawText.replace(/[\s\-\(\)\+]/g, "");

    if (!/^\d{8,15}$/.test(clean)) {
      return `⚠️ Ese número no parece válido. Pasámelo con código de área sin espacios, ej: *1112345678*`;
    }

    await this.prisma.client.update({ where: { id: clientId }, data: { phone: clean } });

    const msg = [
      `⚙️ *Actualización de tu vehículo*`,
      `*${vehicleLabel}*`,
      ``,
      `✅ Tu vehículo está *listo para retirar*.`,
      `¡Gracias por confiar en nosotros!`,
    ].join("\n");

    void this.notifications.sendWhatsApp(clean, msg);

    await this.updateSession(workshopId, phone, "IDLE", null);
    return `✅ Número guardado y notificación enviada a *${clientName}*.\n\nEscribí *menu* para volver.`;
  }

  private async handleVehicleAmbiguous(
    workshopId: string,
    phone: string,
    text: string,
    context: any,
  ): Promise<string> {
    const { candidates, intent, newStatus } = context;
    const idx = parseInt(text) - 1;

    if (isNaN(idx) || !candidates[idx]) {
      return "⚠️ Número inválido. Elegí un número de la lista o escribí *menu*.";
    }

    const c = candidates[idx];

    if (intent === "NOTIFY_CLIENT") {
      if (!c.clientPhone) {
        await this.updateSession(workshopId, phone, "REQUEST_PHONE", {
          clientId: c.clientId, clientName: c.clientName, vehicleLabel: c.vehicleLabel,
        });
        return `*${c.clientName}* no tiene número registrado.\n¿Me pasás el WhatsApp para notificarlo?`;
      }
      await this.updateSession(workshopId, phone, "CONFIRM_NOTIFY", {
        clientPhone: c.clientPhone, clientName: c.clientName, vehicleLabel: c.vehicleLabel,
      });
      return `¿Le mando un mensaje a *${c.clientName}* sobre su *${c.vehicleLabel}*?\n\nRespondé *sí* o *no*.`;
    }

    const targetStatus = newStatus ?? "DONE";
    await this.updateSession(workshopId, phone, "CONFIRM_COMPLETE", {
      orderId: c.id, clientId: c.clientId, clientName: c.clientName,
      clientPhone: c.clientPhone, vehicleLabel: c.vehicleLabel, newStatus: targetStatus,
    });
    return `¿Cambio *${c.vehicleLabel}* de *${c.clientName}* a *${STATUS_LABELS[targetStatus]}*?\n\nRespondé *sí* o *no*.`;
  }

  // ─── Orders: today view ───────────────────────────────────────────────────

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

  // ─── Orders: status change flow (numbered menu) ───────────────────────────

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
      id: o.id, client: o.client.name, clientPhone: o.client.phone,
      plate: o.vehicle.plate, status: o.status,
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
      orderId: order.id, clientPhone: order.clientPhone,
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

    const notifMsg = STATUS_NOTIFY_MSG[newStatus];
    if (notifMsg && context?.clientPhone) {
      void this.notifications.sendWhatsApp(context.clientPhone, notifMsg);
    }

    await this.updateSession(workshopId, phone, "IDLE", null);
    return `✅ Estado actualizado a *${STATUS_LABELS[newStatus]}*.\n\nEscribí *menu* para volver.`;
  }

  // ─── Orders: add note flow ─────────────────────────────────────────────────

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
      id: o.id, client: o.client.name, plate: o.vehicle.plate,
    }));

    await this.updateSession(workshopId, phone, "NOTE_ORDER_SELECT", { orders: orderSummaries });

    const lines = ["📋 *Elegí la orden para agregar una nota:*\n"];
    orders.forEach((o, i) => lines.push(`${i + 1}. ${o.client.name} (${o.vehicle.plate})`));
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
    await this.updateSession(workshopId, phone, "NOTE_TEXT_INPUT", {
      orderId: order.id, orderLabel: `${order.client} (${order.plate})`,
    });
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

  // ─── Client search ────────────────────────────────────────────────────────

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

  // ─── DB helpers ───────────────────────────────────────────────────────────

  private findOrdersByVehicleQuery(workshopId: string, query: string) {
    return this.prisma.workOrder.findMany({
      where: {
        workshopId,
        status: { notIn: ["DELIVERED", "CANCELLED"] },
        OR: [
          { vehicle: { brand: { contains: query, mode: "insensitive" } } },
          { vehicle: { model: { contains: query, mode: "insensitive" } } },
          { vehicle: { plate: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { brand: true, model: true, plate: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  }

  // ─── Menu ─────────────────────────────────────────────────────────────────

  private mainMenu(name: string, permissions: string[]): string {
    const lines = [`👋 Hola *${name}*! ¿Qué necesitás?\n`];
    const opts = this.buildMenuOptions(permissions);
    const labels: Record<string, string> = {
      orders_today:  "Ver órdenes de hoy",
      order_status:  "Cambiar estado de una orden",
      add_note:      "Agregar nota a una orden",
      client_search: "Buscar cliente",
    };
    opts.forEach((opt, i) => lines.push(`${i + 1}️⃣ ${labels[opt]}`));
    lines.push(`\nTambién podés escribir comandos de voz:\n_"Se terminó el corola"_\n_"Notificá al cliente del Focus"_\n_"Ponele en progreso al BMW"_`);
    lines.push("\nEscribí *menu* para ver esto de nuevo.");
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

  // ─── Session helpers ──────────────────────────────────────────────────────

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
