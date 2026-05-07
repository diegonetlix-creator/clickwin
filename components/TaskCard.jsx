import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap, Instagram, Youtube, Twitter, Facebook, Globe, Gift
} from "lucide-react";
import "@/styles/glass.css";
import "@/styles/taskcard.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PLATFORM_ICONS = {
  instagram: Instagram,
  youtube:   Youtube,
  tiktok:    Globe,
  twitter:   Twitter,
  facebook:  Facebook,
};

const PLATFORM_COLORS = {
  instagram: "from-purple-500 to-pink-500",
  youtube:   "from-red-500 to-red-700",
  tiktok:    "from-cyan-400 to-blue-500",
  twitter:   "from-sky-400 to-blue-500",
  facebook:  "from-blue-500 to-blue-700",
};

const DIFFICULTY_CHIP = {
  easy:   { label: "Fácil",   cls: "bg-green-500/20 text-green-300"  },
  medium: { label: "Medio",   cls: "bg-yellow-500/20 text-yellow-300" },
  hard:   { label: "Difícil", cls: "bg-red-500/20 text-red-300"      },
};

const AVATAR_GRADIENTS = [
  "from-purple-500 to-pink-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-red-500",
];
function avatarGrad(name = "") {
  return AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ─── Component ───────────────────────────────────────────────────────────────
function TaskCard({ task, onAction }) {
  const [pressed, setPressed] = useState(false);
  const navigate = useNavigate();
  if (!task) return null;

  // Data
  const displayImage  = task.image || task.image_url ||
    "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=600&auto=format&fit=crop";
  const displayTitle  = task.title || task.author_name || "Nueva Campaña";
  const displayDesc   = task.description || task.caption || "Completa esta tarea para ganar puntos.";
  const displayPoints = task.points || task.reward || 0;

  // Promoter
  const promoterName  = task.promoter_name || task.author_name || "Cliente";
  const promoterId    = task.promoter_id   || task.author_id;
  const avatarInitial = promoterName.charAt(0).toUpperCase();
  const grad          = avatarGrad(promoterName);

  // Platform
  const platform     = (task.social_network || task.platform || "").toLowerCase();
  const PlatformIcon = PLATFORM_ICONS[platform] || Globe;
  const platformGrad = PLATFORM_COLORS[platform] || "from-purple-500 to-pink-500";

  // Spots
  const spotsTotal     = task.spots_total || task.max_workers || 1;
  const spotsTaken     = task.spots_taken || task.current_participants || 0;
  const completionPct  = Math.min(Math.round((spotsTaken / spotsTotal) * 100), 100);
  const spotsLeft      = Math.max(spotsTotal - spotsTaken, 0);

  // Difficulty
  const diff = DIFFICULTY_CHIP[task.difficulty] || DIFFICULTY_CHIP.easy;
  const mins = task.estimated_minutes || (displayPoints > 50 ? 5 : 2);
  const age  = timeAgo(task.created_at);

  const handleComplete = (e) => {
    e.stopPropagation();
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    onAction?.(task);
  };

  const handlePremios = (e) => {
    e.stopPropagation();
    if (promoterId) navigate(`/prizes?promoter=${promoterId}`);
  };

  return (
    <article
      className={`taskcard-root ${pressed ? "scale-[0.98]" : ""}`}
      role="article"
    >
      {/* ── 1. HEADER: avatar · name · time · reward ── */}
      <div className="taskcard-header">
        <div className="taskcard-avatar-wrap">
          <div className={`taskcard-avatar bg-gradient-to-br ${grad}`}>
            {avatarInitial}
          </div>
          <div className="taskcard-meta">
            <span className="taskcard-author">{promoterName}</span>
            {age && <span className="taskcard-age">{age}</span>}
          </div>
        </div>

        {/* ⚡ Reward — top-right, always visible */}
        <div className="taskcard-reward">
          <Zap className="w-3.5 h-3.5" fill="currentColor" />
          +{displayPoints.toLocaleString()}
        </div>
      </div>

      {/* ── 2. TITLE + DESCRIPTION ── */}
      <div className="taskcard-body">
        <h3 className="taskcard-title">{displayTitle}</h3>
        <p className="taskcard-desc">{displayDesc}</p>
      </div>

      {/* ── 3. MEDIA ── */}
      <div className="taskcard-media-wrap">
        <img
          src={displayImage}
          alt={displayTitle}
          className="taskcard-media"
          loading="lazy"
        />
        {/* Urgency badge */}
        {spotsLeft > 0 && spotsLeft <= 5 && (
          <span className="taskcard-urgency">⚡ {spotsLeft} cupos</span>
        )}
        {/* Progress bar on image */}
        {completionPct > 0 && (
          <div className="taskcard-progress-bar">
            <div
              className={`taskcard-progress-fill ${completionPct >= 80 ? "bg-red-500" : "bg-purple-500"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        )}
      </div>

      {/* ── 4. CHIPS ── */}
      <div className="taskcard-chips">
        {/* Platform */}
        <span className={`taskcard-chip bg-gradient-to-r ${platformGrad} bg-opacity-20 text-white`}>
          <PlatformIcon className="w-2.5 h-2.5" />
          {platform || "social"}
        </span>

        {/* Time */}
        <span className="taskcard-chip bg-blue-500/20 text-blue-300">
          ~{mins} min
        </span>

        {/* Spots */}
        <span className={`taskcard-chip ${completionPct >= 80 ? "bg-red-500/20 text-red-300" : "bg-gray-500/20 text-gray-400"}`}>
          {spotsTaken}/{spotsTotal}
        </span>

        {/* Difficulty */}
        <span className={`taskcard-chip ${diff.cls}`}>
          {diff.label}
        </span>
      </div>

      {/* ── 5. CTA ROW — compact, NOT full width ── */}
      <div className="taskcard-cta-row">
        <button
          id={`complete-${task.id}`}
          onClick={handleComplete}
          className={`taskcard-btn-primary bg-gradient-to-r ${platformGrad}`}
        >
          Completar
        </button>

        {promoterId ? (
          <button
            onClick={handlePremios}
            className="taskcard-btn-secondary"
            title={`Ver premios de ${promoterName}`}
          >
            <Gift className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button disabled className="taskcard-btn-secondary opacity-30 cursor-not-allowed">
            <Gift className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}

export default memo(TaskCard);
