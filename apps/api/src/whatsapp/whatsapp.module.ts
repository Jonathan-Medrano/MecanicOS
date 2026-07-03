import { Module } from "@nestjs/common";
import { WhatsAppController } from "./whatsapp.controller";
import { WhatsAppService } from "./whatsapp.service";
import { BotService } from "./bot.service";

@Module({
  controllers: [WhatsAppController],
  providers: [WhatsAppService, BotService],
})
export class WhatsAppModule {}
