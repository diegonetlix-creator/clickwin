import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import User from "@/entities/User";
import { Campaign } from "@/entities/Campaign";
import { Submission } from "@/entities/Submission";
import { PromoterProfile } from "@/entities/PromoterProfile";
import {
  Instagram, Youtube, Twitter, Facebook, ArrowRight, Star, Gift,
  PlusCircle, CheckCircle, BarChart3, Clock, AlertCircle, Eye, ChevronRight,
  Share2, TrendingUp, Wallet
} from "lucide-react";
import { supabase } from "@/supabase";

const NETWORK_COLORS = { instagram: "text-pink-400 bg-pink-400/10", youtube: "text-red-400 bg-red-400/10", twitter: "text-blue-400 bg-blue-400/10", facebook: "text-blue-600 bg-blue-600/10", tiktok: "text-white bg-white/10", linkedin: "text-blue-500 bg-blue-500/10" };
const STATUS_STYLES = { active: "bg-green-400/10 text-green-400 border-green-400/20", paused: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20", completed: "bg-gray-400/10 text-gray-400 border-gray-400/20", draft: "bg-blue-400/10 text-blue-400 border-blue-400/20", cancelled: "bg-red-400/10 text-red-400 border-red-400/20" };
const STATUS_LABELS = { active: "Activa", paused: "Pausada", completed: "Completada", draft: "Borrador", cancelled: "Cancelada" };

function KpiCard({ icon: Icon, label, value, sub, color, trend, to }) {
  const content = (
    <div className={`card ${to ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between mb-3 w-full">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && <span className="text-xs text-green-400 font-medium">↑ {trend}</span>}
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="label-mono mt-1">{label}</div>
      {sub && <div className="subtitle-secondary mt-1">{sub}</div>}
    </div>
  );

  if (to) return <Link to={to}>{content}</Link>;
  return content;
}

export default function PromoterDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [socialStats, setSocialStats] = useState({ likes: 0, comments: 0, shares: 0, referrals: 0 });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const u = await User.me();
        if (!u) return;
        setUser(u);

        // 1. Cargar perfil
        const profiles = await PromoterProfile.filter({ id: u.id }, '-created_at', 1).catch((err) => {
          console.error("[PromoterDashboard] Profile fetch error:", err);
          return [];
        });
        if (profiles.length > 0) setProfile(profiles[0]);

        // 2. Cargar campañas
        let camps = await Campaign.filter({ promoter_id: u.id }, '-created_at', 10).catch((err) => {
          console.error("[PromoterDashboard] Campaigns fetch error:", err);
          return [];
        });
        if (camps.length === 0) {
          camps = await Campaign.filter({ promoter_email: u.email }, '-created_at', 10).catch(() => []);
        }
        setCampaigns(camps);

        // 3. Cargar pendientes
        let subs = await Submission.filter({ promoter_id: u.id, status: "pending" }, '-created_at', 5).catch((err) => {
          console.error("[PromoterDashboard] Pending subs fetch error:", err);
          return [];
        });
        if (subs.length === 0) {
           subs = await Submission.filter({ promoter_email: u.email, status: "pending" }, '-created_at', 5).catch(() => []);
        }
        setPendingSubmissions(subs);


        // 4. Cargar estadísticas sociales (Part 8 & 9)
        const myPostIds = camps.map(c => c.id);
        if (myPostIds.length > 0) {
          const { count: likesCount }    = await supabase.from("post_likes").select("*", { count: "exact", head: true }).in("post_id", myPostIds);
          const { count: commentsCount } = await supabase.from("post_comments").select("*", { count: "exact", head: true }).in("post_id", myPostIds);
          const { count: sharesCount }   = await supabase.from("post_shares").select("*", { count: "exact", head: true }).in("post_id", myPostIds);
          const { count: referralsCount } = await supabase.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_user", u.id);
          
          setSocialStats({
            likes: likesCount || 0,
            comments: commentsCount || 0,
            shares: sharesCount || 0,
            referrals: referralsCount || 0
          });
        }
      } catch (err) {
        console.error("Error Dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalTasks = campaigns.reduce((s, c) => s + (c.approved_count || 0) + (c.pending_count || 0), 0);
  const totalApproved = campaigns.reduce((s, c) => s + (c.approved_count || 0), 0);
  const approvalRate = totalTasks > 0 ? Math.round((totalApproved / totalTasks) * 100) : 0;
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Dashboard Cliente</h1>
          <p className="text-gray-400 font-medium text-xs md:text-sm mt-1">Bienvenido, {user?.fullName || profile?.company_name || "Cliente"}</p>
        </div>
        <Link to={createPageUrl("CreateCampaign")}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl hover:opacity-90 transition-all shadow-xl active:scale-95">
          <PlusCircle className="w-5 h-5" /> Nueva campaña
        </Link>
      </div>

      {/* Quick Access Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
        <Link to={createPageUrl("CreateCampaign")} className="flex-shrink-0 flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-blue-500/50 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
          <PlusCircle className="w-4 h-4 text-blue-400" /> Nueva Campaña
        </Link>
        <Link to={createPageUrl("ReviewTasks")} className="flex-shrink-0 flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-yellow-500/50 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
          <CheckCircle className="w-4 h-4 text-yellow-500" /> Revisar ({pendingSubmissions.length})
        </Link>
        <Link to={createPageUrl("MyCampaigns")} className="flex-shrink-0 flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-green-500/50 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
          <TrendingUp className="w-4 h-4 text-green-500" /> Mis Campañas
        </Link>
        <Link to={createPageUrl("PromoterStats")} className="flex-shrink-0 flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-purple-500/50 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
          <BarChart3 className="w-4 h-4 text-purple-500" /> Estadísticas
        </Link>
      </div>

      {/* KPIs */}
      <div className="dashboard-grid grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} label="Campañas activas" value={activeCampaigns} sub={`${campaigns.length} total`} color="bg-blue-400/10 text-blue-400" trend="+2" to={createPageUrl("MyCampaigns")} />
        <KpiCard icon={CheckCircle} label="Aprobadas" value={totalApproved.toLocaleString()} sub={`${approvalRate}% tasa`} color="bg-green-400/10 text-green-400" to={createPageUrl("PromoterStats")} />
        <KpiCard icon={Gift} label="Referidos" value={socialStats.referrals} sub="Usuarios" color="bg-yellow-400/10 text-yellow-400" />
        <KpiCard icon={Wallet} label="Total gastado" value={`$${(profile?.total_spent || 0).toFixed(0)}`} sub={`Balance: $${(profile?.wallet_balance || 0).toFixed(0)}`} color="bg-purple-400/10 text-purple-400" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Likes Recibidos</div>
            <div className="text-xl font-black text-white">{socialStats.likes}</div>
          </div>
          <Star className="w-8 h-8 text-yellow-400/20" />
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Comentarios</div>
            <div className="text-xl font-black text-white">{socialStats.comments}</div>
          </div>
          <ArrowRight className="w-8 h-8 text-blue-400/20" />
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Veces Compartido</div>
            <div className="text-xl font-black text-white">{socialStats.shares}</div>
          </div>
          <Share2 className="w-8 h-8 text-green-400/20" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pending reviews */}
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" /> Pendientes de revisión
            </h2>
            <Link to={createPageUrl("ReviewTasks")} className="text-xs text-blue-400 hover:underline">Ver todas</Link>
          </div>
          {pendingSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No hay tareas pendientes
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSubmissions.map((sub, i) => (
                <Link key={i} to={createPageUrl(`ReviewTasks?id=${sub.task_id}`)}
                  className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 hover:bg-gray-750 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{sub.campaign_title || "Campaña"}</div>
                    <div className="text-xs text-gray-500">{sub.worker_name || sub.worker_email}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </Link>
              ))}
            </div>
          )}
          <Link to={createPageUrl("ReviewTasks")}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-semibold text-sm py-3 rounded-xl hover:bg-yellow-400/20 transition-colors">
            <Eye className="w-4 h-4" /> Revisar todas las evidencias
          </Link>
        </div>

        {/* Campaigns list */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" /> Mis campañas
            </h2>
            <Link to={createPageUrl("MyCampaigns")} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No tienes campañas aún</p>
              <p className="text-sm mt-1">Crea tu primera campaña para comenzar</p>
              <Link to={createPageUrl("CreateCampaign")}
                className="inline-flex items-center gap-2 mt-4 bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-colors text-sm">
                <PlusCircle className="w-4 h-4" /> Crear campaña
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((c, i) => {
                const netStyle = NETWORK_COLORS[c.social_network] || "text-gray-400 bg-gray-400/10";
                const statusStyle = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
                const progress = c.max_participants > 0 ? Math.min((c.current_participants / c.max_participants) * 100, 100) : 0;
                return (
                  <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-blue-400/30 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{c.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${netStyle}`}>{c.social_network}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${statusStyle}`}>{STATUS_LABELS[c.status]}</span>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-sm font-bold text-green-400">{c.approved_count || 0}</div>
                        <div className="text-xs text-gray-500">aprobadas</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                        <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{c.current_participants || 0}/{c.max_participants}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link to={createPageUrl("CreateCampaign")} className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-5 hover:border-blue-400/50 transition-all group">
          <PlusCircle className="w-8 h-8 text-blue-400 mb-3" />
          <div className="font-bold">Crear campaña</div>
          <div className="text-sm text-gray-400 mt-1">Define tareas y recompensas</div>
          <ArrowRight className="w-4 h-4 text-blue-400 mt-3 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link to={createPageUrl("ReviewTasks")} className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-5 hover:border-yellow-400/50 transition-all group">
          <Eye className="w-8 h-8 text-yellow-400 mb-3" />
          <div className="font-bold">Revisar evidencias</div>
          <div className="text-sm text-gray-400 mt-1">{pendingSubmissions.length} pendientes de revisión</div>
          <ArrowRight className="w-4 h-4 text-yellow-400 mt-3 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link to={createPageUrl("PromoterStats")} className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-5 hover:border-green-400/50 transition-all group">
          <BarChart3 className="w-8 h-8 text-green-400 mb-3" />
          <div className="font-bold">Ver estadísticas</div>
          <div className="text-sm text-gray-400 mt-1">Analiza el rendimiento</div>
          <ArrowRight className="w-4 h-4 text-green-400 mt-3 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
