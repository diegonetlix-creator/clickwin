export const PERMISSIONS = {
  // SHARED
  VIEW_FEED: ["worker", "student", "promoter", "admin"],

  // WORKER
  VIEW_TASKS: ["worker", "student", "admin"], 
  SUBMIT_TASK: ["worker", "student"],
  REDEEM_PRIZE: ["worker", "student", "admin"],

  // PROMOTER
  CREATE_CAMPAIGN: ["promoter", "admin"],
  REVIEW_TASKS: ["promoter", "admin"],
  MANAGE_MISSIONS: ["promoter", "admin"],
  VIEW_STATS: ["promoter", "admin"],

  // ADMIN
  MANAGE_USERS: ["admin"],
  MANAGE_CAMPAIGNS: ["admin"],
  MANAGE_FINANCES: ["admin"],
  MANAGE_PRIZES: ["admin", "promoter"], // Wait, Promoter had "ManagePrizes" nav link!
  MANAGE_FRAUD: ["admin"],
};

