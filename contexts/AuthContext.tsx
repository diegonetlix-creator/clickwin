import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/supabase";
import type { Role, Profile } from "@/types/database";

interface SupabaseUser {
  id: string;
  email?: string;
  [key: string]: unknown;
}

interface AuthCtx {
  user: SupabaseUser | null;
  profile: Profile | null;
  role: Role | null;
  isAdmin: boolean;
  loading: boolean;
  setRole: (role: Role) => void;
  setProfile: (profile: Profile | null) => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  profile: null,
  role: null,
  isAdmin: false,
  loading: true,
  setRole: () => {},
  setProfile: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,    setUser]    = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role,    setRole]    = useState<Role | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      const profileData = (data ?? null) as Profile | null;
      const userRole = profileData?.role ?? "worker";

      setProfile(profileData);
      setRole(userRole);
      setIsAdmin(userRole === "admin");
    } catch (err) {
      console.error("[AuthContext] loadProfile failed:", err);
      setProfile(null);
      setRole("worker");
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        const sessionUser = (data.session?.user ?? null) as SupabaseUser | null;

        if (!mounted) return;
        setUser(sessionUser);

        if (sessionUser) {
          await loadProfile(sessionUser.id);
        } else {
          setProfile(null);
          setRole(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("[AuthContext] init error:", err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const sessionUser = (session?.user ?? null) as SupabaseUser | null;
        setUser(sessionUser);

        if (sessionUser) {
          loadProfile(sessionUser.id);
        } else {
          setProfile(null);
          setRole(null);
          setIsAdmin(false);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, role, isAdmin, loading, setRole, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
