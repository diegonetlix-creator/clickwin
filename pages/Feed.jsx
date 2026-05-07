import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import User from "@/entities/User";
import { FeedPost } from "@/entities/FeedPost";
import { Campaign } from "@/entities/Campaign";
import TaskCard from "@/components/TaskCard";
import "@/styles/taskcard.css";
import FeedBanner from "@/components/FeedBanner";
import ReelsStrip from "@/components/ReelsStrip";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { supabase } from "@/supabase";
import StoryBar from "@/components/StoryBar";
import "@/styles/storybar.css";
import RewardCard from "@/components/RewardCard";
import "@/styles/rewardcard.css";
import CardWrapper from "@/components/ui/CardWrapper";
import {
  Search, TrendingUp, Zap, ChevronDown, RefreshCw, Loader2
} from "lucide-react";

const CATEGORIES = ["Todas", "Marketing", "Diseño", "Tecnología", "Ventas", "Contenido", "Fotografía", "Redes Sociales", "Otros"];
const NETWORKS   = ["all", "instagram", "youtube", "tiktok", "twitter", "facebook"];
const PAGE_SIZE  = 20;

// ─── Smart feed scoring (TikTok-style) ─────────────────────────────────────
function scorePost(p) {
  const reward         = p.reward || p.reward_per_task || 0;
  const spotsTotal     = p.spots_total || p.max_workers || 1;
  const spotsTaken     = p.spots_taken || p.current_participants || 0;
  const completionRate = spotsTaken / Math.max(spotsTotal, 1);          // 0→1
  const ageHours       = (Date.now() - new Date(p.created_at || 0)) / 3_600_000;
  const freshnessBonus = Math.max(0, 1 - ageHours / 72);               // 1 if <3d old
  return reward * 10 + (1 - completionRate) * 200 + freshnessBonus * 50;
}

// ─── Skeleton card ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden animate-pulse">
      <div className="aspect-[16/9] bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-white/5 rounded-full w-3/4" />
        <div className="h-2 bg-white/5 rounded-full w-full" />
        <div className="h-2 bg-white/5 rounded-full w-2/3" />
        <div className="h-8 bg-white/5 rounded-xl mt-2" />
      </div>
    </div>
  );
}

