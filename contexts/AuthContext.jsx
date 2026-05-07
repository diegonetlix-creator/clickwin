import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/supabase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);   // ← full profile object
  const [role,    setRole]    = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);   // true until BOTH auth + profile resolve

  // ─── Load full profile (role + name + avatar) ────────────────────────
  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      const profileData = data ?? null;
      const userRole    = profileData?.role || "worker";

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

  // ─── Initialize on mount ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);

        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user ?? null;

        if (!mounted) return;
        setUser(sessionUser);

        if (sessionUser) {
          await loadProfile(sessionUser.id);  // AWAIT so loading stays true until role is set
        } else {
          setProfile(null);
          setRole(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("[AuthContext] init error:", err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);  // ONLY unblock after profile is ready
      }
    };

    init();

    // ── Listen for login/logout events ────────────────────────────────
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          // Don't await here — we don't block the event loop
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
    <AuthContext.Provider
      value={{
        user,
        profile,   // ← full profile (name, avatar, role, etc.)
        role,
        isAdmin,
        loading,
        setRole,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
