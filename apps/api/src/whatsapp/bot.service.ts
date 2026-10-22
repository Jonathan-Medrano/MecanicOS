import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { Permission } from "../common/permissions";
import { WORK_ORDER_STATUS_LABELS, AR_OFFSET_MS } from "@mecanico/shared";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS = WORK_ORDER_STATUS_LABELS;

const MAX_HISTORY_TURNS = 30; // Content objects in the chat history
const MAX_TOOL_ITERATIONS = 5; // Max function-calling rounds per message

const SYSTEM_PROMPT = `Sos el asistente IA de MecánicOS, un sistema de gestión de taller mecánico en Argentina.

## Tu rol
Tenés DOS capacidades combinadas en un solo asistente:

**1. GESTIÓN OPERATIVA** — Usando herramientas para acceder a los datos reales del taller:
- Ver las órdenes de trabajo activas del día
- Buscar órdenes por vehículo (patente, marca, modelo)
- Cambiar el estado de una orden de trabajo
- Agregar notas del mecánico a una orden
- Notificar a clientes por WhatsApp cuando el vehículo está listo
- Buscar información de clientes

**2. EXPERTO TÉCNICO** — Con tu conocimiento y las guías del taller:
- Responder preguntas de mecánica automotriz con procedimientos paso a paso
- Buscar primero en las guías técnicas del taller antes de responder
- Dar especificaciones, torques, intervalos de servicio, diagnósticos

## Reglas de conversación
- Hablá siempre en español rioplatense (voseo: "hacé", "escribí", "tenés", "podés")
- Sé conciso — los mecánicos están trabajando con las manos sucias, no quieren parrafadas
- Usá emojis con moderación para legibilidad (✅ ⚠️ 🔍 📋 🚗 👤)
- Para respuestas técnicas: usá listas numeradas, sé específico con herramientas y torques

## Reglas para cambios de estado y notificaciones
- SIEMPRE confirmá antes de ejecutar una acción (cambiar estado, notificar cliente)
- Preguntá "¿Confirmo?" y esperá "sí" / "dale" / "ok" antes de llamar a la herramienta
- Si el mecánico ya confirmó explícitamente en este mensaje, podés ejecutar directamente
- Después de cambiar un estado a DONE, preguntá si quiere notificar al cliente

## Limitaciones
- No podés crear órdenes, clientes ni vehículos nuevos desde WhatsApp
- Solo actuás sobre el taller al que pertenece el mecánico`;

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOL_LIST_TODAY_ORDERS = {
  name: "listTodayOrders",
  description: "Lista las órdenes de trabajo activas de hoy en el taller (programadas para hoy o creadas hoy sin fecha asignada)",
  parameters: { type: "OBJECT", properties: {}, required: [] as string[] },
};

const TOOL_FIND_ORDERS_BY_VEHICLE = {
  name: "findOrdersByVehicle",
  description: "Busca órdenes de trabajo activas por marca, modelo o patente del vehículo. Podés pasar múltiples palabras.",
  parameters: {
    type: "OBJECT",
    properties: { query: { type: "STRING", description: "Patente, marca o modelo del vehículo. Ej: 'ABC123', 'corolla', 'toyota hilux'" } },
    required: ["query"],
  },
};

const TOOL_FIND_CLIENT = {
  name: "findClient",
  description: "Busca un cliente por nombre o teléfono y muestra sus órdenes activas",
  parameters: {
    type: "OBJECT",
    properties: { query: { type: "STRING", description: "Nombre o número de teléfono del cliente" } },
    required: ["query"],
  },
};

const TOOL_UPDATE_ORDER_STATUS = {
  name: "updateOrderStatus",
  description: "Cambia el estado de una orden de trabajo",
  parameters: {
    type: "OBJECT",
    properties: {
      orderId: { type: "STRING", description: "ID de la orden de trabajo (obtenido de listTodayOrders o findOrdersByVehicle)" },
      status: {
        type: "STRING",
        description: "Nuevo estado: PENDING, IN_PROGRESS, WAITING_PARTS, DONE, DELIVERED, CANCELLED",
      },
    },
    required: ["orderId", "status"],
  },
};

