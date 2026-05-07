import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { createPageUrl } from "@/utils";
import { 
  Zap, Mail, Lock, ArrowRight, Loader2, AlertCircle 
} from "lucide-react";

import { getDefaultRouteForRole } from "@/core/routes";

export default function Login() {
  const { user, role, loading: globalLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [error, setError] = useState(null);

  // ✅ REDIRECCIÓN CONTROLADA FUERA DEL LOGIN (BASADA EN GLOBAL AUTH)
  const location = useLocation();
  useEffect(() => {
    if (globalLoading) return;
    if (!user) return;
    if (!role) return;
    
    if (location.pathname === "/login") {
      navigate(getDefaultRouteForRole(role), { replace: true });
    }
  }, [role, user, globalLoading, navigate, location.pathname]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loadingLogin) return;

    try {
      setLoadingLogin(true);
      setError(null);

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

    } catch (err) {
      console.error("[Login] Error de autenticación:", err.message);
      setError("Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden font-outfit">
      {/* Background Animated Elements */}
      <div className="absolute inset-0 z-0 text-center">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-400/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse delay-700"></div>
      </div>

      <div className="w-full max-w-md relative z-10 transition-all duration-500 animate-in fade-in zoom-in-95">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
          
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/20 rotate-3 group-hover:rotate-0 transition-all duration-500">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-400 mb-2">
              ¡Bienvenido!
            </h1>
            <p className="text-gray-400 font-medium">Ingresa a tu cuenta de ClickWin</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-200 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 ml-4 uppercase tracking-widest">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-yellow-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  disabled={loadingLogin}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800/50 border border-white/5 focus:border-yellow-400/50 rounded-2xl py-4 pl-12 pr-4 text-white outline-none transition-all placeholder:text-gray-600 focus:ring-4 focus:ring-yellow-400/10 disabled:opacity-50"
                  placeholder="ejemplo@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contraseña</label>
                {!loadingLogin && <button type="button" className="text-xs text-yellow-500 hover:text-yellow-400 font-bold transition-colors">¿Olvidaste la clave?</button>}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-yellow-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  disabled={loadingLogin}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800/50 border border-white/5 focus:border-yellow-400/50 rounded-2xl py-4 pl-12 pr-4 text-white outline-none transition-all placeholder:text-gray-600 focus:ring-4 focus:ring-yellow-400/10 disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 active:scale-[0.98] group overflow-hidden relative"
            >
              {loadingLogin ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="uppercase tracking-widest text-sm font-black">Validando...</span>
                </>
              ) : (
                <>
                  <span className="uppercase tracking-widest text-sm font-black">Entrar a ClickWin</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-500 text-sm font-medium">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="text-yellow-500 hover:text-yellow-400 font-bold transition-colors underline decoration-yellow-500/30 underline-offset-4">
              Regístrate ahora
            </Link>
          </p>
        </div>
        
        {/* Simple Debug Link for Developer */}
        {loadingLogin && (
          <button 
            onClick={() => navigate(0)} 
            className="mt-4 w-full text-center text-[10px] text-gray-700 hover:text-gray-500 uppercase tracking-tighter"
          >
            Si nada ocurre, haz clic aquí para recargar
          </button>
        )}
      </div>
    </div>
  );
}
