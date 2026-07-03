import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { ClientsService } from "./clients.service";
import { CreateClientSchema, UpdateClientSchema } from "@mecanico/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(
    @Req() req: any,
    @Body(new ZodValidationPipe(CreateClientSchema)) dto: unknown,
  ) {
    return this.clientsService.create(req.auth.workshopId, dto as any);
  }

  @Get()
  findAll(@Req() req: any, @Query("search") search?: string) {
    return this.clientsService.findAll(req.auth.workshopId, search);
  }

  @Get(":id")
  findOne(@Req() req: any, @Param("id") id: string) {
    return this.clientsService.findOne(req.auth.workshopId, id);
  }

  @Patch(":id")
  update(
    @Req() req: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateClientSchema)) dto: unknown,
  ) {
    return this.clientsService.update(req.auth.workshopId, id, dto as any);
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.clientsService.remove(req.auth.workshopId, id);
  }
}
