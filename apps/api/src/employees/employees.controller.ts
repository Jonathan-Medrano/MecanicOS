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

@Controller("employees")
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Permissions(Permission.MANAGE_EMPLOYEES)
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.employeesService.create(req.auth.workshopId, body);
  }

  @Permissions(Permission.MANAGE_EMPLOYEES)
  @Get()
  findAll(@Req() req: any) {
    return this.employeesService.findAll(req.auth.workshopId);
  }

  @Permissions(Permission.MANAGE_EMPLOYEES)
  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.employeesService.update(req.auth.workshopId, id, body);
  }

  @Permissions(Permission.MANAGE_EMPLOYEES)
  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.employeesService.remove(req.auth.workshopId, id);
  }
}
