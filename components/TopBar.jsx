import { Bell, Search, Menu, Zap } from "lucide-react";

export default function TopBar({ user, onToggleSidebar, onToggleNotifications, unreadCount }) {
  return (
    <header className="topbar">

      {/* LEFT */}
      <div className="topbar-left">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors mr-1">
          <Menu size={20} className="text-gray-400" />
        </button>

        <div className="avatar">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="U" />
          ) : (
            user?.name?.charAt(0) || "U"
          )}
        </div>

        <div className="brand flex items-center gap-1.5">
          <Zap size={14} className="text-yellow-400" fill="currentColor" />
          ClickWin
        </div>
      </div>

      {/* RIGHT */}
      <div className="topbar-actions">
        <button className="icon-btn">
          <Search size={18} />
        </button>

        {/* Notification bell with badge */}
        <button
          id="topbar-notifications-btn"
          className="icon-btn relative"
          onClick={onToggleNotifications}
          aria-label="Notificaciones"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 rounded-full text-[9px] font-black text-white border-2 border-gray-950 px-0.5 animate-bounce-once">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

    </header>
  );
}
