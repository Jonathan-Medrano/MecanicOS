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

@Controller("parts")
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Permissions(Permission.VIEW_ORDERS)
  @Get()
  findAll(
    @Req() req: any,
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
    @Req() req: any,
    @Body(new ZodValidationPipe(CreatePartSchema)) dto: CreatePartDto,
  ) {
    return this.partsService.create(req.auth.workshopId, dto);
  }

  @Permissions(Permission.VIEW_ORDERS)
  @Get(":id")
  findOne(@Req() req: any, @Param("id") id: string) {
    return this.partsService.findOne(req.auth.workshopId, id);
  }

  @Permissions(Permission.EDIT_ORDERS)
  @Patch(":id")
  update(
    @Req() req: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdatePartSchema)) dto: UpdatePartDto,
  ) {
    return this.partsService.update(req.auth.workshopId, id, dto);
  }

  @Permissions(Permission.EDIT_ORDERS)
  @Patch(":id/stock")
  adjustStock(
    @Req() req: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AdjustStockSchema)) dto: AdjustStockDto,
  ) {
    return this.partsService.adjustStock(req.auth.workshopId, id, dto.delta);
  }

  @Permissions(Permission.EDIT_ORDERS)
  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.partsService.remove(req.auth.workshopId, id);
  }
}
