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
import { VehiclesService } from "./vehicles.service";
import { CreateVehicleSchema, UpdateVehicleSchema } from "@mecanico/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Permission } from "../common/permissions";

@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Permissions(Permission.EDIT_VEHICLES)
  @Post()
  create(
    @Req() req: any,
    @Body(new ZodValidationPipe(CreateVehicleSchema)) dto: unknown,
  ) {
    return this.vehiclesService.create(req.auth.workshopId, dto as any);
  }

  @Permissions(Permission.VIEW_VEHICLES)
  @Get()
  findAll(@Req() req: any, @Query("clientId") clientId?: string, @Query("search") search?: string) {
    return this.vehiclesService.findAll(req.auth.workshopId, clientId, search);
  }

  @Permissions(Permission.VIEW_VEHICLES)
  @Get(":id")
  findOne(@Req() req: any, @Param("id") id: string) {
    return this.vehiclesService.findOne(req.auth.workshopId, id);
  }

  @Permissions(Permission.EDIT_VEHICLES)
  @Patch(":id")
  update(
    @Req() req: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateVehicleSchema)) dto: unknown,
  ) {
    return this.vehiclesService.update(req.auth.workshopId, id, dto as any);
  }

  @Permissions(Permission.EDIT_VEHICLES)
  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.vehiclesService.remove(req.auth.workshopId, id);
  }
}
