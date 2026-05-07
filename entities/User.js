import { BaseModel } from "./BaseModel";
import { supabase } from "@/supabase";

export class User extends BaseModel {
  static get tableName() {
    return "users";
  }

  /**
   * Override me() to handle Supabase Auth session.
   */
  static async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    
    // Attempt to merge with profile from database
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    let roleProfile = {};
    if (profile?.role === "promoter") {
      const { data } = await supabase.from("promoter_profiles").select("company_name").eq("id", user.id).single();
      roleProfile = data || {};
    } else if (profile?.role === "worker" || profile?.role === "student") {
      const { data } = await supabase.from("worker_profiles").select("*").eq("id", user.id).single();
      roleProfile = data || {};
    }

    return new this({ ...user, ...profile, ...roleProfile });
  }

  /**
   * Logout helper.
   */
  static async logout() {
    return await supabase.auth.signOut();
  }
}

export default User;
