export const ROUTES = {
  workerDashboard: {
    path: "/worker-dashboard",
    permission: "VIEW_TASKS"
  },
  promoterDashboard: {
    path: "/promoter-dashboard",
    permission: "CREATE_CAMPAIGN"
  },
  adminDashboard: {
    path: "/admin-dashboard",
    permission: "MANAGE_USERS"
  },
  missionManager: {
    path: "/promoter-mission-manager",
    permission: "MANAGE_MISSIONS"
  }
};

export const getDefaultRouteForRole = (role) => {
  if (role === "admin") return ROUTES.adminDashboard.path;
  if (role === "promoter") return ROUTES.promoterDashboard.path;
  return ROUTES.workerDashboard.path;
};
