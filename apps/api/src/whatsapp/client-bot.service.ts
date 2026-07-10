import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaService } from "../prisma/prisma.service";

const STATUS_LABELS: Record<string, string> = {
  PENDING:       "Pendiente — estamos por comenzar",
  IN_PROGRESS:   "En progreso — lo estamos trabajando ahora",
  WAITING_PARTS: "Esperando repuestos",
  DONE:          "Listo para retirar ✅",
  DELIVERED:     "Entregado",
  CANCELLED:     "Cancelado",
};

@Injectable()
export class ClientBotService {
  private readonly logger = new Logger(ClientBotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async generateReply(
    workshopId: string,
    workshopName: string,
    workshopPhone: string | null,
    clientId: string | null,
    phone: string,
    currentMessage: string,
  ): Promise<string | null> {
    const apiKey = this.config.get<string>("GEMINI_API_KEY");
    if (!apiKey) return null;

    try {
      const [clientData, history] = await Promise.all([
        clientId ? this.loadClientData(workshopId, clientId) : Promise.resolve(null),
        this.loadConversationHistory(workshopId, phone),
      ]);

      const contextBlock = this.buildContextBlock(workshopName, workshopPhone, clientData, phone);

      // Last N messages excluding the current one (it's already in the DB)
      const priorMessages = history.slice(0, -1);
      const historyBlock =
        priorMessages.length > 0
          ? `\nCONVERSACIÓN PREVIA:\n${priorMessages
              .map((m) => `${m.direction === "INBOUND" ? "Cliente" : workshopName}: ${m.body}`)
              .join("\n")}\n`
          : "";

      const systemPrompt = `Sos el asistente virtual de *${workshopName}*, un taller mecánico en Argentina.
Tu función es responder preguntas de clientes sobre el estado de sus vehículos de forma amable y profesional.

REGLAS:
- Respondé siempre en español rioplatense (voseo: "tenés", "podés", "sabés")
- Sé cálido y breve — máximo 3-4 oraciones por respuesta
- Si el vehículo figura como LISTO, celebrá con el cliente y decíselo de forma clara y positiva
- Si hay turno programado, mencioná la fecha y hora exacta
- Si el trabajo sigue en progreso, transmití confianza y decí que el equipo está en ello
- Si no tenés datos suficientes para responder con precisión, decí: "Voy a consultar con el equipo y te contactamos a la brevedad"
- Nunca inventes precios, fechas ni plazos que no estén en los datos
- No prometás tiempos que no estén confirmados
- Usá emojis de WhatsApp con moderación (✅ 🚗 ⏰ 🔧 😊)`;

      const userPrompt = `${contextBlock}${historyBlock}
MENSAJE ACTUAL DEL CLIENTE: "${currentMessage}"

Respondé al mensaje del cliente usando la información disponible de sus órdenes.`;

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(userPrompt);
      const text = result.response.text().trim();
      return text || null;
    } catch (e: any) {
      this.logger.warn(`Client bot reply failed: ${e.message}`);
      return null;
    }
  }

  private async loadClientData(workshopId: string, clientId: string) {
    return this.prisma.client.findFirst({
      where: { id: clientId, workshopId },
      include: {
        workOrders: {
          where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
          include: {
            vehicle: {
              select: { brand: true, model: true, year: true, plate: true, color: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  }

  private async loadConversationHistory(workshopId: string, phone: string) {
    const msgs = await this.prisma.message.findMany({
      where: { workshopId, phone },
      orderBy: { createdAt: "asc" },
      take: 12,
    });
    return msgs;
  }

  private buildContextBlock(
    workshopName: string,
    workshopPhone: string | null,
    client: any | null,
    phone: string,
  ): string {
    const contactLine = workshopPhone
      ? `Taller: ${workshopName} — Tel: ${workshopPhone}`
      : `Taller: ${workshopName}`;

    if (!client) {
      return `${contactLine}

CLIENTE: El número ${phone} no está registrado en el sistema del taller.\n`;
    }

    const orderLines =
      client.workOrders.length === 0
        ? "No hay órdenes activas en este momento."
        : client.workOrders
            .map((o: any) => {
              const v = o.vehicle;
              const vehicleStr = `${v.brand} ${v.model} ${v.year}${v.color ? ` ${v.color}` : ""} — Patente: ${v.plate}`;
              const parts = [
                `▸ ${vehicleStr}`,
                `  Estado: ${STATUS_LABELS[o.status] ?? o.status}`,
                `  Trabajo: ${o.description}`,
              ];

              if (o.scheduledAt) {
                const dt = new Date(o.scheduledAt).toLocaleString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Argentina/Buenos_Aires",
                });
                parts.push(`  Turno agendado: ${dt}`);
              }

              if (o.finalCost != null) {
                parts.push(`  Costo final: $${Number(o.finalCost).toLocaleString("es-AR")}`);
              } else if (o.estimatedCost != null) {
                parts.push(`  Presupuesto estimado: $${Number(o.estimatedCost).toLocaleString("es-AR")}`);
              }

              return parts.join("\n");
            })
            .join("\n\n");

    return `${contactLine}

CLIENTE: ${client.name} (tel: ${client.phone ?? phone})
ÓRDENES ACTIVAS:
${orderLines}\n`;
  }
}