const TOOL_ADD_NOTE = {
  name: "addNote",
  description: "Agrega una nota del mecánico a una orden de trabajo (se SUMA a las notas existentes, no las reemplaza)",
  parameters: {
    type: "OBJECT",
    properties: {
      orderId: { type: "STRING", description: "ID de la orden de trabajo" },
      note: { type: "STRING", description: "Texto de la nota a agregar" },
    },
    required: ["orderId", "note"],
  },
};

const TOOL_SEND_NOTIFICATION = {
  name: "sendClientNotification",
  description: "Envía una notificación de WhatsApp al cliente avisando que su vehículo está listo para retirar",
  parameters: {
    type: "OBJECT",
    properties: {
      orderId: { type: "STRING", description: "ID de la orden de trabajo" },
    },
    required: ["orderId"],
  },
};

const TOOL_SEARCH_GUIDES = {
  name: "searchTechnicalGuides",
  description: "Busca guías técnicas de reparación del taller por tema, sistema o tipo de vehículo. Usalo antes de responder preguntas técnicas.",
  parameters: {
    type: "OBJECT",
    properties: { query: { type: "STRING", description: "Tema de búsqueda. Ej: 'frenos corolla', 'distribución diesel', 'diagnóstico inyectores'" } },
    required: ["query"],
  },
};

