import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl, getInitialRouteByRole } from "@/utils";
import User from "@/entities/User";
import { Zap, Mail, Lock, User as UserIcon, ArrowRight, Github, Chrome, Shield } from "lucide-react";

import { supabase } from "@/supabase";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("worker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: ""
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Sign up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: role
          }
        }
      });

      if (authError) throw authError;

      // 2. Explicitly create the profile record in our database table
      if (data.user) {
        const referrerId = localStorage.getItem("referrer");

        // role solo puede ser worker o promoter desde el cliente
        const safeRole = role === "promoter" ? "promoter" : "worker";

        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: formData.email,
              name: formData.fullName,
              role: safeRole,
              referred_by: referrerId
            });
        
        if (profileError) {
          console.error("Error creating profile record:", profileError);
        } else if (referrerId) {
          // If profile created successfully AND we have a referrer, give reward
          await supabase.rpc("reward_referral", {
            p_user_id: data.user.id
          });
          localStorage.removeItem("referrer"); // Clear after success
        }
      }

      // 3. Redirect or notify
      if (data.session) {
        navigate(getInitialRouteByRole(role));
      } else {
        setError("Cuenta creada. Revisa tu correo para confirmar (si está activado).");
      }

    } catch (err) {
      setError(err.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + getInitialRouteByRole(role),
          queryParams: {
            // We can pass the role as a query param to handle it after redirect
            role: role
          }
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || "Error en autenticación de Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-lg bg-gray-900 border border-gray-800 rounded-[2.5rem] p-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-500 mb-4 shadow-xl shadow-yellow-500/25">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black">Crea tu cuenta gratis</h1>
          <p className="text-gray-400 text-sm mt-2">Únete a la plataforma líder de crecimiento orgánico</p>
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded-xl text-sm border ${error.includes('correo') ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {error}
          </div>
        )}

        {/* Role Selector */}
        <div className="flex gap-2 p-1.5 bg-gray-800 rounded-2xl mb-8">
          <button onClick={() => setRole("worker")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${role === "worker" ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20" : "text-gray-400 hover:text-white"}`}>
            Usuario
          </button>
          <button onClick={() => setRole("promoter")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${role === "promoter" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-gray-400 hover:text-white"}`}>
            Cliente
          </button>
        </div>

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Nombre completo</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" required placeholder="Juan Pérez"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
            </div>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="email" required placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Contraseña segura</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="password" required placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
            </div>
          </div>

          <div className="col-span-2 py-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" required className="mt-1 w-5 h-5 rounded-lg border-gray-700 bg-gray-800/50" />
              <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                Acepto los <a href="#" className="text-yellow-400 font-bold hover:underline">términos de servicio</a> y la <a href="#" className="text-yellow-400 font-bold hover:underline">política de privacidad</a>.
              </span>
            </label>
          </div>

          <button type="submit" disabled={loading}
            className={`col-span-2 flex items-center justify-center gap-3 bg-gradient-to-r ${role === "worker" ? "from-yellow-400 to-orange-500 text-black" : "from-blue-500 to-purple-600 text-white"} font-black py-4 rounded-2xl hover:opacity-90 transition-all hover:scale-[1.02] shadow-xl shadow-yellow-500/10 mt-2`}>
            {loading ? "Creando cuenta..." : "Comenzar ahora"}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-10">
          ¿Ya eres parte de la comunidad? <Link to={createPageUrl("Login")} className="text-yellow-400 font-bold hover:underline">Inicia sesión aquí</Link>
        </p>

        <div className="relative my-8 text-center">
            <span className="relative z-10 bg-gray-900 px-4 text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">O únete con</span>
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-px bg-gray-800" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 bg-white hover:bg-gray-100 py-4 rounded-2xl border border-white text-black text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Chrome className="w-5 h-5" /> Google
          </button>
          <button 
            type="button"
            className="flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 py-4 rounded-2xl border border-gray-700 text-white text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Github className="w-5 h-5" /> GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
