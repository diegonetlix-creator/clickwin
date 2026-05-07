import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/core/can";

export default function ProtectedRoute({ permission, children }) {
  const { user, role, isAdmin, loading } = useAuth();
  const location = useLocation();

  // ⏳ Wait for BOTH auth session AND profile to load
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // ❌ Not logged in → send to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // ⏳ User is logged in but profile/role not yet resolved
  if (!role) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-400/20 border-t-violet-400 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // 🔐 Permission check — admins bypass all permission checks
  if (permission && !isAdmin && !can(role, permission)) {
    console.warn(`[Auth] Denied: role="${role}" lacks permission="${permission}"`);
    return <Navigate to="/" replace />;
  }

  return children;
}
