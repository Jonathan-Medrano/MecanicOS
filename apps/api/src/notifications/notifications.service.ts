import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly config: ConfigService) {}

  private get evolutionUrl() {
    return this.config.get("EVOLUTION_API_URL") ?? "http://localhost:8080";
  }
  private get evolutionKey() {
    return this.config.get("EVOLUTION_API_KEY") ?? "";
  }
  private get instance() {
    return this.config.get("EVOLUTION_INSTANCE") ?? "mecanico";
  }

  async sendWhatsApp(phone: string, text: string): Promise<void> {
    if (!phone || !this.evolutionKey) return;
    try {
      await axios.post(
        `${this.evolutionUrl}/message/sendText/${this.instance}`,
        { number: phone, text },
        { headers: { apikey: this.evolutionKey } },
      );
    } catch (e: any) {
      this.logger.warn(`Notification to ${phone} failed: ${e.message}`);
    }
  }
}
