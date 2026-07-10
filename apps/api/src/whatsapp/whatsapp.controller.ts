import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WhatsAppService } from "./whatsapp.service";
import { Public } from "../common/decorators/public.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Permission } from "../common/permissions";
import type { AuthRequest } from "../common/types/auth.types";

@Controller("whatsapp")
export class WhatsAppController {
  constructor(
    private readonly waService: WhatsAppService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("webhook/:workshopId")
  webhook(
    @Param("workshopId") workshopId: string,
    @Body() body: unknown,
    @Headers("apikey") apikey?: string,
  ) {
    const secret = this.config.get<string>("EVOLUTION_WEBHOOK_SECRET");
    if (secret && apikey !== secret) {
      throw new UnauthorizedException("Invalid webhook token");
    }
    return this.waService.handleWebhook(workshopId, body);
  }

  @Permissions(Permission.VIEW_WHATSAPP)
  @Get("conversations")
  getConversations(@Req() req: AuthRequest) {
    return this.waService.getConversations(req.auth.workshopId);
  }

  @Permissions(Permission.VIEW_WHATSAPP)
  @Get("conversations/:phone")
  getMessages(@Req() req: AuthRequest, @Param("phone") phone: string) {
    return this.waService.getMessages(req.auth.workshopId, phone);
  }

  @Permissions(Permission.SEND_WHATSAPP)
  @Post("conversations/:phone/send")
  send(
    @Req() req: AuthRequest,
    @Param("phone") phone: string,
    @Body() body: { text: string },
  ) {
    if (!body?.text?.trim()) throw new BadRequestException("text is required");
    return this.waService.sendMessage(req.auth.workshopId, phone, body.text);
  }

  @Permissions(Permission.SEND_WHATSAPP)
  @Post("conversations/:phone/classify")
  classify(
    @Req() req: AuthRequest,
    @Param("phone") phone: string,
    @Body() body: { clientId: string },
  ) {
    if (!body?.clientId) throw new BadRequestException("clientId is required");
    return this.waService.classifyPhone(req.auth.workshopId, phone, body.clientId);
  }
}