function buildTools(permissions: string[]): any[] {
  const tools: any[] = [TOOL_LIST_TODAY_ORDERS, TOOL_FIND_ORDERS_BY_VEHICLE, TOOL_SEARCH_GUIDES];
  if (permissions.includes(Permission.VIEW_CLIENTS)) tools.push(TOOL_FIND_CLIENT);
  if (permissions.includes(Permission.CHANGE_ORDER_STATUS)) {
    tools.push(TOOL_UPDATE_ORDER_STATUS, TOOL_ADD_NOTE, TOOL_SEND_NOTIFICATION);
  }
  return tools;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
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
    const text = incomingText.trim();
    const textLower = text.toLowerCase();

    // Reset shortcut
    if (["menu", "menú", "inicio", "0", "salir"].includes(textLower)) {
      await this.clearHistory(workshopId, phone);
      return this.mainMenu(employeeName, permissions);
    }

    if (!this.genAI) {
      return this.mainMenu(employeeName, permissions);
    }

    const history = await this.loadHistory(workshopId, phone);

    try {
      const { reply, updatedHistory } = await this.runAgentLoop(
        workshopId, permissions, employeeName, text, history,
      );
      await this.saveHistory(workshopId, phone, updatedHistory);
      return reply;
    } catch (e: any) {
      this.logger.error(`Agent loop failed: ${e.message}`);
      return "⚠️ No pude procesar tu mensaje. Intentá de nuevo o escribí *menu*.";
    }
  }

  // ─── AI agent loop with function calling ─────────────────────────────────

  private async runAgentLoop(
    workshopId: string,
    permissions: string[],
    employeeName: string,
    userMessage: string,
    history: any[],
  ): Promise<{ reply: string; updatedHistory: any[] }> {
    const tools = buildTools(permissions);

    const model = this.genAI!.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT + `\n\nMecánico actual: ${employeeName}`,
    });

    const chat = model.startChat({
      history,
      tools: [{ functionDeclarations: tools }],
    } as any);

    const newTurns: any[] = [];
    newTurns.push({ role: "user", parts: [{ text: userMessage }] });

    let result = await chat.sendMessage(userMessage);

    let iterations = 0;
    while (result.response.functionCalls()?.length && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      const calls = result.response.functionCalls()!;

      // Record the model's function call turn
      newTurns.push({
        role: "model",
        parts: calls.map((c: any) => ({ functionCall: { name: c.name, args: c.args } })),
      });

      // Execute all tools
      const responses = await Promise.all(
        calls.map(async (call: any) => {
          try {
            const response = await this.executeTool(workshopId, permissions, call.name, call.args ?? {});
            return { functionResponse: { name: call.name, response } };
          } catch (e: any) {
            this.logger.warn(`Tool ${call.name} failed: ${e.message}`);
            return { functionResponse: { name: call.name, response: { error: e.message } } };
          }
        }),
      );

      // Record function responses as a user turn (Gemini convention)
      newTurns.push({ role: "user", parts: responses });

      result = await (chat.sendMessage as any)(responses);
    }

    const reply = result.response.text()?.trim()
      || "No pude generar una respuesta. Escribí *menu* para volver.";

    // Record final model reply
    newTurns.push({ role: "model", parts: [{ text: reply }] });

    // Merge and trim history
    const updatedHistory = [...history, ...newTurns].slice(-MAX_HISTORY_TURNS);

    return { reply, updatedHistory };
  }

  // ─── Tool executor ────────────────────────────────────────────────────────

  private async executeTool(
    workshopId: string,
    permissions: string[],
    name: string,
    args: Record<string, any>,
  ): Promise<object> {
    switch (name) {
      case "listTodayOrders":
        return this.toolListTodayOrders(workshopId);

      case "findOrdersByVehicle":
        return this.toolFindOrdersByVehicle(workshopId, String(args.query ?? ""));

      case "findClient":
        if (!permissions.includes(Permission.VIEW_CLIENTS))
          return { error: "Sin permiso para ver clientes" };
        return this.toolFindClient(workshopId, String(args.query ?? ""));

      case "updateOrderStatus":
        if (!permissions.includes(Permission.CHANGE_ORDER_STATUS))
          return { error: "Sin permiso para cambiar estados" };
        return this.toolUpdateOrderStatus(workshopId, String(args.orderId), String(args.status));

      case "addNote":
        if (!permissions.includes(Permission.CHANGE_ORDER_STATUS))
          return { error: "Sin permiso para agregar notas" };
        return this.toolAddNote(workshopId, String(args.orderId), String(args.note ?? ""));

      case "sendClientNotification":
        return this.toolSendClientNotification(workshopId, String(args.orderId));

      case "searchTechnicalGuides":
        return this.toolSearchTechnicalGuides(workshopId, String(args.query ?? ""));

      default:
        return { error: `Herramienta desconocida: ${name}` };
    }
  }

  // ─── Tool implementations ─────────────────────────────────────────────────

  private async toolListTodayOrders(workshopId: string): Promise<object> {
    const nowAR = new Date(Date.now() - AR_OFFSET_MS);
    const startAR = new Date(nowAR);
    startAR.setUTCHours(0, 0, 0, 0);
    const start = new Date(startAR.getTime() + AR_OFFSET_MS);
    const endAR = new Date(nowAR);
    endAR.setUTCHours(23, 59, 59, 999);
    const end = new Date(endAR.getTime() + AR_OFFSET_MS);

    const orders = await this.prisma.workOrder.findMany({
      where: {
        workshopId,
        status: { notIn: ["DELIVERED", "CANCELLED"] },
        OR: [
          { scheduledAt: { gte: start, lte: end } },
          { scheduledAt: null, createdAt: { gte: start, lte: end } },
        ],
      },
      include: {
        client: { select: { name: true, phone: true } },
        vehicle: { select: { brand: true, model: true, plate: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      take: 20,
    });

    return {
      total: orders.length,
      orders: orders.map((o) => ({
        id: o.id,
        client: o.client.name,
        clientPhone: o.client.phone ?? null,
        vehicle: `${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate})`,
        plate: o.vehicle.plate,
        status: o.status,
        statusLabel: STATUS_LABELS[o.status] ?? o.status,
        description: o.description,
        scheduledAt: o.scheduledAt
          ? o.scheduledAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" })
          : null,
        assignedTo: o.assignedTo?.name ?? null,
        estimatedCost: o.estimatedCost ?? null,
        finalCost: o.finalCost ?? null,
      })),
    };
  }

  private async toolFindOrdersByVehicle(workshopId: string, query: string): Promise<object> {
    const words = query.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return { orders: [], message: "Query vacía" };

    const conditions = words.flatMap((word) => [
      { vehicle: { brand: { contains: word, mode: "insensitive" as const } } },
      { vehicle: { model: { contains: word, mode: "insensitive" as const } } },
      { vehicle: { plate: { contains: word, mode: "insensitive" as const } } },
    ]);

    const orders = await this.prisma.workOrder.findMany({
      where: { workshopId, status: { notIn: ["DELIVERED", "CANCELLED"] }, OR: conditions },
      include: {
        client: { select: { name: true, phone: true } },
        vehicle: { select: { brand: true, model: true, plate: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return {
      total: orders.length,
      orders: orders.map((o) => ({
        id: o.id,
        client: o.client.name,
        clientPhone: o.client.phone ?? null,
        vehicle: `${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate})`,
        plate: o.vehicle.plate,
        status: o.status,
        statusLabel: STATUS_LABELS[o.status] ?? o.status,
        description: o.description,
        estimatedCost: o.estimatedCost ?? null,
        finalCost: o.finalCost ?? null,
        assignedTo: o.assignedTo?.name ?? null,
        mechanicNotes: o.mechanicNotes ?? null,
      })),
    };
  }

  private async toolFindClient(workshopId: string, query: string): Promise<object> {
    const clients = await this.prisma.client.findMany({
      where: {
        workshopId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
        ],
      },
      include: {
        _count: { select: { vehicles: true, workOrders: true } },
        workOrders: {
          where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
          select: {
            id: true,
            description: true,
            status: true,
            vehicle: { select: { plate: true, brand: true, model: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      take: 5,
    });

    return {
      total: clients.length,
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email ?? null,
        totalVehicles: c._count.vehicles,
        totalOrders: c._count.workOrders,
        activeOrders: c.workOrders.map((o) => ({
          id: o.id,
          vehicle: `${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate})`,
          description: o.description,
          status: o.status,
          statusLabel: STATUS_LABELS[o.status] ?? o.status,
        })),
      })),
    };
  }

  private async toolUpdateOrderStatus(
    workshopId: string,
    orderId: string,
    status: string,
  ): Promise<object> {
    const validStatuses = Object.keys(STATUS_LABELS);
    if (!validStatuses.includes(status)) {
      return { success: false, error: `Estado inválido: ${status}. Válidos: ${validStatuses.join(", ")}` };
    }

    const updated = await this.prisma.workOrder.updateMany({
      where: { id: orderId, workshopId },
      data: {
        status: status as any,
        ...(status === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
        ...(status === "DONE" || status === "DELIVERED" ? { completedAt: new Date() } : {}),
      },
    });

    if (!updated.count) {
      return { success: false, error: "Orden no encontrada o no pertenece a este taller" };
    }

    // Fetch updated order for confirmation details
    const order = await this.prisma.workOrder.findFirst({
      where: { id: orderId, workshopId },
      include: {
        client: { select: { name: true, phone: true } },
        vehicle: { select: { brand: true, model: true, plate: true } },
      },
    });

    return {
      success: true,
      statusLabel: STATUS_LABELS[status],
      orderId,
      client: order?.client.name,
      clientPhone: order?.client.phone ?? null,
      vehicle: order ? `${order.vehicle.brand} ${order.vehicle.model} (${order.vehicle.plate})` : null,
    };
  }

  private async toolAddNote(workshopId: string, orderId: string, note: string): Promise<object> {
    if (!note.trim()) return { success: false, error: "La nota está vacía" };

    const existing = await this.prisma.workOrder.findFirst({
      where: { id: orderId, workshopId },
      select: { mechanicNotes: true },
    });

    if (!existing) return { success: false, error: "Orden no encontrada" };

    const newNote = note.trim().slice(0, 1800);
    const combined = existing.mechanicNotes
      ? `${existing.mechanicNotes}\n---\n${newNote}`
      : newNote;

    await this.prisma.workOrder.updateMany({
      where: { id: orderId, workshopId },
      data: { mechanicNotes: combined.slice(-2000) },
    });

    return { success: true, message: "Nota guardada correctamente" };
  }

  private async toolSendClientNotification(workshopId: string, orderId: string): Promise<object> {
    const order = await this.prisma.workOrder.findFirst({
      where: { id: orderId, workshopId },
      include: {
        client: { select: { name: true, phone: true } },
        vehicle: { select: { brand: true, model: true, plate: true } },
      },
    });

    if (!order) return { success: false, error: "Orden no encontrada" };
    if (!order.client.phone) {
      return { success: false, error: `${order.client.name} no tiene número de teléfono registrado` };
    }

    const vehicleLabel = `${order.vehicle.brand} ${order.vehicle.model} (${order.vehicle.plate})`;
    const msg = [
      `⚙️ *Actualización de tu vehículo*`,
      `*${vehicleLabel}*`,
      ``,
      `✅ Tu vehículo está *listo para retirar*.`,
      `¡Gracias por confiar en nosotros!`,
    ].join("\n");

    void this.notifications.sendWhatsApp(order.client.phone, msg);

    return {
      success: true,
      sentTo: order.client.name,
      phone: order.client.phone,
    };
  }

  private async toolSearchTechnicalGuides(workshopId: string, query: string): Promise<object> {
    const stopWords = new Set([
      "como", "cómo", "que", "qué", "el", "la", "los", "las", "un", "una",
      "de", "del", "en", "con", "por", "para", "se", "es", "son", "hay",
      "hacer", "cambiar", "revisar", "cuanto", "cuánto",
    ]);

    const keywords = query
      .toLowerCase()
      .replace(/[¿?¡!.,;:]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
      .slice(0, 8);

    if (!keywords.length) return { found: 0, guides: [], message: "No se encontraron palabras clave útiles" };

    const guides = await this.prisma.technicalGuide.findMany({
      where: {
        workshopId,
        OR: keywords.flatMap((kw) => [
          { title: { contains: kw, mode: "insensitive" } },
          { vehicle: { contains: kw, mode: "insensitive" } },
          { category: { contains: kw, mode: "insensitive" } },
          { content: { contains: kw, mode: "insensitive" } },
        ]),
      },
      take: 3,
      orderBy: { updatedAt: "desc" },
    });

    return {
      found: guides.length,
      guides: guides.map((g) => ({
        title: g.title,
        vehicle: g.vehicle ?? null,
        category: g.category ?? null,
        content: g.content.length > 3500
          ? `${g.content.slice(0, 3500)}\n[…contenido truncado]`
          : g.content,
      })),
    };
  }

  // ─── Session history ──────────────────────────────────────────────────────

  private async loadHistory(workshopId: string, phone: string): Promise<any[]> {
    const session = await this.prisma.botSession.findUnique({
      where: { workshopId_phone: { workshopId, phone } },
    });
    const ctx = session?.context as any;
    if (Array.isArray(ctx?.history)) return ctx.history;
    return [];
  }

  private async saveHistory(workshopId: string, phone: string, history: any[]) {
    await this.prisma.botSession.upsert({
      where: { workshopId_phone: { workshopId, phone } },
      update: { step: "IDLE", context: { history } },
      create: { workshopId, phone, step: "IDLE", context: { history } },
    });
  }

  private async clearHistory(workshopId: string, phone: string) {
    await this.prisma.botSession.upsert({
      where: { workshopId_phone: { workshopId, phone } },
      update: { step: "IDLE", context: undefined },
      create: { workshopId, phone, step: "IDLE" },
    });
  }

  // ─── Menu shortcut ────────────────────────────────────────────────────────

  private mainMenu(name: string, permissions: string[]): string {
    const lines = [
      `👋 Hola *${name}*! Soy tu asistente de taller.`,
      ``,
      `Podés hablarme en lenguaje natural:`,
      `_"Se terminó el corolla"_`,
      `_"¿Qué órdenes tenemos hoy?"_`,
      `_"Buscá a Juan García"_`,
      `_"¿Cómo cambio los frenos de un Corsa?"_`,
      `_"Notificá al cliente del Focus"_`,
    ];

    if (!permissions.includes(Permission.CHANGE_ORDER_STATUS)) {
      lines.push(``, `ℹ️ Solo tenés permiso de lectura.`);
    }

    lines.push(``, `Escribí *menu* para ver este mensaje de nuevo.`);
    return lines.join("\n");
  }
}
