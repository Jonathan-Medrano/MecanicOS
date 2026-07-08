import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaService } from "../prisma/prisma.service";
import { BotService } from "./bot.service";
import axios from "axios";

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly botService: BotService,
  ) {}

  private get evolutionUrl() {
    return this.config.get("EVOLUTION_API_URL") ?? "http://localhost:8080";
  }
  private get evolutionKey() {
    return this.config.get("EVOLUTION_API_KEY") ?? "";
  }
  private get instance() {
    return this.config.get("EVOLUTION_INSTANCE") ?? "mecanico";
  }

  async handleWebhook(workshopId: string, payload: any) {
    const event = payload?.event;
    if (event !== "messages.upsert") return { ok: true };

    const data = payload?.data;
    if (!data || data?.key?.fromMe) return { ok: true };

    const remoteJid: string = data.key?.remoteJid ?? "";
    const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
    const waMsgId: string = data.key?.id;

    // Transcribe audio if applicable, else extract text
    const isAudio = data?.messageType === "audioMessage" || !!data?.message?.audioMessage;
    let body: string;
    if (isAudio) {
      const transcription = await this.transcribeAudio(data);
      body = transcription ?? "[audio no transcripto]";
    } else {
      body = data.message?.conversation ?? data.message?.extendedTextMessage?.text ?? "[media]";
    }

    // Check if sender is an employee
    const employee = await this.prisma.workshopEmployee.findFirst({
      where: { workshopId, phone: { endsWith: phone.slice(-8) } },
    });

    if (employee) {
      const reply = await this.botService.handle(
        workshopId,
        phone,
        employee.name,
        employee.permissions,
        body,
      );
      await this.sendRaw(phone, reply);
      return { ok: true, routed: "bot" };
    }

    // Client or unknown — save to inbox
    const client = await this.prisma.client.findFirst({
      where: { workshopId, phone: { endsWith: phone.slice(-8) } },
    });

    await this.prisma.message.upsert({
      where: { waMsgId },
      update: {},
      create: {
        workshopId,
        phone,
        clientId: client?.id ?? null,
        direction: "INBOUND",
        body,
        waMsgId,
      },
    });

    // Auto-reply to client if enabled (once per hour per phone)
    await this.maybeAutoReply(workshopId, phone);

    return { ok: true, routed: "inbox" };
  }

  private async maybeAutoReply(workshopId: string, phone: string): Promise<void> {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      select: { botAutoReply: true, botAutoReplyMsg: true },
    });
    if (!workshop?.botAutoReply) return;

    // Rate-limit: skip if we sent an auto-reply in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAutoReply = await this.prisma.message.findFirst({
      where: {
        workshopId,
        phone,
        direction: "OUTBOUND",
        createdAt: { gte: oneHourAgo },
      },
    });
    if (recentAutoReply) return;

    const msg = workshop.botAutoReplyMsg ?? "¡Hola! 👋 Gracias por escribirnos. En breve te atendemos.";
    await this.sendRaw(phone, msg);
    await this.prisma.message.create({
      data: { workshopId, phone, direction: "OUTBOUND", body: msg },
    });
  }

  private async transcribeAudio(msgData: any): Promise<string | null> {
    const apiKey = this.config.get<string>("GEMINI_API_KEY");
    if (!apiKey) return null;
    try {
      const res = await axios.post(
        `${this.evolutionUrl}/message/getBase64FromMediaMessage/${this.instance}`,
        { message: msgData },
        { headers: { apikey: this.evolutionKey }, timeout: 10000 },
      );
      const base64: string | undefined = res.data?.base64;
      if (!base64) return null;

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([
        { inlineData: { data: base64, mimeType: "audio/ogg" } },
        "Transcribí este audio en español rioplatense. Devolvé únicamente el texto transcripto, sin explicaciones ni formato.",
      ]);
      return result.response.text().trim() || null;
    } catch (e: any) {
      this.logger.warn(`Audio transcription failed: ${e.message}`);
      return null;
    }
  }

  async getConversations(workshopId: string) {
    // DISTINCT ON returns one row per phone (the most recent message).
    // A lateral join counts unread INBOUND messages per phone.
    // This avoids loading all messages into Node.js memory.
    const rows = await this.prisma.$queryRaw<
      {
        phone: string;
        lastMessage: string;
        lastAt: Date;
        clientId: string | null;
        clientName: string | null;
        unread: bigint;
      }[]
    >`
      SELECT DISTINCT ON (m.phone)
        m.phone,
        m.body          AS "lastMessage",
        m."createdAt"   AS "lastAt",
        c.id            AS "clientId",
        c.name          AS "clientName",
        COALESCE(u.cnt, 0) AS unread
      FROM messages m
      LEFT JOIN clients c ON c.id = m."clientId"
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt
        FROM messages u
        WHERE u."workshopId" = m."workshopId"
          AND u.phone       = m.phone
          AND u.direction   = 'INBOUND'
          AND u."readAt"    IS NULL
      ) u ON true
      WHERE m."workshopId" = ${workshopId}
      ORDER BY m.phone, m."createdAt" DESC
    `;

    return rows
      .map((r) => ({
        phone: r.phone,
        client: r.clientId ? { id: r.clientId, name: r.clientName! } : null,
        lastMessage: r.lastMessage,
        lastAt: r.lastAt,
        unread: Number(r.unread),
      }))
      .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
  }

  async getMessages(workshopId: string, phone: string) {
    await this.prisma.message.updateMany({
      where: { workshopId, phone, direction: "INBOUND", readAt: null },
      data: { readAt: new Date() },
    });
    return this.prisma.message.findMany({
      where: { workshopId, phone },
      orderBy: { createdAt: "asc" },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async sendMessage(workshopId: string, phone: string, body: string) {
    await this.sendRaw(phone, body);
    return this.prisma.message.create({
      data: { workshopId, phone, direction: "OUTBOUND", body },
    });
  }

  async classifyPhone(workshopId: string, phone: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, workshopId },
    });
    if (!client) throw new NotFoundException("Client not found");

    return this.prisma.message.updateMany({
      where: { workshopId, phone },
      data: { clientId },
    });
  }

  private async sendRaw(phone: string, text: string) {
    try {
      await axios.post(
        `${this.evolutionUrl}/message/sendText/${this.instance}`,
        { number: phone, text },
        { headers: { apikey: this.evolutionKey } },
      );
    } catch (e: any) {
      this.logger.warn(`Failed to send WhatsApp to ${phone}: ${e.message}`);
    }
  }
}
