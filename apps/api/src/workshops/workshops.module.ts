import { Global, Module } from "@nestjs/common";
import { WorkshopsController } from "./workshops.controller";
import { WorkshopsService } from "./workshops.service";

@Global()
@Module({
  controllers: [WorkshopsController],
  providers: [WorkshopsService],
  exports: [WorkshopsService],
})
export class WorkshopsModule {}
