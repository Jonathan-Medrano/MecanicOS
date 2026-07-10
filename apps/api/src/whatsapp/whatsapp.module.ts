import { Module } from "@nestjs/common";
import { WhatsAppController } from "./whatsapp.controller";
import { WhatsAppService } from "./whatsapp.service";
import { BotService } from "./bot.service";
import { ClientBotService } from "./client-bot.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, BotService, ClientBotService],
})
export class WhatsAppModule {}
