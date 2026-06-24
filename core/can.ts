import { PERMISSIONS, type Permission } from "./permissions";
import type { Role } from "@/types/database";

export const can = (role: Role | null | undefined, permission: Permission | string): boolean => {
  if (!role || !permission) return false;
  return PERMISSIONS[permission as Permission]?.includes(role) ?? false;
};
