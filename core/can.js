import { PERMISSIONS } from "./permissions";

export const can = (role, permission) => {
  if (!role || !permission) return false;
  return PERMISSIONS[permission]?.includes(role) || false;
};
