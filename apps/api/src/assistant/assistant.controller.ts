import { Body, Controller, Post, Req } from "@nestjs/common";
import { AssistantService } from "./assistant.service";
import { AskAssistantSchema } from "@mecanico/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("assistant")
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post("ask")
  ask(
    @Req() req: any,
    @Body(new ZodValidationPipe(AskAssistantSchema)) dto: unknown,
  ) {
    return this.assistantService.ask(req.auth.workshopId, dto as any);
  }
}
