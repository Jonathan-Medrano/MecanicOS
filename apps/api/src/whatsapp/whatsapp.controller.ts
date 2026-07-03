import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { WhatsAppService } from "./whatsapp.service";
import { Public } from "../common/decorators/public.decorator";

@Controller("whatsapp")
export class WhatsAppController {
  constructor(private readonly waService: WhatsAppService) {}

  @Public()
  @Post("webhook/:workshopId")
  webhook(@Param("workshopId") workshopId: string, @Body() body: any) {
    return this.waService.handleWebhook(workshopId, body);
  }

  @Get("conversations")
  getConversations(@Req() req: any) {
    return this.waService.getConversations(req.auth.workshopId);
  }

  @Get("conversations/:phone")
  getMessages(@Req() req: any, @Param("phone") phone: string) {
    return this.waService.getMessages(req.auth.workshopId, phone);
  }

  @Post("conversations/:phone/send")
  send(@Req() req: any, @Param("phone") phone: string, @Body() body: { text: string }) {
    return this.waService.sendMessage(req.auth.workshopId, phone, body.text);
  }

  @Post("conversations/:phone/classify")
  classify(
    @Req() req: any,
    @Param("phone") phone: string,
    @Body() body: { clientId: string },
  ) {
    return this.waService.classifyPhone(req.auth.workshopId, phone, body.clientId);
  }
}
