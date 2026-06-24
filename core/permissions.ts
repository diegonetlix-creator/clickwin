import type { Role } from "@/types/database";

export type Permission =
  | "VIEW_FEED"
  | "VIEW_TASKS"
  | "SUBMIT_TASK"
  | "REDEEM_PRIZE"
  | "CREATE_CAMPAIGN"
  | "REVIEW_TASKS"
  | "MANAGE_MISSIONS"
  | "VIEW_STATS"
  | "MANAGE_USERS"
  | "MANAGE_CAMPAIGNS"
  | "MANAGE_FINANCES"
  | "MANAGE_PRIZES"
  | "MANAGE_FRAUD";

export const PERMISSIONS: Record<Permission, Role[]> = {
  // SHARED
  VIEW_FEED: ["worker", "student", "promoter", "admin"],

  // WORKER
  VIEW_TASKS:   ["worker", "student", "admin"],
  SUBMIT_TASK:  ["worker", "student"],
  REDEEM_PRIZE: ["worker", "student", "admin"],

  // PROMOTER
  CREATE_CAMPAIGN:  ["promoter", "admin"],
  REVIEW_TASKS:     ["promoter", "admin"],
  MANAGE_MISSIONS:  ["promoter", "admin"],
  VIEW_STATS:       ["promoter", "admin"],

  // ADMIN
  MANAGE_USERS:     ["admin"],
  MANAGE_CAMPAIGNS: ["admin"],
  MANAGE_FINANCES:  ["admin"],
  MANAGE_PRIZES:    ["admin", "promoter"],
  MANAGE_FRAUD:     ["admin"],
};
