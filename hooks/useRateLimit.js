import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabase";

/**
 * Hook that tracks daily action usage against a limit.
 * 
 * @param {string} userId - Current user's ID
 * @param {string} actionType - e.g. 'review', 'submission', 'claim'
 * @param {number} dailyLimit - Max actions allowed per day
 * @returns {{ used, remaining, isAtLimit, refresh }}
 */
export function useRateLimit(userId, actionType, dailyLimit = 10) {
  const [used, setUsed]       = useState(0);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];

  const refresh = useCallback(async () => {
    if (!userId || !actionType) return;
    setLoading(true);
    try {
      // Use point_transactions for audit, or fallback to social_task_submissions
      let count = 0;

      if (actionType === "review") {
        const { count: c } = await supabase
          .from("point_transactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "review_reward")
          .gte("created_at", `${todayStr}T00:00:00`);
        count = c || 0;
      } else if (actionType === "submission") {
        const { count: c } = await supabase
          .from("social_task_submissions")
          .select("*", { count: "exact", head: true })
          .eq("worker_id", userId)
          .gte("created_at", `${todayStr}T00:00:00`);
        count = c || 0;
      } else if (actionType === "claim") {
        const { count: c } = await supabase
          .from("daily_mission_claims")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("claim_date", todayStr);
        count = c || 0;
      }

      setUsed(count);
    } catch (err) {
      console.error(`[useRateLimit] Error fetching ${actionType}:`, err);
    } finally {
      setLoading(false);
    }
  }, [userId, actionType, todayStr]);

  useEffect(() => { refresh(); }, [refresh]);

  const remaining   = Math.max(dailyLimit - used, 0);
  const isAtLimit   = remaining === 0;

  return { used, remaining, isAtLimit, loading, refresh, dailyLimit };
}
