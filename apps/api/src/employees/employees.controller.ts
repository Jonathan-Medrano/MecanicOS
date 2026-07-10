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
import { EmployeesService } from "./employees.service";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Permission } from "../common/permissions";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CreateEmployeeSchema, CreateEmployeeDto, UpdateEmployeeSchema, UpdateEmployeeDto } from "@mecanico/shared";
import type { AuthRequest } from "../common/types/auth.types";

@Controller("employees")
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Permissions(Permission.MANAGE_EMPLOYEES)
  @Post()
  create(
    @Req() req: AuthRequest,
    @Body(new ZodValidationPipe(CreateEmployeeSchema)) dto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(req.auth.workshopId, dto);
  }

  @Permissions(Permission.MANAGE_EMPLOYEES)
  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.employeesService.findAll(req.auth.workshopId);
  }

  @Permissions(Permission.MANAGE_EMPLOYEES)
  @Patch(":id")
  update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateEmployeeSchema)) dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(req.auth.workshopId, id, dto);
  }

  @Permissions(Permission.MANAGE_EMPLOYEES)
  @Delete(":id")
  remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.employeesService.remove(req.auth.workshopId, id);
  }
}
