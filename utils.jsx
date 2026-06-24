import { supabase } from "@/supabase";
/**
 * Utility functions for the application
 */

/**
 * Creates a URL for a given page name, mapping page names to their routes.
 * @param {string} pageName - The name of the page (e.g., 'Landing', 'WorkerDashboard').
 * @returns {string} The formatted URL path.
 */
export function createPageUrl(pageWithQuery) {
  if (!pageWithQuery) return "/";
  
  const parts = pageWithQuery.split("?");
  const pageName = parts[0];
  const query = parts[1];
  
  const pageMap = {
    'Landing': '/',
    'WorkerDashboard': '/worker-dashboard',
    'Tasks': '/tasks',
    'TaskDetail': '/tasks',
    'WorkerBalance': '/worker-balance',
    'WorkerHistory': '/worker-history',
    'Ranking': '/prizes',
    'Prizes': '/prizes',
    'ManagePrizes': '/manage-prizes',
    'PromoterDashboard': '/promoter-dashboard',
    'PromoterMissionManager': '/promoter-mission-manager',
    'MyCampaigns': '/my-campaigns',
    'CreateCampaign': '/create-campaign',
    'CreateAd': '/publish-ad',
    'PublishAd': '/publish-ad',
    'ReviewTasks': '/review-tasks',
    'PromoterStats': '/promoter-stats',
    'AdminDashboard': '/admin-dashboard',
    'AdminUsers': '/admin-users',
    'AdminCampaigns': '/admin-campaigns',
    'AdminFraud': '/admin-fraud',
    'AdminFeed': '/admin-feed',
    'AdminBanners': '/admin-banners',
    'Login': '/login',
    'Register': '/register',
    'DailyMissions': '/daily-missions',
    'Feed': '/feed',
    'Settings': '/settings',
    'SocialTasks': '/social-tasks',
    'CreateSocialTask': '/create-social-task',
    'SocialReview': '/social-review',
    'AdminLogs': '/admin-logs',
  };




  if (pageName === "TaskDetail" && query) {
    const params = new URLSearchParams(query);
    const id = params.get("id");
    const campaignId = params.get("campaignId");
    if (id) return `/tasks/${id}`;
    if (campaignId) return `/tasks/campaign/${campaignId}`;
  }

  const basePath = pageMap[pageName] || "/";
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Format currency in USD
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format points with commas
 */
export function formatPoints(points) {
  return new Intl.NumberFormat('en-US').format(points);
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadFile(file, options = { isPublic: true }) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Tipo de archivo no permitido. Solo se aceptan JPEG, PNG, WebP o GIF.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("El archivo supera el tamaño máximo de 5 MB.");
  }

  const fileExt  = file.name.split(".").pop().toLowerCase();
  // crypto.randomUUID() es seguro y disponible en todos los navegadores modernos
  const fileId   = crypto.randomUUID();
  const fileName = `${fileId}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { error } = await supabase.storage
    .from("public")
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from("public")
    .getPublicUrl(filePath);

  return { url: publicUrl, path: filePath };
}

/**
 * Get a signed URL for a private file
 */
export async function getSignedUrl(filePath) {
  
  if (!filePath) return null;
  // If it's already a full HTTP URL, return it
  if (filePath.startsWith('http')) return filePath;

  const { data, error } = await supabase.storage
    .from('public') // Adjust bucket if needed
    .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours
    
  if (error) {
    console.error("Error getting signed URL:", error);
    return null;
  }
  return data.signedUrl;
}

export const getInitialRouteByRole = (role) => {
  switch (role) {
    case 'admin':
      return '/admin-dashboard';
    case 'promoter':
      return '/promoter-dashboard';
    case 'worker':
      return '/worker-dashboard';
    default:
      return '/';
  }
};

/**
 * Log an administrative action to the database.
 * Designed to be non-blocking and highly resilient.
 * Compatible with DB signature: (p_action text, p_table text/name, p_target_id text/uuid, p_details jsonb)
 */
export async function auditLog(action, table, targetId, details = {}) {
  try {
    
    
    // Non-blocking call: we don't 'await' the RPC to avoid UI delays
    supabase.rpc("log_admin_action", {
      p_action: action,
      p_table: table,
      p_target_id: targetId ? String(targetId) : null,
      p_details: details || {}
    }).then(({ error }) => {
      if (error) console.warn("[AuditLog] Ignored RPC Error:", error.message);
    }).catch(err => {
      console.warn("[AuditLog] Background error:", err);
    });
  } catch (err) {
    console.error("[AuditLog] Setup error:", err);
  }
}

export const ACTION = {
  // Task Moderation
  APPROVE_SUBMISSION: "approve_submission",
  REJECT_SUBMISSION: "reject_submission",
  BULK_APPROVE:      "bulk_approve_submissions",
  
  // Feed & Social
  DELETE_POST:        "delete_post",
  UPDATE_POST_STATUS: "update_post_status",
  CREATE_POST:        "create_post",
  EDIT_POST:          "edit_post",
  APPROVE_SOCIAL:     "approve_social_task",
  REJECT_SOCIAL:      "reject_social_task",

  // User Management
  UPDATE_WALLET:    "update_wallet",
  BAN_USER:         "ban_user",
  ACTIVATE_USER:    "activate_user",
  UPDATE_USER_ROLE: "update_user_role",
  ADMIN_LOGIN:      "admin_login",

  // Infrastructure
  CREATE_BANNER:   "create_banner",
  DELETE_BANNER:   "delete_banner",
  TOGGLE_BANNER:   "toggle_banner",
  CREATE_CAMPAIGN: "create_campaign",
  UPDATE_CAMPAIGN: "update_campaign",

  // Prizes
  UPDATE_PRIZE:       "update_prize",
  APPROVE_REDEMPTION: "approve_redemption",
};


/**
 * Get user level based on stars
 * Nivel 1 → 0 ⭐
 * Nivel 2 → 50 ⭐
 * Nivel 3 → 150 ⭐
 * Nivel 4 → 300 ⭐
 * Nivel 5 → 600 ⭐
 */
export function getLevel(stars = 0) {
  if (stars >= 600) return 5;
  if (stars >= 300) return 4;
  if (stars >= 150) return 3;
  if (stars >= 50) return 2;
  return 1;
}

/**
 * Get next level star requirement
 */
export function getNextLevelStars(stars = 0) {
  if (stars >= 600) return 600;
  if (stars >= 300) return 600;
  if (stars >= 150) return 300;
  if (stars >= 50) return 150;
  return 50;
}

/**
 * Get bonus percentage based on level
 * Nivel 2 → +5% pts extra
 * Nivel 3 → +10%
 * Nivel 4 → +15%
 * Nivel 5 → +20%
 */
export function getBonus(level = 1) {
  if (level <= 1) return 0;
  return (level - 1) * 0.05;
}
