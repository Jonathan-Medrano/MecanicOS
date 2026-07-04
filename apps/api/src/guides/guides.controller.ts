import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { GuidesService } from "./guides.service";
import { CreateGuideSchema, UpdateGuideSchema } from "@mecanico/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("guides")
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Post()
  create(@Req() req: any, @Body(new ZodValidationPipe(CreateGuideSchema)) dto: unknown) {
    return this.guidesService.create(req.auth.workshopId, dto as any);
  }

  @Get()
  findAll(@Req() req: any, @Query("search") search?: string) {
    return this.guidesService.findAll(req.auth.workshopId, search);
  }

  @Get(":id")
  findOne(@Req() req: any, @Param("id") id: string) {
    return this.guidesService.findOne(req.auth.workshopId, id);
  }

  @Patch(":id")
  update(
    @Req() req: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateGuideSchema)) dto: unknown,
  ) {
    return this.guidesService.update(req.auth.workshopId, id, dto as any);
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.guidesService.remove(req.auth.workshopId, id);
  }
}
