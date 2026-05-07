import { supabase } from "@/supabase";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl, getLevel } from "@/utils";
import User from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { useAuth } from "@/contexts/AuthContext";
import {
  Zap, LayoutDashboard, Target, Trophy, History, Bell, Settings,
  LogOut, Menu, X, TrendingUp, Users, PlusCircle, BarChart3,
  CheckSquare, Shield, ChevronDown, Flame, Wallet, Sparkles, Star,
  Moon, Sun, Check, Trash2, Home, Gift, CheckCircle
} from "lucide-react";

import { can } from "@/core/can";
import { ToastContainer } from "@/components/Toast";
import TopBar from "./components/TopBar";
import BottomNav from "./layout/BottomNav";
import "./styles/topbar.css";
import "./styles/bottomnav.css";
import "./styles/ui-layer.css";

const USER_MENU = [
  { label: "Dashboard", icon: LayoutDashboard, page: "WorkerDashboard", permission: "VIEW_TASKS" },
  { label: "Feed", icon: Sparkles, page: "Feed", permission: "VIEW_FEED", isMobile: true },
  { label: "Tareas", icon: Target, page: "Tasks", permission: "VIEW_TASKS", isMobile: true },
  { label: "Misiones", icon: Flame, page: "DailyMissions", permission: "VIEW_TASKS", isMobile: true },
  { label: "Wallet", icon: Wallet, page: "WorkerBalance", permission: "VIEW_TASKS" },
  { label: "Historial", icon: History, page: "WorkerHistory", permission: "VIEW_TASKS" },
  { label: "Premios", icon: Trophy, page: "Prizes", permission: "VIEW_TASKS", isMobile: true },
  { label: "Social", icon: Users, page: "SocialTasks", permission: "VIEW_TASKS", isMobile: true },
  { label: "Revisión Social", icon: Users, page: "SocialReview", permission: "VIEW_TASKS" },
];

const PROMOTER_MENU = [
  { label: "Dashboard", icon: LayoutDashboard, page: "PromoterDashboard", permission: "CREATE_CAMPAIGN", isMobile: true },
  { label: "Feed", icon: Sparkles, page: "Feed", permission: "VIEW_FEED", isMobile: true },
  { label: "Publicar", icon: Zap, page: "CreateAd", permission: "CREATE_CAMPAIGN", isMobile: true },
  { label: "Campañas", icon: TrendingUp, page: "MyCampaigns", permission: "CREATE_CAMPAIGN", isMobile: true },
  { label: "Nueva", icon: PlusCircle, page: "CreateCampaign", permission: "CREATE_CAMPAIGN" },
  { label: "Misiones", icon: Flame, page: "PromoterMissionManager", permission: "MANAGE_MISSIONS", isMobile: true },
  { label: "Revisar", icon: CheckSquare, page: "ReviewTasks", permission: "REVIEW_TASKS", isMobile: true },
  { label: "Stats", icon: BarChart3, page: "PromoterStats", permission: "VIEW_STATS" },
  { label: "Premios", icon: Gift, page: "ManagePrizes", permission: "MANAGE_PRIZES" },
];

const ADMIN_MENU = [
  { label: "Admin", icon: LayoutDashboard, page: "AdminDashboard", permission: "MANAGE_USERS" },
  { label: "Feed", icon: Sparkles, page: "Feed", permission: "VIEW_FEED", isMobile: true },
  { label: "Usuarios", icon: Users, page: "AdminUsers", permission: "MANAGE_USERS" },
  { label: "Feed Control", icon: Shield, page: "AdminFeed", permission: "MANAGE_USERS" },
  { label: "Banners", icon: Star, page: "AdminBanners", permission: "MANAGE_USERS" },
  { label: "Campañas", icon: TrendingUp, page: "AdminCampaigns", permission: "MANAGE_CAMPAIGNS" },
  { label: "Fraude", icon: Shield, page: "AdminFraud", permission: "MANAGE_FRAUD" },
  { label: "Stats", icon: BarChart3, page: "PromoterStats", permission: "MANAGE_USERS" },
  { label: "Logs", icon: History, page: "AdminLogs", permission: "MANAGE_USERS" },
  { label: "Revisiones", icon: CheckCircle, page: "SocialReview", permission: "MANAGE_USERS" },
];

