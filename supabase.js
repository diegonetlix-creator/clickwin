import { createClient } from "@supabase/supabase-js";

/**
 * Initialize Supabase Client
 * Note: These environment variables should be set in .env
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
