import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Home, Compass, Trophy, User, Flame, Zap, TrendingUp, CheckSquare } from "lucide-react";
import "../styles/bottomnav.css";

// ─── Role-aware nav items ────────────────────────────────────────────────────
const WORKER_ITEMS = [
  { icon: Home,       path: "/feed",          label: "Inicio"   },
  { icon: Compass,    path: "/tasks",          label: "Tareas"   },
  { icon: Flame,      path: "/daily-missions", label: "Misiones" },
  { icon: User,       path: "/profile",        label: "Perfil"   },
];

const PROMOTER_ITEMS = [
  { icon: Home,       path: "/feed",              label: "Inicio"    },
  { icon: TrendingUp, path: "/my-campaigns",      label: "Campañas"  },
  { icon: Zap,        path: "/create-ad",         label: "Publicar"  },
  { icon: CheckSquare,path: "/review-tasks",      label: "Revisar"   },
];

const ADMIN_ITEMS = [
  { icon: Home,       path: "/feed",              label: "Feed"      },
  { icon: Compass,    path: "/admin-dashboard",   label: "Admin"     },
  { icon: Trophy,     path: "/admin-campaigns",   label: "Campañas"  },
  { icon: User,       path: "/admin-users",       label: "Usuarios"  },
];

// ─── Path match helper (prefix-based for nested routes) ────────────────────
function isActive(locationPath, itemPath) {
  if (itemPath === "/feed") return locationPath === "/feed" || locationPath === "/";
  return locationPath.startsWith(itemPath);
}

export default function BottomNav() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { role }  = useAuth();

  const items =
    role === "promoter" ? PROMOTER_ITEMS :
    role === "admin"    ? ADMIN_ITEMS    :
    WORKER_ITEMS;

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navegación principal">
      {items.map((item) => {
        const Icon   = item.icon;
        const active = isActive(location.pathname, item.path);

        return (
          <button
            key={item.path}
            className={`nav-item ${active ? "active" : ""}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            <div className="nav-icon-wrapper">
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className="nav-icon-svg"
              />
            </div>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