const NO_LAYOUT_PAGES = ["landing", "login", "register"];

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const { user, profile, role: userRole } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [pendingSocialCount, setPendingSocialCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async (userId) => {
      try {
        
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (error) throw error;
        setNotifications(data || []);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    const fetchPendingSocial = async () => {
      try {
        
        const { data, error } = await supabase.rpc("get_pending_reviews");
        if (error) throw error;
        setPendingSocialCount(data?.length || 0);
      } catch (err) {
        console.error("Error fetching social count:", err);
      }
    };

    if (user?.id) {
        fetchNotifications(user.id);
        if (userRole === "admin" || userRole === "worker") fetchPendingSocial();

        (() => {
          const nChannel = supabase
            .channel(`notifications-${user.id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications(user.id))
            .subscribe();

          return () => supabase.removeChannel(nChannel);
        });
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsLightMode(true);
      document.documentElement.classList.add('light-mode');
    }

    const savedSidebar = localStorage.getItem('sidebar_collapsed');
    if (savedSidebar === 'true') setDesktopSidebarCollapsed(true);
  }, [location.pathname, user?.id, userRole]);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', desktopSidebarCollapsed);
  }, [desktopSidebarCollapsed]);

  const pageLower = currentPageName?.toLowerCase() || "";
  const isNoLayout = NO_LAYOUT_PAGES.some(p => pageLower.includes(p));

  const ROLE_CONFIG = {
    admin: { color: "from-red-400 to-red-600", label: "Admin" },
    promoter: { color: "from-blue-400 to-blue-600", label: "Promoter" },
    worker: { color: "from-yellow-400 to-orange-500", label: "Worker" },
  };

  const roleColor = ROLE_CONFIG[userRole]?.color || "from-gray-400 to-gray-600";
  const roleLabel = ROLE_CONFIG[userRole]?.label || "User";

  const markAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await Notification.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  if (isNoLayout) return <>{children}</>;

  const activeMenu = userRole === "admin" ? ADMIN_MENU : (userRole === "promoter" ? PROMOTER_MENU : USER_MENU);
  const navItems = activeMenu.filter(item => can(userRole, item.permission));
  const mobileNavItems = navItems.filter(item => item.isMobile);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className={`app-root ${desktopSidebarCollapsed ? "desktop-collapsed" : ""}`}>
      <ToastContainer />
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 ${desktopSidebarCollapsed ? "lg:w-20 w-64" : "w-64"} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 overflow-y-auto scrollbar-hide`}>
        <div className="p-6 border-b border-gray-800 flex justify-center lg:justify-start">
          <Link to={createPageUrl("Landing")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {!desktopSidebarCollapsed && <span className="font-bold text-xl block">ClickWin</span>}
          </Link>
        </div>
        {!desktopSidebarCollapsed && (
          <div className="px-6 pb-2 pt-3 border-b border-gray-800">
            <div className={`inline-flex items-center gap-1 bg-gradient-to-r ${roleColor} text-black text-xs font-bold px-3 py-1 rounded-full`}>
              {roleLabel}
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pageLower.includes(item.page.toLowerCase());
            return (
              <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setSidebarOpen(false)} title={desktopSidebarCollapsed ? item.label : ""}
                className={`flex items-center gap-3 py-3 rounded-xl transition-all text-sm font-medium ${isActive ? `bg-gradient-to-r ${roleColor} text-black` : "text-gray-400 hover:text-white hover:bg-gray-800"} ${desktopSidebarCollapsed ? "px-0 justify-center" : "px-4"}`}>
                <div className="relative">
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${desktopSidebarCollapsed ? "mx-auto" : ""}`} />
                  {item.page === "SocialReview" && pendingSocialCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center text-white border-2 border-gray-900 pointer-events-none">
                       {pendingSocialCount}
                    </span>
                  )}
                </div>
                {!desktopSidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t border-gray-800 ${desktopSidebarCollapsed ? "flex flex-col items-center" : ""}`}>
          <div className={`flex items-center flex-col lg:flex-row gap-3 mb-3 ${desktopSidebarCollapsed ? "justify-center" : ""}`}>
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleColor} flex items-center justify-center font-bold text-black text-sm flex-shrink-0 overflow-hidden`}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || user?.email?.charAt(0) || "U"
              )}
            </div>
            {!desktopSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{user?.name || "Usuario"}</div>
                <div className="text-xs text-gray-500 truncate">{user?.email}</div>
              </div>
            )}
          </div>
          <Link to={createPageUrl("Settings")} title={desktopSidebarCollapsed ? "Configuración" : ""} className={`w-full flex items-center gap-2 text-gray-400 hover:text-white text-sm py-2 rounded-lg hover:bg-gray-800 transition-all mb-1 ${desktopSidebarCollapsed ? "px-0 justify-center" : "px-3"}`}>
            <Settings className="w-5 h-5 flex-shrink-0" /> {!desktopSidebarCollapsed && <span>Mi Perfil</span>}
          </Link>
          <button onClick={() => User.logout().then(() => navigate("/"))} title={desktopSidebarCollapsed ? "Cerrar sesión" : ""} className={`w-full flex items-center gap-2 text-gray-500 hover:text-red-400 text-sm py-2 rounded-lg hover:bg-gray-800 transition-all ${desktopSidebarCollapsed ? "px-0 justify-center" : "px-3"}`}>
            <LogOut className="w-5 h-5 flex-shrink-0" /> {!desktopSidebarCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* CONTENT AREA */}
      <div className={`flex-1 transition-all duration-300 ${desktopSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"} flex flex-col min-h-screen`}>
        <TopBar 
          user={user} 
          onToggleSidebar={() => setSidebarOpen(true)}
          onToggleNotifications={() => setShowNotifications(!showNotifications)}
          unreadCount={unreadCount}
          showNotifications={showNotifications}
          notifications={notifications}
          markAsRead={markAsRead}
          deleteNotification={deleteNotification}
          markAllAsRead={markAllAsRead}
        />

        {showNotifications && (
          <div className="fixed right-4 top-16 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <span className="font-bold text-sm">Notificaciones</span>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-[10px] text-yellow-400 hover:text-yellow-300 font-bold uppercase tracking-wider">
                  Marcar todo como leído
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <Bell className="w-10 h-10 text-gray-800 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm italic">Sin notificaciones por ahora</p>
                </div>
              ) : (
                notifications.map((n, i) => (
                  <div key={n.id || i} className={`p-4 border-b border-gray-800/50 hover:bg-gray-800/80 transition-all flex gap-3 group ${!n.is_read ? "bg-yellow-400/5 shadow-[inset_4px_0_0_0_rgba(250,204,21,1)]" : ""}`}>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-xs font-bold ${!n.is_read ? "text-white" : "text-gray-400"}`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${!n.is_read ? "text-gray-300" : "text-gray-500"}`}>
                          {n.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <main className="feed-page flex-1">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
