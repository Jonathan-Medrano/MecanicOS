import { Body, Controller, Post, Req } from "@nestjs/common";
import { AssistantService } from "./assistant.service";
import { AskAssistantSchema } from "@mecanico/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Permission } from "../common/permissions";
import type { AuthRequest } from "../common/types/auth.types";

@Controller("assistant")
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Permissions(Permission.VIEW_ORDERS)
  @Post("ask")
  ask(
    @Req() req: AuthRequest,
    @Body(new ZodValidationPipe(AskAssistantSchema)) dto: unknown,
  ) {
    return this.assistantService.ask(req.auth.workshopId, dto as any);
  }
}
