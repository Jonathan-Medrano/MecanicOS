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
import { PartsService } from "./parts.service";
import {
  AdjustStockSchema,
  CreatePartSchema,
  UpdatePartSchema,
  AdjustStockDto,
  CreatePartDto,
  UpdatePartDto,
} from "./dto/parts.schema";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Permission } from "../common/permissions";
import type { AuthRequest } from "../common/types/auth.types";

@Controller("parts")
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Permissions(Permission.VIEW_ORDERS)
  @Get()
  findAll(
    @Req() req: AuthRequest,
    @Query("search") search?: string,
    @Query("lowStock") lowStock?: string,
  ) {
    return this.partsService.findAll(
      req.auth.workshopId,
      lowStock === "true",
      search,
    );
  }

  @Permissions(Permission.EDIT_ORDERS)
  @Post()
  create(
    @Req() req: AuthRequest,
    @Body(new ZodValidationPipe(CreatePartSchema)) dto: CreatePartDto,
  ) {
    return this.partsService.create(req.auth.workshopId, dto);
  }

  @Permissions(Permission.VIEW_ORDERS)
  @Get(":id")
  findOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.partsService.findOne(req.auth.workshopId, id);
  }

  @Permissions(Permission.EDIT_ORDERS)
  @Patch(":id")
  update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdatePartSchema)) dto: UpdatePartDto,
  ) {
    return this.partsService.update(req.auth.workshopId, id, dto);
  }

  @Permissions(Permission.EDIT_ORDERS)
  @Patch(":id/stock")
  adjustStock(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AdjustStockSchema)) dto: AdjustStockDto,
  ) {
    return this.partsService.adjustStock(req.auth.workshopId, id, dto.delta);
  }

  @Permissions(Permission.EDIT_ORDERS)
  @Delete(":id")
  remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.partsService.remove(req.auth.workshopId, id);
  }
}
