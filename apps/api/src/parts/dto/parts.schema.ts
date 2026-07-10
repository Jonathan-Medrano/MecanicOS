import { z } from "zod";

export const CreatePartSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sku: z.string().max(50).optional(),
  stock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  costPrice: z.number().min(0).optional(),
  sellPrice: z.number().min(0).optional(),
  unit: z.string().max(20).default("unidad"),
});

export const UpdatePartSchema = CreatePartSchema.partial();

export const AdjustStockSchema = z.object({
  delta: z.number(),
  note: z.string().max(200).optional(),
});

export type CreatePartDto = z.infer<typeof CreatePartSchema>;
export type UpdatePartDto = z.infer<typeof UpdatePartSchema>;
export type AdjustStockDto = z.infer<typeof AdjustStockSchema>;
