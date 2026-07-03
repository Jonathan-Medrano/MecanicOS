import { z } from "zod";

export const CreateClientSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional(),
  notes: z.string().max(500).optional(),
});

export const UpdateClientSchema = CreateClientSchema.partial();

export type CreateClientDto = z.infer<typeof CreateClientSchema>;
export type UpdateClientDto = z.infer<typeof UpdateClientSchema>;
