import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Heart, MessageCircle, Share2, Bookmark, Clock, Users, Zap,
  Instagram, Youtube, Twitter, Facebook, ExternalLink, MoreHorizontal, Send, Gift
} from "lucide-react";

const NETWORK_ICONS = { instagram: Instagram, youtube: Youtube, twitter: Twitter, facebook: Facebook };
const NETWORK_COLORS = {
  instagram: "from-pink-500 to-purple-500",
  youtube: "from-red-500 to-red-600",
  twitter: "from-blue-400 to-blue-500",
  facebook: "from-blue-600 to-blue-700",
  tiktok: "from-gray-700 to-gray-900",
};

export default function FeedPostCard({ post, currentUserId, onLike, onSave, onComment, onShare }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isAuthor = currentUserId === post.author_id || currentUserId === post.promoter_id;

   const NetIcon = NETWORK_ICONS[post?.social_network] || Zap;
  const netGradient = NETWORK_COLORS[post?.social_network] || "from-purple-500 to-pink-500";
  
  const handleLike = () => {
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 600);
    onLike?.(post.id);
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    onComment?.(post.id, commentText.trim());
    setCommentText("");
  };

  const handleShare = async () => {
    const referralLink = `${window.location.origin}${createPageUrl(`TaskDetail?id=${post.task_id || post.id}`)}?ref=${currentUserId}`;
    const text = `🔥 Mira esta tarea en ClickWin y gana dinero:\n${referralLink}`;
    
    if (currentUserId) {
      onShare?.(post.id, currentUserId);
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}sem`;
  };

  return (
    <div className="feed-gradient group" onDoubleClick={handleLike}>
      <div className="feed-gradient-inner feed-card">
        {/* Author Header */}
        <div className="feed-header">
          <div className={`feed-avatar bg-gradient-to-br ${netGradient} flex items-center justify-center text-white text-xs font-black`}>
            {post.author_name?.[0]?.toUpperCase() || "C"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link 
                to={createPageUrl(`Tasks?promoterId=${post?.author_id || post?.promoter_id}`)}
                className="feed-username hover:text-purple-400 transition-colors truncate"
              >
                {post?.author_name || "Anunciante"}
              </Link>
            </div>
            <div className="feed-meta">
              <NetIcon className="w-2.5 h-2.5" />
              <span>{post?.social_network || "Red Social"}</span>
              <span>·</span>
              <span>{post?.is_promoted ? "Patrocinado" : timeAgo(post?.created_at)}</span>
              {post?.is_promoted && <span>· {timeAgo(post?.created_at)}</span>}
            </div>
          </div>
          
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <div className="absolute right-4 top-14 w-48 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95 duration-200">
              {isAuthor ? (
                <Link 
                  to={createPageUrl(`CreateAd?id=${post.campaign_id || post.id}`)}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-colors"
                >
                  <Zap className="w-4 h-4 text-purple-400" />
                  EDITAR CAMPAÑA
                </Link>
              ) : (
                <div className="px-4 py-2.5 text-[10px] text-gray-500 uppercase font-black tracking-widest leading-tight">
                  No tienes permisos para editar
                </div>
              )}
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-400/10 transition-colors">
                <Share2 className="w-4 h-4" />
                REPORTAR
              </button>
              {(post.author_id || post.promoter_id) && (
                <Link 
                  to={createPageUrl(`Tasks?promoterId=${post.author_id || post.promoter_id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-400/10 transition-colors border-t border-white/5 mt-1"
                >
                  <Users className="w-4 h-4" />
                  VER TODAS LAS TAREAS
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="feed-body-text">
          <h4 className="font-black text-white mb-1 tracking-tight">
            {post.title || "Nueva Tarea"}
          </h4>
          <p className="line-clamp-2 opacity-70">
            {post.caption || "Participa ahora y obtén recompensas."}
          </p>
        </div>

        {/* Media Container */}
        <div className="feed-image-container relative">
          <div className="feed-image overflow-hidden relative flex items-center justify-center">
            {post.image_url ? (
              <img 
                src={post.image_url} 
                alt={post.title || post.caption || "Ad image"} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              />
            ) : (
              <div className={`absolute inset-0 w-full h-full flex items-center justify-center opacity-80 bg-gradient-to-br ${netGradient}`}>
                <NetIcon className="w-16 h-16 text-white/20" />
              </div>
            )}
            
            {post.category && (
              <span className="absolute top-3 left-3 bg-gray-950/80 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-widest z-10">
                {post.category}
              </span>
            )}

            {post.reward > 0 && (
              <div className="absolute bottom-3 right-3 bg-yellow-400 text-black text-[10px] font-black px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl z-10">
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>+{post.reward} {post.reward_type === "Dinero" ? "USD" : "PTS"}</span>
              </div>
            )}
            
            {isLikeAnimating && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-ping" />
              </div>
            )}
          </div>
        </div>

        {/* Interaction Bar - Instagram Style */}
        <div className="feed-actions">
          <div className="actions-left">
            <button onClick={handleLike} className="flex items-center gap-1 group">
              <Heart className={`icon like ${post.user_liked ? "active" : ""}`} />
              {post.likes_count > 0 && <span className="text-[12px] font-bold text-gray-400 group-hover:text-white transition-colors">{post.likes_count}</span>}
            </button>
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 group">
              <MessageCircle className="icon" />
              {post.comments_count > 0 && <span className="text-[12px] font-bold text-gray-400 group-hover:text-white transition-colors">{post.comments_count}</span>}
            </button>
            <button onClick={handleShare} className="flex items-center">
              <Send className="icon" />
            </button>
          </div>
          
          <button onClick={() => onSave?.(post.id)} className="flex items-center">
            <Bookmark className={`icon save ${post.user_saved ? "active" : ""}`} />
          </button>
        </div>

        {/* CTA Button */}
        <Link
          to={post.task_id ? createPageUrl(`TaskDetail?id=${post.task_id}`) : (post.campaign_id ? `/tasks/campaign/${post.campaign_id}` : "#")}
          className="feed-cta block"
        >
          {post.cta_text || "Aceptar Reto"}
        </Link>

        {/* Comments section */}
        {showComments && (
          <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4 bg-gray-950/20">
            {post.comments?.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                {post.comments.map((c, i) => (
                  <div key={i} className="text-[12px] leading-relaxed">
                    <span className="font-bold text-white mr-2">{c.user_name || "Usuario"}</span>
                    <span className="text-gray-400">{c.content}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Escribe un comentario..."
                className="flex-1 bg-gray-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 transition-all disabled:opacity-30 active:scale-95 shadow-lg"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
