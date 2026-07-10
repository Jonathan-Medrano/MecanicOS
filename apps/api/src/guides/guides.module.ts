import { Module } from "@nestjs/common";
import { GuidesService } from "./guides.service";
import { GuidesController } from "./guides.controller";
import { EmbeddingModule } from "../common/embedding/embedding.module";

@Module({
  imports: [EmbeddingModule],
  controllers: [GuidesController],
  providers: [GuidesService],
  exports: [GuidesService],
})
export class GuidesModule {}
