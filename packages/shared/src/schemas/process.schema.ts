import { z } from "zod";

export const StepToolSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["TOOL", "PART", "FLUID"]),
  quantity: z.number().int().min(1).default(1),
});

export const ProcessStepSchema = z.object({
  order: z.number().int().min(0),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  tools: z.array(StepToolSchema).default([]),
});

export const CreateProcessSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  steps: z.array(ProcessStepSchema).default([]),
});

export const UpdateProcessSchema = CreateProcessSchema.partial();

export type StepToolDto = z.infer<typeof StepToolSchema>;
export type ProcessStepDto = z.infer<typeof ProcessStepSchema>;
export type CreateProcessDto = z.infer<typeof CreateProcessSchema>;
export type UpdateProcessDto = z.infer<typeof UpdateProcessSchema>;
