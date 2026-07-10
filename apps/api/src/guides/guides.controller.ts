import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { GuidesService } from "./guides.service";
import { CreateGuideSchema, UpdateGuideSchema } from "@mecanico/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Permission } from "../common/permissions";
import type { AuthRequest } from "../common/types/auth.types";

@Controller("guides")
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Post()
  @Permissions(Permission.EDIT_ORDERS)
  create(@Req() req: AuthRequest, @Body(new ZodValidationPipe(CreateGuideSchema)) dto: unknown) {
    return this.guidesService.create(req.auth.workshopId, dto as any);
  }

  @Get()
  @Permissions(Permission.VIEW_ORDERS)
  findAll(@Req() req: AuthRequest, @Query("search") search?: string) {
    return this.guidesService.findAll(req.auth.workshopId, search);
  }

  @Get(":id")
  @Permissions(Permission.VIEW_ORDERS)
  findOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.guidesService.findOne(req.auth.workshopId, id);
  }

  @Patch(":id")
  @Permissions(Permission.EDIT_ORDERS)
  update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateGuideSchema)) dto: unknown,
  ) {
    return this.guidesService.update(req.auth.workshopId, id, dto as any);
  }

  @Delete(":id")
  @Permissions(Permission.EDIT_ORDERS)
  remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.guidesService.remove(req.auth.workshopId, id);
  }
}
