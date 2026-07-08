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
import { WorkOrdersService } from "./work-orders.service";
import {
  CreateWorkOrderSchema,
  UpdateWorkOrderSchema,
  CreateWorkOrderItemSchema,
  UpdateWorkOrderItemSchema,
} from "@mecanico/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("work-orders")
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  create(
    @Req() req: any,
    @Body(new ZodValidationPipe(CreateWorkOrderSchema)) dto: unknown,
  ) {
    return this.workOrdersService.create(req.auth.workshopId, dto as any);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query("clientId") clientId?: string,
    @Query("vehicleId") vehicleId?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("scheduledDate") scheduledDate?: string,
  ) {
    return this.workOrdersService.findAll(req.auth.workshopId, {
      clientId,
      vehicleId,
      status,
      search,
      scheduledDate,
    });
  }

  @Get(":id")
  findOne(@Req() req: any, @Param("id") id: string) {
    return this.workOrdersService.findOne(req.auth.workshopId, id);
  }

  @Patch(":id")
  update(
    @Req() req: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateWorkOrderSchema)) dto: unknown,
  ) {
    return this.workOrdersService.update(req.auth.workshopId, id, dto as any);
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.workOrdersService.remove(req.auth.workshopId, id);
  }

  @Post(":id/items")
  addItem(
    @Req() req: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(CreateWorkOrderItemSchema)) dto: unknown,
  ) {
    return this.workOrdersService.addItem(req.auth.workshopId, id, dto as any);
  }

  @Patch(":id/items/:itemId")
  updateItem(
    @Req() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(UpdateWorkOrderItemSchema)) dto: unknown,
  ) {
    return this.workOrdersService.updateItem(req.auth.workshopId, id, itemId, dto as any);
  }

  @Delete(":id/items/:itemId")
  removeItem(
    @Req() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    return this.workOrdersService.removeItem(req.auth.workshopId, id, itemId);
  }

  @Post(":id/notify")
  notifyClient(@Req() req: any, @Param("id") id: string) {
    return this.workOrdersService.notifyClient(req.auth.workshopId, id);
  }
}
