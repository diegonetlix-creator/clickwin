import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/supabase";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * FeedBanner — Public-facing carousel banner.
 * Fetches the currently active banner from Supabase and renders
 * a full-featured auto-playing carousel with Stories-style progress bars.
 */
export default function FeedBanner() {
  const [banner, setBanner] = useState(null);
  const [items, setItems]   = useState([]);
  const [idx, setIdx]       = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef(null);
  const touchStartRef = useRef(null);

  useEffect(() => {
    fetchActiveBanner();
  }, []);

  const fetchActiveBanner = async () => {
    try {
      const { data, error } = await supabase
        .from("feed_banners")
        .select("*, feed_banner_items(*)")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return; // no active banner, render nothing

      setBanner(data);
      const sorted = [...(data.feed_banner_items || [])].sort((a, b) => a.position - b.position);
      setItems(sorted);
      setLoaded(true);
    } catch (err) {
      console.error("[FeedBanner] fetch:", err);
    }
  };

  const goTo = useCallback((i) => {
    if (items.length === 0) return;
    setIdx(((i % items.length) + items.length) % items.length);
  }, [items.length]);

  // Autoplay
  useEffect(() => {
    if (items.length <= 1 || paused) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setIdx(prev => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [items.length, paused]);

  // Touch / swipe support
  const onTouchStart = (e) => { touchStartRef.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStartRef.current === null) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goTo(idx + (diff > 0 ? 1 : -1));
    touchStartRef.current = null;
  };

  // Nothing to show
  if (!loaded || !banner || items.length === 0) return null;

  const cur = items[idx];

  return (
    <div className="feed-gradient shadow-2xl overflow-hidden">
      <div className="feed-gradient-inner overflow-hidden">
        <div
          className="relative select-none"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* ── MEDIA ── */}
          <div className="relative aspect-[16/8] bg-black">
            {cur.media_type === "video" ? (
              <video
                key={cur.id}
                src={cur.media_url}
                className="w-full h-full object-cover"
                autoPlay loop muted playsInline preload="metadata"
              />
            ) : (
              <img
                key={cur.id}
                src={cur.media_url}
                alt={banner.title}
                className="w-full h-full object-cover transition-opacity duration-700"
                loading="lazy"
              />
            )}

            {/* Gradient overlays for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
          </div>

          {/* ── STORIES PROGRESS BARS ── */}
          {items.length > 1 && (
            <div className="absolute top-0 left-0 right-0 flex gap-1 p-2">
              {items.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 bg-white/25 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={
                      i < idx     ? { width: "100%" }
                      : i === idx ? { width: "0%", animation: paused ? "none" : "feedBannerProgress 5s linear forwards" }
                      :              { width: "0%" }
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── TEXT OVERLAY ── */}
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 space-y-1.5">
            {banner.title && (
              <h2 className="text-xl md:text-4xl font-black text-white leading-tight drop-shadow-lg">
                {banner.title}
              </h2>
            )}
            {banner.subtitle && (
              <p className="text-xs md:text-base text-white/80 font-medium max-w-lg drop-shadow">
                {banner.subtitle}
              </p>
            )}
            {banner.cta_text && (
              <div className="pt-2">
                <a
                  href={banner.cta_url || "#"}
                  className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs md:text-sm px-5 md:px-7 py-2.5 rounded-full shadow-lg shadow-yellow-400/20 transition-all hover:scale-105 active:scale-95"
                >
                  {banner.cta_text}
                </a>
              </div>
            )}
          </div>

          {/* ── NAVIGATION ARROWS ── */}
          {items.length > 1 && (
            <>
              <button
                onClick={() => goTo(idx - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all hover:scale-110 active:scale-90"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => goTo(idx + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all hover:scale-110 active:scale-90"
                aria-label="Siguiente"
              >
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </>
          )}

          {/* ── DOTS INDICATOR ── */}
          {items.length > 1 && (
            <div className="absolute bottom-4 right-5 flex gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === idx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* ── PAUSE ICON ── */}
          {paused && items.length > 1 && (
            <div className="absolute top-4 right-3 w-6 h-6 bg-black/40 rounded-full flex items-center justify-center gap-0.5">
              <div className="w-0.5 h-2.5 bg-white rounded-full" />
              <div className="w-0.5 h-2.5 bg-white rounded-full" />
            </div>
          )}

          <style>{`
            @keyframes feedBannerProgress {
              from { width: 0% }
              to   { width: 100% }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
