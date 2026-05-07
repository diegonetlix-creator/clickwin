import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User as UserIcon, Mail, Shield, Camera, Globe, Briefcase, Instagram, Github as TikTok, Twitter, CreditCard, Save, ChevronRight, Lock, Facebook, Youtube, Send, MessageCircle, Share2, AtSign, ArrowLeftRight, Users, Check } from "lucide-react";
import { supabase } from "@/supabase";
import User from "@/entities/User";
import { createPageUrl, uploadFile } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const navigate = useNavigate();
  const { user: authUser, role: authRole, setRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  const [message, setMessage] = useState({ type: "", text: "" });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    avatar_url: "",
    // Worker specific
    instagram: "",
    tiktok: "",
    twitter: "",
    withdrawal_address: "",
    facebook: "",
    youtube: "",
    threads: "",
    discord: "",
    telegram: "",
    // Promoter specific
    company_name: "",
    website_url: ""
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const me = await User.me();
      if (!me) {
        navigate(createPageUrl("Login"));
        return;
      }
      setUser(me);

      // Fetch role-specific data
      let roleData = {};
      if (me.role === "worker" || me.role === "student") {
        const { data, error } = await supabase.from("worker_profiles").select("*").eq("id", me.id).single();
        if (error && error.code !== "PGRST116") { // Ignore "not found"
          console.error("[Settings] Worker profile fetch error:", error);
        }
        roleData = data || {};
      } else if (me.role === "promoter") {
        const { data, error } = await supabase.from("promoter_profiles").select("*").eq("id", me.id).single();
        if (error && error.code !== "PGRST116") {
          console.error("[Settings] Promoter profile fetch error:", error);
        }
        roleData = data || {};
      }

      setFormData({
        name: me.name || "",
        email: me.email || "",
        avatar_url: me.avatar_url || "",
        instagram: roleData.instagram || "",
        tiktok: roleData.tiktok || "",
        twitter: roleData.twitter || "",
        withdrawal_address: roleData.withdrawal_address || "",
        facebook: roleData.facebook || "",
        youtube: roleData.youtube || "",
        threads: roleData.threads || "",
        discord: roleData.discord || "",
        telegram: roleData.telegram || "",
        company_name: roleData.company_name || "",
        website_url: roleData.website_url || ""
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSaving(true);
      const { url } = await uploadFile(file);
      setFormData(prev => ({ ...prev, avatar_url: url }));
      
      // Update profile immediately
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      window.dispatchEvent(new CustomEvent("user-updated"));
      setMessage({ type: "success", text: "Foto de perfil actualizada correctamente" });
    } catch (error) {
      setMessage({ type: "error", text: "Error al subir la imagen" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      // 1. Update general profile
      const { error: profileError } = await supabase.from("profiles").update({
        name: formData.name,
      }).eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Update role-specific profile
      if (user.role === "worker" || user.role === "student") {
        const { error: workerError } = await supabase.from("worker_profiles").upsert({
          id: user.id,
          instagram: formData.instagram,
          tiktok: formData.tiktok,
          twitter: formData.twitter,
          withdrawal_address: formData.withdrawal_address,
          facebook: formData.facebook,
          youtube: formData.youtube,
          threads: formData.threads,
          discord: formData.discord,
          telegram: formData.telegram
        });
        if (workerError) throw workerError;
      } else if (user.role === "promoter") {
        const { error: promoterError } = await supabase.from("promoter_profiles").upsert({
          id: user.id,
          company_name: formData.company_name,
          website_url: formData.website_url
        });
        if (promoterError) throw promoterError;
      }

      window.dispatchEvent(new CustomEvent("user-updated"));
      setMessage({ type: "success", text: "Configuración guardada correctamente" });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Error al guardar los cambios" });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (newRole) => {
    // Only allow switching TO admin if you are the specific owner email
    if (newRole === "admin" && authUser?.email !== "jaysonteayuda@gmail.com") {
      return alert("No autorizado para cambiar a Administrador.");
    }
    if (newRole === user.role) return;

    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", user.id);

      if (error) throw error;

      // Update global context
      setRole(newRole);
      
      setMessage({ type: "success", text: `Cuenta cambiada a ${newRole === 'promoter' ? 'Cliente' : 'Usuario'} correctamente.` });
      
      // Redirect after a short delay
      const routeMap = {
        worker: "/worker-dashboard",
        promoter: "/promoter-dashboard",
        student: "/worker-dashboard",
        admin: "/admin-dashboard"
      };

      setTimeout(() => {
        window.location.href = routeMap[newRole] || "/";
      }, 1500);

    } catch (error) {
      console.error("Error switching role:", error);
      setMessage({ type: "error", text: "Error al cambiar el tipo de cuenta" });
    } finally {
      setSaving(false);
    }
  };

  const isWorker = user?.role === "worker" || user?.role === "student" || (!user?.role && activeTab !== "promoter");
  const isPromoter = user?.role === "promoter" || activeTab === "promoter";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 space-y-2">
          <button onClick={() => setActiveTab("general")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium ${activeTab === "general" ? "bg-gray-800 text-yellow-400 shadow-lg border border-gray-700" : "text-gray-400 hover:text-white hover:bg-gray-800/50"}`}>
            <UserIcon className="w-5 h-5" /> Perfil General
          </button>
          
          {(user?.role === "worker" || user?.role === "student" || user?.role === "promoter") ? (
            user.role === "promoter" ? (
              <button onClick={() => setActiveTab("promoter")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium ${activeTab === "promoter" ? "bg-gray-800 text-blue-400 shadow-lg border border-gray-700" : "text-gray-400 hover:text-white hover:bg-gray-800/50"}`}>
                <Briefcase className="w-5 h-5" /> Datos del Cliente
              </button>
            ) : (
              <button onClick={() => setActiveTab("worker")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium ${activeTab === "worker" ? "bg-gray-800 text-yellow-400 shadow-lg border border-gray-700" : "text-gray-400 hover:text-white hover:bg-gray-800/50"}`}>
                <Instagram className="w-5 h-5" /> Redes y Pagos
              </button>
            )
          ) : (
            /* Fallback if role is missing but we want to show something based on URL or previous state */
            <button onClick={() => setActiveTab("worker")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium ${activeTab === "worker" ? "bg-gray-800 text-yellow-400 shadow-lg border border-gray-700" : "text-gray-400 hover:text-white hover:bg-gray-800/50"}`}>
              <Instagram className="w-5 h-5" /> Redes y Pagos
            </button>
          )}

          <button onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium ${activeTab === "security" ? "bg-gray-800 text-red-400 shadow-lg border border-gray-700" : "text-gray-400 hover:text-white hover:bg-gray-800/50"}`}>
            <Shield className="w-5 h-5" /> Seguridad
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded-[2rem] p-6 md:p-10 backdrop-blur-sm">
          {message.text && (
            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${message.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
              <div className={`w-2 h-2 rounded-full ${message.type === "success" ? "bg-green-400" : "bg-red-400"}`} />
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-8">
            
            {activeTab === "general" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex flex-col items-center sm:flex-row gap-6 border-b border-gray-800 pb-8">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gray-800 border-2 border-gray-700 ring-4 ring-gray-900">
                      {formData.avatar_url ? (
                        <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-600">
                          {user.name?.charAt(0) || "U"}
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-400 text-black rounded-xl border-4 border-gray-950 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg">
                      <Camera className="w-5 h-5" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-bold">Información de Perfil</h3>
                    <p className="text-sm text-gray-500 mt-1">Sube una foto clara para mayor confianza.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Nombre o Apodo de la Cuenta</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="email" value={formData.email} disabled
                        className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-500 cursor-not-allowed" />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-800">
                  <div className="flex items-center gap-3 mb-6">
                    <ArrowLeftRight className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-xl font-bold">Tipo de Cuenta</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleRoleChange("worker")}
                      disabled={saving}
                      className={`p-6 rounded-3xl border-2 transition-all text-left flex flex-col gap-2 ${user?.role === 'worker' || user?.role === 'student' ? 'bg-yellow-400/10 border-yellow-400 shadow-lg shadow-yellow-400/10' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500 opacity-60'}`}
                    >
                      <div className="flex items-center justify-between">
                        <Users className={`w-8 h-8 ${user?.role === 'worker' || user?.role === 'student' ? 'text-yellow-400' : 'text-gray-500'}`} />
                        {user?.role === 'worker' || user?.role === 'student' ? <Check className="w-5 h-5 text-yellow-400" /> : null}
                      </div>
                      <div className="mt-2 font-black uppercase text-sm tracking-tighter">MODO USUARIO (Worker)</div>
                      <div className="text-[10px] text-gray-500 leading-tight">Gana dinero completando misiones sociales y participando en campañas.</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChange("promoter")}
                      disabled={saving}
                      className={`p-6 rounded-3xl border-2 transition-all text-left flex flex-col gap-2 ${user?.role === 'promoter' ? 'bg-blue-600/10 border-blue-600 shadow-lg shadow-blue-600/10' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500 opacity-60'}`}
                    >
                      <div className="flex items-center justify-between">
                        <Briefcase className={`w-8 h-8 ${user?.role === 'promoter' ? 'text-blue-400' : 'text-gray-500'}`} />
                        {user?.role === 'promoter' ? <Check className="w-5 h-5 text-blue-400" /> : null}
                      </div>
                      <div className="mt-2 font-black uppercase text-sm tracking-tighter">Modo Cliente (Promoter)</div>
                      <div className="text-[10px] text-gray-500 leading-tight">Publica tus propias campañas, gestiona anuncios y analiza estadísticas.</div>
                    </button>

                    {authUser?.email === 'jaysonteayuda@gmail.com' && (
                      <button
                        type="button"
                        onClick={() => handleRoleChange("admin")}
                        disabled={saving}
                        className={`p-6 rounded-3xl border-2 transition-all text-left flex flex-col gap-2 col-span-1 md:col-span-2 ${user?.role === 'admin' ? 'bg-indigo-600/10 border-indigo-600 shadow-lg shadow-indigo-600/10' : 'bg-gray-800/50 border-gray-700 hover:border-violet-500 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between">
                          <Shield className={`w-8 h-8 ${user?.role === 'admin' ? 'text-indigo-400' : 'text-gray-500'}`} />
                          {user?.role === 'admin' ? <Check className="w-5 h-5 text-indigo-400" /> : null}
                        </div>
                        <div className="mt-2 font-black uppercase text-sm tracking-tighter text-indigo-400">MODO SUPER ADMIN 👑</div>
                        <div className="text-[10px] text-gray-500 leading-tight">Acceso total al sistema, control de usuarios, finanzas y auditoría global.</div>
                      </button>
                    )}
                  </div>
                  
                  {user?.role === 'admin' && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                      <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest text-center">Eres Administrador. El cambio persistirá en tu perfil.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "worker" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <h3 className="text-xl font-bold mb-1">Cuentas Sociales</h3>
                  <p className="text-sm text-gray-500">Estas cuentas se usarán para verificar tus tareas automáticamente.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-800 pb-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Usuario Instagram</label>
                    <div className="relative">
                      <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500" />
                      <input type="text" placeholder="@usuario" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Usuario TikTok</label>
                    <div className="relative">
                      <TikTok className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <input type="text" placeholder="@usuario" value={formData.tiktok} onChange={e => setFormData({...formData, tiktok: e.target.value})}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Usuario Facebook</label>
                    <div className="relative">
                      <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                      <input type="text" placeholder="perfil o nombre" value={formData.facebook} onChange={e => setFormData({...formData, facebook: e.target.value})}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Canal de YouTube</label>
                    <div className="relative">
                      <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                      <input type="text" placeholder="nombre del canal" value={formData.youtube} onChange={e => setFormData({...formData, youtube: e.target.value})}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Usuario Threads</label>
                    <div className="relative">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
                      <input type="text" placeholder="@usuario" value={formData.threads} onChange={e => setFormData({...formData, threads: e.target.value})}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Telegram</label>
                    <div className="relative">
                      <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                      <input type="text" placeholder="@usuario" value={formData.telegram} onChange={e => setFormData({...formData, telegram: e.target.value})}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Discord</label>
                    <div className="relative">
                      <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                      <input type="text" placeholder="usuario#0000" value={formData.discord} onChange={e => setFormData({...formData, discord: e.target.value})}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-1 text-yellow-400">Dirección de Retiro</h3>
                  <p className="text-sm text-gray-500 uppercase tracking-widest font-black text-[10px]">Método de pago preferido</p>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" placeholder="Wallet address / Email PayPal / Alias PIX" 
                      value={formData.withdrawal_address} onChange={e => setFormData({...formData, withdrawal_address: e.target.value})}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:bg-gray-800 transition-all" />
                  </div>
                  <p className="text-[10px] text-gray-600 px-1 font-medium italic">* Asegúrate de que los datos sean correctos para evitar demoras en los pagos.</p>
                </div>
              </div>
            )}

            {activeTab === "promoter" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <h3 className="text-xl font-bold mb-1">Datos de Marca</h3>
                  <p className="text-sm text-gray-500">Información pública que verán los usuarios en tus campañas.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Nombre de Empresa o Marca</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                      <input type="text" placeholder="Mi Empresa S.A." value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-blue-400 focus:bg-gray-800 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Sitio Web</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                      <input type="url" placeholder="https://miweb.com" value={formData.website_url} onChange={e => setFormData({...formData, website_url: e.target.value})}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-blue-400 focus:bg-gray-800 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <h3 className="text-xl font-bold mb-1 text-red-400">Seguridad de la Cuenta</h3>
                  <p className="text-sm text-gray-500">Gestiona tu contraseña y sesiones.</p>
                </div>

                <button type="button" onClick={() => {
                  supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + "/reset-password" });
                  setMessage({ type: "success", text: "Se ha enviado un correo para restablecer la contraseña" });
                }} className="flex items-center justify-between w-full group bg-gray-800/50 border border-gray-700 p-6 rounded-3xl hover:bg-gray-800 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Cambiar Contraseña</div>
                      <div className="text-xs text-gray-500 mt-0.5">Te enviaremos un correo de confirmación.</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                </button>
              </div>
            )}

            {/* Submit Button */}
            <div className={`flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-800 ${activeTab === 'security' ? 'hidden' : ''}`}>
              <button type="submit" disabled={saving}
                className={`flex-1 flex items-center justify-center gap-3 ${user.role === 'promoter' ? 'bg-blue-600' : 'bg-yellow-400 text-black'} font-black py-4 rounded-2xl hover:opacity-90 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50`}>
                {saving ? "Guardando..." : "Guardar Cambios"}
                {!saving && <Save className="w-5 h-5" />}
              </button>
              <button type="button" onClick={fetchUserData}
                className="px-8 py-4 bg-gray-800 text-gray-400 font-bold rounded-2xl hover:text-white transition-all">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
