import { z } from "zod";

export const WorkOrderStatus = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "DONE",
  "DELIVERED",
  "CANCELLED",
]);

export const PaymentStatus = z.enum(["UNPAID", "PARTIAL", "PAID"]);

export const PaymentMethod = z.enum(["CASH", "TRANSFER", "CARD", "MIXED"]);

export const CreateWorkOrderSchema = z.object({
  vehicleId: z.string().uuid(),
  clientId: z.string().uuid(),
  description: z.string().min(1).max(1000),
  estimatedCost: z.number().positive().optional(),
  scheduledAt: z.string().datetime().optional(),
  assignedToId: z.string().uuid().optional(),
});

export const UpdateWorkOrderSchema = CreateWorkOrderSchema.partial().extend({
  status: WorkOrderStatus.optional(),
  paymentStatus: PaymentStatus.optional(),
  paymentMethod: PaymentMethod.nullable().optional(),
  budgetApproved: z.boolean().optional(),
  finalCost: z.number().positive().optional(),
  mechanicNotes: z.string().max(2000).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
});

export const UpdateWorkOrderStatusSchema = z.object({
  status: WorkOrderStatus.optional(),
  paymentStatus: PaymentStatus.optional(),
  paymentMethod: PaymentMethod.nullable().optional(),
  mechanicNotes: z.string().max(2000).optional(),
}).refine(
  (d) => d.status !== undefined || d.mechanicNotes !== undefined || d.paymentStatus !== undefined || d.paymentMethod !== undefined,
  { message: "At least one field required" },
);

export const CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  method: PaymentMethod,
  note: z.string().max(500).optional(),
});

export type WorkOrderStatusType = z.infer<typeof WorkOrderStatus>;
export type PaymentStatusType = z.infer<typeof PaymentStatus>;
export type PaymentMethodType = z.infer<typeof PaymentMethod>;
export type CreateWorkOrderDto = z.infer<typeof CreateWorkOrderSchema>;
export type UpdateWorkOrderDto = z.infer<typeof UpdateWorkOrderSchema>;
export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;

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