export default function Feed() {
  const navigate = useNavigate();
  const [user, setUser]             = useState(null);
  const [allPosts, setAllPosts]     = useState([]);   // full sorted list
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState("");
  const [activeNetwork, setActiveNetwork] = useState("all");
  const [sortBy, setSortBy]         = useState("smart");           // NEW default
  const [campaigns, setCampaigns]   = useState([]);
  const loaderRef = useRef(null);

  // ─── Load data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setVisibleCount(PAGE_SIZE);
    try {
      const u = await User.me().catch(() => null);
      setUser(u);

      const activeCampaigns = await Campaign.filter({ status: "active" }, "-created_at", 15).catch(() => []);
      setCampaigns(activeCampaigns);

      let feedPosts = [];
      try {
        feedPosts = await FeedPost.filter({ status: "active" }, "-created_at", 200);
      } catch {
        console.warn("FeedPost filter failed");
      }

      if (!feedPosts || feedPosts.length === 0) {
        feedPosts = (activeCampaigns || []).map((c, index) => ({
          id: c.id,
          campaign_id: c.id,
          task_id: null,
          author_id: c.promoter_id,
          author_name: c.promoter_name || c.brand_name || "Anunciante",
          promoter_id: c.promoter_id,                          // ← for premios navigation
          promoter_name: c.promoter_name || c.brand_name || "Anunciante",  // ← for avatar
          title: c.title,
          image_url: c.reference_image_url || `/${(index % 11) + 1} red social.jpg`,
          caption: c.description || c.instructions || `¡Participa en ${c.title}!`,
          category: c.category || "Redes Sociales",
          tags: [c.social_network, c.task_type].filter(Boolean),
          likes_count: 0,
          reward: c.reward_per_task,
          task_type: c.task_type,
          social_network: c.social_network,
          spots_total: c.max_participants,
          spots_taken: c.current_participants || 0,
          deadline: c.deadline,
          status: "active",
          is_from_campaign: true,
          created_at: c.created_at,

        }));
      }

      // Enrich images
      const enriched = (feedPosts || []).map((p, i) => ({
        ...p,
        image_url: p.image_url || `/${(i % 11) + 1} red social.jpg`,
      }));

      setAllPosts(enriched);
    } catch (err) {
      console.error("Critical Feed Error:", err);
      setError("No pudimos cargar el feed. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Infinite scroll via IntersectionObserver ───────────────────────────
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore) {
        setLoadingMore(true);
        setTimeout(() => {
          setVisibleCount(prev => prev + PAGE_SIZE);
          setLoadingMore(false);
        }, 400);
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadingMore]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleTaskAction = useCallback((task) => {
    const target = task.task_id
      ? createPageUrl(`TaskDetail?id=${task.task_id}`)
      : task.campaign_id ? `/tasks/campaign/${task.campaign_id}` : "#";
    if (target !== "#") navigate(target);
  }, [navigate]);

  // ─── Filtered + sorted posts ─────────────────────────────────────────────
  const filteredPosts = useMemo(() => {
    let filtered = allPosts.filter(p => {
      const matchSearch = !search ||
        p.caption?.toLowerCase().includes(search.toLowerCase()) ||
        p.author_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.title?.toLowerCase().includes(search.toLowerCase());
      const matchNetwork = activeNetwork === "all" || p.social_network === activeNetwork;
      return matchSearch && matchNetwork;
    });

    switch (sortBy) {
      case "smart":
        return [...filtered].sort((a, b) => scorePost(b) - scorePost(a));
      case "reward":
        return [...filtered].sort((a, b) => (b.reward || 0) - (a.reward || 0));
      case "newest":
        return [...filtered].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      case "spots":
        return [...filtered].sort((a, b) => {
          const rateA = (a.spots_taken || 0) / Math.max(a.spots_total || 1, 1);
          const rateB = (b.spots_taken || 0) / Math.max(b.spots_total || 1, 1);
          return rateA - rateB; // fewer taken = more opportunity = first
        });
      default:
        return filtered;
    }
  }, [allPosts, search, activeNetwork, sortBy]);

  const displayPosts  = filteredPosts.slice(0, visibleCount);
  const hasMore       = visibleCount < filteredPosts.length;

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="feed-container space-y-4">
        <div className="h-24 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState message={error} onRetry={loadData} />
    );
  }

  return (
    <div className="feed-container">
      <StoryBar campaigns={campaigns} />
      <RewardCard onClick={() => {}} />
      <FeedBanner />

      {/* ── SMART TOOLBAR ── */}
      <div className="flex flex-col gap-3 sticky top-0 z-50 bg-black/60 backdrop-blur-xl p-3 -mx-2 rounded-2xl border border-white/5 shadow-2xl mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-sm text-white focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="smart">🧠 SMART</option>
              <option value="reward">💰 PREMIO</option>
              <option value="newest">🆕 NUEVAS</option>
              <option value="spots">📊 CUPOS</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-purple-400 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Network pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {NETWORKS.map(n => (
            <button
              key={n}
              onClick={() => setActiveNetwork(n)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
                activeNetwork === n ? "bg-white text-black" : "bg-gray-900 text-gray-500 border border-white/5"
              }`}
            >
              {n === "all" ? "🌐 Todas" : n}
            </button>
          ))}
        </div>
      </div>

      {/* ── FEED LIST ── */}
      {displayPosts.length === 0 ? (
        <EmptyState
          title="Sin Tareas Activas"
          message="No hay tareas disponibles con estos filtros. ¡Cambia los filtros o vuelve pronto!"
          icon={TrendingUp}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1 mb-1">
            <h2 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
              {filteredPosts.length} tareas disponibles
            </h2>
            <Link to="/tasks" className="text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:underline">
              Ver todas
            </Link>
          </div>

          {displayPosts.map(post => (
            <CardWrapper key={post.id}>
              <TaskCard
                task={post}
                onAction={handleTaskAction}
              />
            </CardWrapper>
          ))}

          {/* ── INFINITE SCROLL TRIGGER ── */}
          <div ref={loaderRef} className="flex justify-center py-6">
            {hasMore ? (
              loadingMore ? (
                <div className="flex items-center gap-2 text-white/30 text-xs font-bold uppercase tracking-widest">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando más...
                </div>
              ) : (
                <div className="text-white/10 text-[10px] font-black uppercase tracking-[0.3em]">
                  ↓ Desliza para más
                </div>
              )
            ) : (
              <div className="text-white/10 text-[10px] font-black uppercase tracking-[0.4em]">
                Has llegado al final · {filteredPosts.length} tareas
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
