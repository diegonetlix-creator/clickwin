// Tipos de la base de datos Supabase
// Fuente de verdad para todas las entidades de la app

export type Role = "worker" | "student" | "promoter" | "admin";
export type Status = "active" | "suspended" | "pending";
export type CampaignStatus = "active" | "paused" | "completed" | "draft" | "cancelled";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  role: Role;
  status: Status;
  stars: number;
  referred_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  /** Puntos de worker (enteros). Columna oficial para saldo worker. */
  points: number;
  /** Balance monetario de promoter (decimal). Columna oficial para saldo promoter. */
  balance: number;
  /** @deprecated usar points */
  pts?: number;
  /** @deprecated usar balance */
  money?: number;
  created_at: string;
  updated_at: string | null;
}

export interface WorkerProfile {
  id: string;
  display_name: string | null;
  total_points: number;
  weekly_points: number;
  current_streak: number;
  level: number;
  instagram: string | null;
  tiktok: string | null;
  twitter: string | null;
  facebook: string | null;
  youtube: string | null;
  threads: string | null;
  discord: string | null;
  telegram: string | null;
  withdrawal_address: string | null;
}

export interface PromoterProfile {
  id: string;
  company_name: string | null;
  website_url: string | null;
}

export interface Campaign {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  category: string | null;
  social_network: string | null;
  task_type: string | null;
  reward_points: number;
  max_participants: number;
  current_participants: number;
  status: CampaignStatus;
  promoter_email: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Submission {
  id: string;
  worker_id: string;
  campaign_id: string;
  task_id: string | null;
  status: SubmissionStatus;
  evidence_url: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface SocialTask {
  id: string;
  promoter_id: string;
  title: string;
  description: string | null;
  platform: string;
  reward_points: number;
  status: string;
  created_at: string;
}

export interface SocialTaskSubmission {
  id: string;
  task_id: string;
  worker_id: string;
  evidence_text: string | null;
  evidence_image: string | null;
  status: SubmissionStatus;
  rejection_reason: string | null;
  created_at: string;
}

export interface Prize {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  image_url: string | null;
  stock: number; // -1 = ilimitado
  is_active: boolean;
  is_global: boolean;
  created_by: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface DailyMission {
  id: string;
  title: string;
  type: string;
  reward_pts: number;
  required_actions: number;
  max_completions: number;
  current_completions: number;
  status: "active" | "paused";
  created_by: string | null;
  created_at: string;
}

// RPC return types
export interface WithdrawalResult {
  ok: boolean;
  new_balance: number;
}

export interface BudgetDeductResult {
  ok: boolean;
  new_balance: number;
}

export interface SwitchRoleResult {
  ok: boolean;
  role: Role;
}
