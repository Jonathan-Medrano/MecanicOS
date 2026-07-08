import { z } from "zod";

export const UpdateWorkshopSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
  botAutoReply: z.boolean().optional(),
  botAutoReplyMsg: z.string().max(1000).optional(),
});

export type UpdateWorkshopSettingsDto = z.infer<typeof UpdateWorkshopSettingsSchema>;
