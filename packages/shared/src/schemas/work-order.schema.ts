import { z } from "zod";

export const WorkOrderStatus = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "DONE",
  "DELIVERED",
  "CANCELLED",
]);

export const CreateWorkOrderSchema = z.object({
  vehicleId: z.string().uuid(),
  clientId: z.string().uuid(),
  description: z.string().min(1).max(1000),
  estimatedCost: z.number().positive().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const UpdateWorkOrderSchema = CreateWorkOrderSchema.partial().extend({
  status: WorkOrderStatus.optional(),
  finalCost: z.number().positive().optional(),
  mechanicNotes: z.string().max(2000).optional(),
});

export const UpdateWorkOrderStatusSchema = z.object({
  status: WorkOrderStatus.optional(),
  mechanicNotes: z.string().max(2000).optional(),
}).refine(
  (d) => d.status !== undefined || d.mechanicNotes !== undefined,
  { message: "At least one field required" },
);

export type WorkOrderStatusType = z.infer<typeof WorkOrderStatus>;
export type CreateWorkOrderDto = z.infer<typeof CreateWorkOrderSchema>;
export type UpdateWorkOrderDto = z.infer<typeof UpdateWorkOrderSchema>;

export const WorkOrderItemType = z.enum(["PART", "LABOR"]);

export const CreateWorkOrderItemSchema = z.object({
  type: WorkOrderItemType,
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

export const UpdateWorkOrderItemSchema = CreateWorkOrderItemSchema.partial();

export type WorkOrderItemTypeValue = z.infer<typeof WorkOrderItemType>;
export type CreateWorkOrderItemDto = z.infer<typeof CreateWorkOrderItemSchema>;
export type UpdateWorkOrderItemDto = z.infer<typeof UpdateWorkOrderItemSchema>;
