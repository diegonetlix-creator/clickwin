import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, X, Upload, Check, RefreshCw, Edit3, Trash2,
  Heart, Play, Clapperboard, Camera
} from "lucide-react";

// ─── Reel Modal (Create / Edit) ───────────────────────────────────────────────
function ReelModal({ existingReel, onClose, onSaved }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const isEdit = !!existingReel;

  const [caption,   setCaption]   = useState(existingReel?.caption || "");
  const [preview,   setPreview]   = useState(existingReel?.media_url || null);
  const [mediaType, setMediaType] = useState(existingReel?.media_type || "image");
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMediaType(f.type.startsWith("video/") ? "video" : "image");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!isEdit && !file) { setError("Selecciona una imagen o video."); return; }
    if (!caption.trim())  { setError("Escribe un texto para tu publicación."); return; }

    setSaving(true); setError("");
    try {
      let mediaUrl = existingReel?.media_url || "";

      if (file) {
        setUploading(true);
        const ext  = file.name.split(".").pop().toLowerCase();
        const path = `reels/${user.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("reels-media").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("reels-media").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
        setUploading(false);
      }

      if (isEdit) {
        const { error: updErr } = await supabase.from("reels")
          .update({ caption, media_url: mediaUrl, media_type: mediaType, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (updErr) throw updErr;
      } else {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const { error: insErr } = await supabase.from("reels")
          .insert({ 
            user_id: user.id, 
            media_url: mediaUrl, 
            media_type: mediaType, 
            caption,
            expires_at: expiresAt
          });
        if (insErr) {
          if (insErr.message?.includes("one_reel_per_user") || insErr.code === "23505")
            throw new Error("Ya tienes una publicación. Edítala desde tu historia.");
          throw insErr;
        }
      }

      onSaved();
    } catch (err) {
      console.error("[ReelModal]", err);
      setError(err.message || "Error desconocido");
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-gray-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="font-black text-white text-sm flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-pink-400" />
            {isEdit ? "Editar historia" : "Nueva historia"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-xs">{error}</div>
          )}

          {/* Media picker */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all ${
              preview ? "aspect-[9/12]" : "h-40 border-2 border-dashed border-gray-700 hover:border-pink-500/60 hover:bg-pink-500/5"
            }`}
          >
            {preview ? (
              mediaType === "video"
                ? <video src={preview} className="w-full h-full object-cover" muted loop playsInline autoPlay />
                : <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
                <Camera className="w-8 h-8" />
                <p className="text-sm font-bold">Toca para subir imagen o video</p>
                <p className="text-xs text-gray-700">JPG · PNG · MP4</p>
              </div>
            )}
            {preview && (
              <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full">Cambiar</span>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFile} />

          {/* Caption */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Descripción *</label>
            <textarea rows={3} value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="Cuéntale algo a tu audiencia..."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-400 transition-all resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={handleSave} disabled={saving || uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-black text-sm disabled:opacity-50 shadow-lg">
            {saving || uploading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> {uploading ? "Subiendo..." : "Guardando..."}</>
              : <><Check className="w-4 h-4" /> {isEdit ? "Actualizar" : "Publicar"}</>
            }
          </button>
          <button onClick={onClose} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl text-sm font-bold transition-all">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Single story bubble ──────────────────────────────────────────────────────
function StoryBubble({ reel, isOwner, onEdit, onDelete, onExpand }) {
  const videoRef = useRef(null);

  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-pointer" style={{ width: 72 }}>
      {/* Ring + media */}
      <div
        className="p-[2px] rounded-full"
        style={{ background: "linear-gradient(135deg,#f43f5e,#a855f7,#3b82f6)" }}
        onClick={() => onExpand(reel)}
        onMouseEnter={() => { if (reel.media_type === "video" && videoRef.current) videoRef.current.play().catch(() => {}); }}
        onMouseLeave={() => { if (videoRef.current) videoRef.current.pause(); }}
      >
        <div className="p-[2px] rounded-full bg-gray-950">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-gray-800 relative">
            {reel.media_type === "video"
              ? <video ref={videoRef} src={reel.media_url} className="w-full h-full object-cover" muted loop playsInline preload="metadata" />
              : <img src={reel.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            }
            {reel.media_type === "video" && (
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                <Play className="w-2 h-2 text-white fill-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name */}
      <span className="text-[9px] text-gray-400 font-medium text-center leading-tight max-w-full truncate px-1">
        {isOwner ? "Tú" : (reel.author_name || "Cliente")}
      </span>

      {/* Owner controls */}
      {isOwner && (
        <div className="flex gap-1">
          <button onClick={onEdit} className="w-5 h-5 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center hover:bg-blue-500/40 transition-colors">
            <Edit3 className="w-2.5 h-2.5 text-blue-400" />
          </button>
          <button onClick={onDelete} className="w-5 h-5 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center hover:bg-red-500/40 transition-colors">
            <Trash2 className="w-2.5 h-2.5 text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Full-screen Story Viewer ─────────────────────────────────────────────────
function StoryViewer({ reel, onClose, onLike, liked }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full max-w-sm h-full max-h-screen" onClick={e => e.stopPropagation()}>
        {/* Progress bar (static for now) */}
        <div className="absolute top-3 left-3 right-3 z-10 h-0.5 bg-white/20 rounded-full">
          <div className="h-full bg-white rounded-full w-full" style={{ animation: "storyProgress 5s linear forwards" }} />
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-7 right-3 z-10 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white">
          <X className="w-4 h-4" />
        </button>

        {/* Author */}
        <div className="absolute top-8 left-3 z-10 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden">
            {reel.media_type === "image" && <img src={reel.media_url} className="w-full h-full object-cover" alt="" />}
          </div>
          <span className="text-white text-xs font-bold drop-shadow">{reel.author_name || "Cliente"}</span>
        </div>

        {/* Media */}
        <div className="w-full h-full flex items-center justify-center bg-black">
          {reel.media_type === "video"
            ? <video src={reel.media_url} className="w-full h-full object-contain" autoPlay muted loop playsInline preload="auto" />
            : <img src={reel.media_url} alt="" className="w-full h-full object-contain" />
          }
        </div>

        {/* Caption + like */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
          {reel.caption && <p className="text-white text-sm font-medium mb-3">{reel.caption}</p>}
          <button onClick={() => onLike(reel.id)} className="flex items-center gap-2">
            <Heart className={`w-6 h-6 transition-all ${liked ? "text-pink-500 fill-pink-500 scale-110" : "text-white"}`} />
            <span className="text-white text-sm font-bold">{reel.likes_count ?? 0}</span>
          </button>
        </div>
      </div>
      <style>{`@keyframes storyProgress { from{width:0%} to{width:100%} }`}</style>
    </div>
  );
}

// ─── Main ReelsStrip ──────────────────────────────────────────────────────────
export default function ReelsStrip() {
  const { user, role } = useAuth();
  const isPromoter = role === "promoter" || role === "admin";

  const [reels,     setReels]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [myReel,    setMyReel]    = useState(null);
  const [modal,     setModal]     = useState(null);  // null | "create" | "edit"
  const [viewer,    setViewer]    = useState(null);  // reel object currently viewed
  const [likedIds,  setLikedIds]  = useState(new Set());

  useEffect(() => { fetchReels(); }, [user]);

  // ─────────────────────────────────────────────────────────
  const fetchReels = async () => {
    setLoading(true);
    try {
      // Fetch reels
      const { data: reelsData, error: reelsErr } = await supabase
        .from("reels")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(30);

      if (reelsErr) throw reelsErr;
      const list = reelsData || [];

      // Fetch author names in one query
      if (list.length > 0) {
        const userIds = [...new Set(list.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);

        const profileMap = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p.name || p.email?.split("@")[0] || "Cliente"; });

        const enriched = list.map(r => ({ ...r, author_name: profileMap[r.user_id] || "Cliente" }));
        setReels(enriched);
        setMyReel(enriched.find(r => r.user_id === user?.id) || null);
      } else {
        setReels([]);
        setMyReel(null);
      }

      // Fetch my likes
      if (user?.id) {
        const { data: likesData } = await supabase
          .from("reel_likes").select("reel_id").eq("user_id", user.id);
        setLikedIds(new Set((likesData || []).map(l => l.reel_id)));
      }
    } catch (err) {
      console.error("[ReelsStrip] fetchReels:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  const handleLike = useCallback(async (reelId) => {
    if (!user?.id) return;
    const isLiked = likedIds.has(reelId);

    // Optimistic UI
    setLikedIds(prev => { const n = new Set(prev); isLiked ? n.delete(reelId) : n.add(reelId); return n; });
    setReels(prev => prev.map(r => r.id === reelId ? { ...r, likes_count: (r.likes_count || 0) + (isLiked ? -1 : 1) } : r));
    if (viewer?.id === reelId) setViewer(v => ({ ...v, likes_count: (v.likes_count || 0) + (isLiked ? -1 : 1) }));

    try {
      if (isLiked) {
        await supabase.from("reel_likes").delete().eq("reel_id", reelId).eq("user_id", user.id);
      } else {
        await supabase.from("reel_likes").insert({ reel_id: reelId, user_id: user.id });
      }
      // Sync count
      const newCount = (reels.find(r => r.id === reelId)?.likes_count || 0) + (isLiked ? -1 : 1);
      await supabase.from("reels").update({ likes_count: Math.max(0, newCount) }).eq("id", reelId);
    } catch (err) { console.error("[ReelsStrip] like:", err); }
  }, [user, likedIds, reels, viewer]);

  // ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm("¿Eliminar tu historia?")) return;
    try {
      await supabase.from("reels").delete().eq("user_id", user.id);
      await fetchReels();
    } catch (err) {
      console.error("[ReelsStrip] delete:", err);
      alert("Error: " + err.message);
    }
  };

  // ── RENDER ───────────────────────────────────────────────
  // Always show section to avoid confusing disappearing UI
  return (
    <div className="space-y-2">
      {/* Section label */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          ✨ Historias
          {!loading && reels.length > 0 && (
            <span className="text-gray-600 normal-case font-medium">{reels.length}</span>
          )}
        </span>
        {isPromoter && (
          <button
            onClick={() => setModal(myReel ? "edit" : "create")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-pink-500/25 text-pink-400 rounded-full text-[10px] font-black hover:from-pink-500/25 hover:to-purple-500/25 transition-all"
          >
            {myReel ? <><Edit3 className="w-2.5 h-2.5" /> Editar mi historia</> : <><Plus className="w-2.5 h-2.5" /> Publicar historia</>}
          </button>
        )}
      </div>

      {/* Horizontal scroll strip */}
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">

          {/* ── ADD BUTTON (promoters only) ── */}
          {isPromoter && (
            <div className="flex-shrink-0 flex flex-col items-center gap-1.5" style={{ width: 72 }}>
              <button
                onClick={() => setModal(myReel ? "edit" : "create")}
                className="relative w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-dashed border-pink-500/50 hover:border-pink-400 transition-all bg-gray-900/80 flex items-center justify-center group overflow-hidden"
              >
                {myReel ? (
                  <>
                    {myReel.media_type === "video"
                      ? <video src={myReel.media_url} className="w-full h-full object-cover" muted preload="none" />
                      : <img src={myReel.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    }
                    <div className="absolute inset-0 bg-pink-500/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Edit3 className="w-4 h-4 text-white" />
                    </div>
                  </>
                ) : (
                  <Plus className="w-5 h-5 text-pink-400 group-hover:scale-125 transition-transform" />
                )}
              </button>
              <span className="text-[9px] text-pink-400 font-bold text-center">
                {myReel ? "Mi historia" : "Agregar"}
              </span>
              {myReel && (
                <div className="flex gap-1">
                  <button onClick={() => setModal("edit")} className="w-5 h-5 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center hover:bg-blue-500/40 transition-colors">
                    <Edit3 className="w-2.5 h-2.5 text-blue-400" />
                  </button>
                  <button onClick={handleDelete} className="w-5 h-5 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center hover:bg-red-500/40 transition-colors">
                    <Trash2 className="w-2.5 h-2.5 text-red-400" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── LOADING ── */}
          {loading && [...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5" style={{ width: 72 }}>
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-800 animate-pulse" />
              <div className="w-10 h-2 bg-gray-800 rounded animate-pulse" />
            </div>
          ))}

          {/* ── REELS LIST ── */}
          {!loading && reels
            .filter(reel => new Date(reel.expires_at) > new Date())
            .map(reel => (
            <StoryBubble
              key={reel.id}
              reel={reel}
              isOwner={reel.user_id === user?.id && isPromoter}
              onEdit={() => setModal("edit")}
              onDelete={handleDelete}
              onExpand={(r) => setViewer(r)}
            />
          ))}

          {/* ── EMPTY ── */}
          {!loading && reels.length === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl flex-shrink-0">
              <span className="text-[11px] text-gray-600">
                {isPromoter ? "Sé el primero en publicar una historia 👆" : "Aún no hay historias de clientes"}
              </span>
            </div>
          )}
        </div>

        {/* Fade right edge */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-gray-950 to-transparent" />
      </div>

      {/* ── MODAL (create/edit) ── */}
      {modal && (
        <ReelModal
          existingReel={modal === "edit" ? myReel : null}
          onClose={() => setModal(null)}
          onSaved={() => { fetchReels(); setModal(null); }}
        />
      )}

      {/* ── STORY VIEWER ── */}
      {viewer && (
        <StoryViewer
          reel={viewer}
          liked={likedIds.has(viewer.id)}
          onLike={handleLike}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
