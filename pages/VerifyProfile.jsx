import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, AlertTriangle, ArrowRight, UserCheck } from "lucide-react";
import { supabase } from "@/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/Toast";

export default function VerifyProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("pending"); // pending, verifying, success, error

  const handleVerify = async () => {
    setLoading(true);
    setStatus("verifying");
    
    try {
      // Simulate/Real verification logic
      const { error } = await supabase
        .from("worker_profiles")
        .update({ is_verified: true })
        .eq("id", user?.id);

      if (error) throw error;

      setTimeout(() => {
        setStatus("success");
        setLoading(false);
        toast.success("¡Perfil verificado correctamente!");
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setLoading(false);
      toast.error("Error al verificar el perfil");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-900/40 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-3xl shadow-2xl text-center space-y-8 animate-in fade-in zoom-in duration-700">
        
        <div className="relative mx-auto w-24 h-24">
          <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${status === 'success' ? 'bg-green-500' : 'bg-indigo-500'}`} />
          <div className="relative w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            {status === "pending" && <Shield className="w-12 h-12 text-indigo-400" />}
            {status === "verifying" && <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
            {status === "success" && <CheckCircle className="w-12 h-12 text-green-400 animate-bounce" />}
            {status === "error" && <AlertTriangle className="w-12 h-12 text-red-400" />}
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight">Verificación de Perfil</h1>
          <p className="text-gray-400 text-sm font-medium leading-relaxed">
            {status === "pending" && "Para acceder a tareas premium y retirar tus ganancias, necesitamos verificar tu identidad."}
            {status === "verifying" && "Estamos validando tus datos con nuestros servidores de seguridad..."}
            {status === "success" && "¡Enhorabuena! Tu cuenta ahora tiene el sello de verificación ClickWin."}
            {status === "error" && "No pudimos completar la verificación. Por favor, intenta de nuevo."}
          </p>
        </div>

        <div className="space-y-4 pt-4">
          {status === "pending" && (
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
            >
              COMENZAR VERIFICACIÓN <ArrowRight className="w-5 h-5" />
            </button>
          )}

          {status === "success" && (
            <button
              onClick={() => navigate("/worker-dashboard")}
              className="w-full bg-green-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-green-500/20"
            >
              IR AL PANEL <UserCheck className="w-5 h-5" />
            </button>
          )}

          {status === "error" && (
            <button
              onClick={() => setStatus("pending")}
              className="w-full bg-red-500/10 text-red-400 border border-red-500/20 font-black py-5 rounded-2xl transition-all"
            >
              REINTENTAR
            </button>
          )}

          <button
            onClick={() => navigate(-1)}
            className="w-full text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
          >
            Volver atrás
          </button>
        </div>
      </div>

      <div className="mt-12 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
        <Shield size={12} /> SECURE VERIFICATION BY CLICKWIN PROTOCOL
      </div>
    </div>
  );
}
