import { Module } from "@nestjs/common";
import { AssistantService } from "./assistant.service";
import { AssistantController } from "./assistant.controller";
import { GuidesModule } from "../guides/guides.module";

@Module({
  imports: [GuidesModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
