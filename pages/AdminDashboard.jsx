import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/supabase";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import {
  Users, TrendingUp, CheckCircle, Shield, Clock, ChevronRight,
  BarChart3, Zap, Target, Activity, DollarSign, Gift,
  FileText, AlertTriangle, UserCheck, Flame
} from "lucide-react";

function KpiCard({ icon: Icon, label, value, sub, color, bg, trend }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trend !== undefined && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div className="text-2xl font-black">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

function MiniChart({ data, dataKey, color }) {
  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${color})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    totalUsers: 0, totalCampaigns: 0, totalSubmissions: 0,
    pendingRedemptions: 0, approvalRate: 0, activeToday: 0,
    fraudDetected: 0, totalRewardsGiven: 0
  });
  const [users, setUsers]         = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  useEffect(() => { fetchRealData(); }, []);

  const fetchRealData = async () => {
    setLoading(true);
    try {
      // ── Parallel counts ──
      const [
        { count: usersCount },
        { count: campaignsCount },
        { count: submissionsCount },
        { count: redemptionsCount },
        { count: approvedCount },
        { count: fraudCount },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
        supabase.from("social_task_submissions").select("*", { count: "exact", head: true }),
        supabase.from("redemptions").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("social_task_submissions").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("admin_logs").select("*", { count: "exact", head: true }).ilike("action", "%fraud%"),
      ]);

      // Active today
      const todayStr = new Date().toISOString().split("T")[0];
      const { count: activeToday } = await supabase
        .from("social_task_submissions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${todayStr}T00:00:00`);

      const approvalRate = submissionsCount > 0
        ? Math.round((approvedCount / submissionsCount) * 100)
        : 0;

      // Ledger total rewards
      const { data: ledger } = await supabase
        .from("point_transactions")
        .select("amount")
        .eq("type", "task_reward");
      const totalRewardsGiven = (ledger || []).reduce((s, t) => s + (t.amount || 0), 0);

      setMetrics({
        totalUsers: usersCount || 0,
        totalCampaigns: campaignsCount || 0,
        totalSubmissions: submissionsCount || 0,
        pendingRedemptions: redemptionsCount || 0,
        approvalRate,
        activeToday: activeToday || 0,
        fraudDetected: fraudCount || 0,
        totalRewardsGiven,
      });

      // Recent users
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);

      // Recent campaigns
      const { data: recentCampaigns } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);

      setUsers(recentUsers || []);
      setCampaigns(recentCampaigns || []);

      // ── Daily task completions (last 7 days) ──
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split("T")[0];
        const { count } = await supabase
          .from("social_task_submissions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${ds}T00:00:00`)
          .lt("created_at", `${ds}T23:59:59`)
          .eq("status", "approved");
        days.push({
          day: d.toLocaleDateString("es", { weekday: "short" }),
          completions: count || 0,
        });
      }
      setDailyStats(days);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-400" /> Panel de Administración
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Actualizado: {lastRefreshed} ·{" "}
            <button onClick={fetchRealData} className="text-blue-400 hover:underline">Refrescar</button>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-green-400/10 text-green-400 px-3 py-1.5 rounded-full text-xs font-bold border border-green-400/20">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          LIVE
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users}      label="Usuarios"         value={metrics.totalUsers}         sub="Registrados" color="text-blue-400"   bg="bg-blue-400/10" />
        <KpiCard icon={TrendingUp} label="Campañas"         value={metrics.totalCampaigns}     sub="Publicadas"  color="text-green-400"  bg="bg-green-400/10" />
        <KpiCard icon={CheckCircle} label="Tareas hoy"      value={metrics.activeToday}        sub="Completadas hoy" color="text-indigo-400" bg="bg-indigo-400/10" />
        <KpiCard icon={Gift}       label="Canjes pendientes" value={metrics.pendingRedemptions} sub="Por revisar" color="text-purple-400" bg="bg-purple-400/10" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Target}     label="Tasa de aprobación" value={`${metrics.approvalRate}%`}  sub="Submissions" color="text-yellow-400" bg="bg-yellow-400/10" />
        <KpiCard icon={Zap}        label="Rewards otorgados"  value={metrics.totalRewardsGiven}   sub="Puntos ledger" color="text-orange-400" bg="bg-orange-400/10" />
        <KpiCard icon={AlertTriangle} label="Fraude detectado" value={metrics.fraudDetected}      sub="Eventos logs" color="text-red-400"  bg="bg-red-400/10" />
        <KpiCard icon={Flame}      label="Submissions totales" value={metrics.totalSubmissions}   sub="Histórico"  color="text-rose-400"  bg="bg-rose-400/10" />
      </div>

      {/* ── DAILY CHART ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Tareas completadas — últimos 7 días
        </h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dailyStats} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "#fff" }}
            />
            <Bar dataKey="completions" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.5} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── USERS + CAMPAIGNS ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Usuarios Recientes
            </h2>
            <Link to={createPageUrl("AdminUsers")} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No hay usuarios</div>
            ) : users.map(u => (
              <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${u.status === "suspended" ? "bg-red-400/5 border border-red-400/10" : "bg-gray-800 hover:bg-gray-750"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${u.status === "suspended" ? "bg-red-400/20 text-red-400" : "bg-blue-400/20 text-blue-400"}`}>
                  {u.nickname?.charAt(0) || u.email?.substring(0, 2) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{u.nickname || u.email}</div>
                  <div className="text-xs text-gray-500 uppercase">{u.role}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === "suspended" ? "text-red-400 bg-red-400/10" : "text-green-400 bg-green-400/10"}`}>
                  {u.status === "suspended" ? "Suspendido" : "Activo"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" /> Campañas Recientes
            </h2>
            <Link to={createPageUrl("AdminCampaigns")} className="text-xs text-green-400 hover:underline flex items-center gap-1">
              Administrar <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No hay campañas</div>
          ) : (
            <div className="space-y-2">
              {campaigns.map(c => (
                <div key={c.id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 hover:bg-gray-750 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === "active" ? "bg-green-400" : c.status === "paused" ? "bg-yellow-400" : "bg-red-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{c.title}</div>
                    <div className="text-xs text-gray-500">{c.social_network} · {c.status}</div>
                  </div>
                  <span className="text-xs text-gray-400">${c.cost_per_action || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK NAV ── */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { icon: Users,      label: "Usuarios",    href: "/admin-users",    color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20"   },
          { icon: TrendingUp, label: "Campañas",    href: "/admin-campaigns",color: "text-green-400",  bg: "bg-green-400/10 border-green-400/20"  },
          { icon: Shield,     label: "Anti-fraude", href: "/admin-fraud",    color: "text-red-400",    bg: "bg-red-400/10 border-red-400/20"     },
          { icon: Gift,       label: "Canjes",      href: "/manage-prizes",  color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
          { icon: FileText,   label: "Audit Logs",  href: "/admin-logs",     color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20" },
        ].map((a, i) => (
          <Link key={i} to={a.href} className={`${a.bg} border rounded-2xl p-4 hover:opacity-80 transition-opacity flex flex-col items-center justify-center text-center gap-2`}>
            <a.icon className={`w-6 h-6 ${a.color}`} />
            <div className="font-semibold text-xs">{a.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
