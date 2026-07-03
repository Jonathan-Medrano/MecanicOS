import { SetMetadata } from "@nestjs/common";
import type { Permission } from "../permissions";

export const PERMISSIONS_KEY = "permissions";
export const Permissions = (...perms: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);
