import { z } from "zod";

export const CreateGuideSchema = z.object({
  title: z.string().min(1).max(200),
  vehicle: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  content: z.string().min(10),
});

export const UpdateGuideSchema = CreateGuideSchema.partial();

export const AskAssistantSchema = z.object({
  question: z.string().min(3).max(1000),
  vehicle: z.string().max(200).optional(),
});

export type CreateGuideDto = z.infer<typeof CreateGuideSchema>;
export type UpdateGuideDto = z.infer<typeof UpdateGuideSchema>;
export type AskAssistantDto = z.infer<typeof AskAssistantSchema>;
