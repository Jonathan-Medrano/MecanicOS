import { z } from "zod";

export const CreateVehicleSchema = z.object({
  clientId: z.string().uuid(),
  brand: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 1),
  plate: z.string().min(1).max(15),
  vin: z.string().max(17).optional(),
  color: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
});

export const UpdateVehicleSchema = CreateVehicleSchema.omit({ clientId: true }).partial();

export type CreateVehicleDto = z.infer<typeof CreateVehicleSchema>;
export type UpdateVehicleDto = z.infer<typeof UpdateVehicleSchema>;
