import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ClientsService } from "./clients.service";
import { CreateClientSchema, UpdateClientSchema } from "@mecanico/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Permission } from "../common/permissions";
import type { AuthRequest } from "../common/types/auth.types";

@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Permissions(Permission.EDIT_CLIENTS)
  @Post()
  create(
    @Req() req: AuthRequest,
    @Body(new ZodValidationPipe(CreateClientSchema)) dto: unknown,
  ) {
    return this.clientsService.create(req.auth.workshopId, dto as any);
  }

  @Permissions(Permission.VIEW_CLIENTS)
  @Get()
  findAll(@Req() req: AuthRequest, @Query("search") search?: string) {
    return this.clientsService.findAll(req.auth.workshopId, search);
  }

  @Permissions(Permission.VIEW_CLIENTS)
  @Get(":id")
  findOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.clientsService.findOne(req.auth.workshopId, id);
  }

  @Permissions(Permission.EDIT_CLIENTS)
  @Patch(":id")
  update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateClientSchema)) dto: unknown,
  ) {
    return this.clientsService.update(req.auth.workshopId, id, dto as any);
  }

  @Permissions(Permission.DELETE_CLIENTS)
  @Delete(":id")
  remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.clientsService.remove(req.auth.workshopId, id);
  }
}
