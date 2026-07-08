import { BadRequestException, Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { WhatsAppService } from "./whatsapp.service";
import { Public } from "../common/decorators/public.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Permission } from "../common/permissions";

@Controller("whatsapp")
export class WhatsAppController {
  constructor(private readonly waService: WhatsAppService) {}

  @Public()
  @Post("webhook/:workshopId")
  webhook(@Param("workshopId") workshopId: string, @Body() body: any) {
    return this.waService.handleWebhook(workshopId, body);
  }

  @Permissions(Permission.VIEW_WHATSAPP)
  @Get("conversations")
  getConversations(@Req() req: any) {
    return this.waService.getConversations(req.auth.workshopId);
  }

  @Permissions(Permission.VIEW_WHATSAPP)
  @Get("conversations/:phone")
  getMessages(@Req() req: any, @Param("phone") phone: string) {
    return this.waService.getMessages(req.auth.workshopId, phone);
  }

  @Permissions(Permission.SEND_WHATSAPP)
  @Post("conversations/:phone/send")
  send(@Req() req: any, @Param("phone") phone: string, @Body() body: { text: string }) {
    if (!body?.text?.trim()) throw new BadRequestException("text is required");
    return this.waService.sendMessage(req.auth.workshopId, phone, body.text);
  }

  @Permissions(Permission.SEND_WHATSAPP)
  @Post("conversations/:phone/classify")
  classify(
    @Req() req: any,
    @Param("phone") phone: string,
    @Body() body: { clientId: string },
  ) {
    return this.waService.classifyPhone(req.auth.workshopId, phone, body.clientId);
  }
}
