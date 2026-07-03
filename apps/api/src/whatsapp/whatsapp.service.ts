import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
    const body: string =
      data.message?.conversation ??
      data.message?.extendedTextMessage?.text ??
      "[media]";
    const waMsgId: string = data.key?.id;

    // Check if sender is an employee of this workshop
    const employee = await this.prisma.workshopEmployee.findFirst({
      where: { workshopId, phone: { endsWith: phone.slice(-8) } },
    });

    if (employee) {
      // Route to employee bot
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

    // Otherwise: client or unknown
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

    return { ok: true, routed: "inbox" };
  }

  async getConversations(workshopId: string) {
    const messages = await this.prisma.message.findMany({
      where: { workshopId },
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true } } },
    });

    const byPhone = new Map<
      string,
      {
        phone: string;
        client: { id: string; name: string } | null;
        lastMessage: string;
        lastAt: Date;
        unread: number;
      }
    >();

    for (const m of messages) {
      if (!byPhone.has(m.phone)) {
        byPhone.set(m.phone, {
          phone: m.phone,
          client: m.client,
          lastMessage: m.body,
          lastAt: m.createdAt,
          unread: 0,
        });
      }
      const conv = byPhone.get(m.phone)!;
      if (m.direction === "INBOUND" && !m.readAt) conv.unread++;
    }

    return Array.from(byPhone.values()).sort(
      (a, b) => b.lastAt.getTime() - a.lastAt.getTime(),
    );
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
