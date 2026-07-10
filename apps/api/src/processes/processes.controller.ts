import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ProcessesService } from "./processes.service";
import { CreateProcessSchema, UpdateProcessSchema } from "@mecanico/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Permission } from "../common/permissions";
import type { AuthRequest } from "../common/types/auth.types";

@Controller("processes")
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Post()
  @Permissions(Permission.EDIT_ORDERS)
  create(
    @Req() req: AuthRequest,
    @Body(new ZodValidationPipe(CreateProcessSchema)) dto: unknown,
  ) {
    return this.processesService.create(req.auth.workshopId, dto as any);
  }

  @Get()
  @Permissions(Permission.VIEW_ORDERS)
  findAll(@Req() req: AuthRequest, @Query("search") search?: string) {
    return this.processesService.findAll(req.auth.workshopId, search);
  }

  @Get(":id")
  @Permissions(Permission.VIEW_ORDERS)
  findOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.processesService.findOne(req.auth.workshopId, id);
  }

  @Patch(":id")
  @Permissions(Permission.EDIT_ORDERS)
  update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateProcessSchema)) dto: unknown,
  ) {
    return this.processesService.update(req.auth.workshopId, id, dto as any);
  }

  @Delete(":id")
  @Permissions(Permission.EDIT_ORDERS)
  remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.processesService.remove(req.auth.workshopId, id);
  }
}
