import { z } from "zod";

export const VALID_PERMISSIONS = [
  "VIEW_CLIENTS",
  "EDIT_CLIENTS",
  "DELETE_CLIENTS",
  "VIEW_VEHICLES",
  "EDIT_VEHICLES",
  "VIEW_ORDERS",
  "EDIT_ORDERS",
  "CHANGE_ORDER_STATUS",
  "VIEW_WHATSAPP",
  "SEND_WHATSAPP",
  "MANAGE_EMPLOYEES",
] as const;

const PermissionSchema = z.enum(VALID_PERMISSIONS);

export const CreateEmployeeSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  permissions: z.array(PermissionSchema).min(1),
});

export const UpdateEmployeeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional(),
  permissions: z.array(PermissionSchema).min(1).optional(),
});

export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeSchema>;
