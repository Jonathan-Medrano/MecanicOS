import type { Request } from "express";

export interface AuthPayload {
  clerkUserId: string;
  workshopId: string;
  permissions: string[];
  isOwner: boolean;
}

export interface AuthRequest extends Request {
  auth: AuthPayload;
}
