import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  Disc3,
  Sparkles,
  Mic,
  Users,
  Layout,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Bookmark,
  Send,
  MoreVertical,
  MoreHorizontal,
  Search,
  Plus,
  Music2,
  Camera,
  Film,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { VideoFormat, SubtitleTheme, SocialPlatform } from '../types';

interface ShortsPhonePreviewProps {
  videoId?: string;
  videoUrl?: string;
  videoSrc?: string;
  thumbnailUrl?: string;
  startSeconds: number;
  endSeconds: number;
  format: VideoFormat;
  subtitleTheme?: SubtitleTheme;
  activeSpeaker?: string;
  overlayTitle?: string;
  hook?: string;
  subtitles?: string[];
  initialPlatform?: SocialPlatform;
  onPlatformChange?: (platform: SocialPlatform) => void;
  channelName?: string;
  speaker1X?: number;
  speaker1Y?: number;
  speaker2X?: number;
  speaker2Y?: number;
  zoom?: number;
}

// Fallback to verified 100% active YouTube video if videoId is dead/empty
const RELIABLE_FALLBACK_VIDEO_ID = 'B57eOqeLVfc';

export const ShortsPhonePreview: React.FC<ShortsPhonePreviewProps> = ({
  videoId,
  videoUrl,
  videoSrc,
  thumbnailUrl,
  startSeconds,
  endSeconds,
  format,
  subtitleTheme = 'hormozi',
  activeSpeaker,
  overlayTitle = 'O MOMENTO QUE MUDOU TUDO 🚨',
  hook,
  subtitles = ['ISSO ACONTECEU', 'QUANDO MENOS ESPERAVA', 'PRESTE ATENÇÃO NISSO'],
  initialPlatform = 'youtube',
  onPlatformChange,
  channelName = 'cortes_virais',
  speaker1X = 24,
  speaker1Y = 44,
  speaker2X = 76,
  speaker2Y = 44,
  zoom = 1.25,
}) => {
  const [platform, setPlatform] = useState<SocialPlatform>(initialPlatform);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'embed' | 'poster'>('embed');
  const [showSafeZones, setShowSafeZones] = useState<boolean>(false);
  const [activeDynamicCam, setActiveDynamicCam] = useState<1 | 2>(2);
  const duration = Math.max(1, endSeconds - startSeconds);

  // Sync initial platform if parent prop changes
  useEffect(() => {
    if (initialPlatform) {
      setPlatform(initialPlatform);
    }
  }, [initialPlatform]);

  // Automatic camera switcher for Klap / Opus Clip 'dynamic_reframe' mode
  useEffect(() => {
    if (format !== 'dynamic_reframe') return;
    const camInterval = setInterval(() => {
      setActiveDynamicCam((prev) => (prev === 1 ? 2 : 1));
    }, 4500);
    return () => clearInterval(camInterval);
  }, [format]);

  const handleSetPlatform = (p: SocialPlatform) => {
    setPlatform(p);
    onPlatformChange?.(p);
  };

  // Resolve valid video ID
  let safeVideoId = videoId;
  if (!safeVideoId || safeVideoId === 'y7G5J2_7c5w' || safeVideoId === 'b5m4yBkJw58') {
    const match = videoUrl?.match(/(?:v=|\/v\/|embed\/|youtu\.be\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
    safeVideoId = match?.[1] || RELIABLE_FALLBACK_VIDEO_ID;
  }

  // High definition thumbnail fallback
  const fallbackThumb =
    thumbnailUrl ||
    `https://img.youtube.com/vi/${safeVideoId}/maxresdefault.jpg`;

  // Subtitle animator loop
  useEffect(() => {
    if (!subtitles || subtitles.length === 0) return;
    const interval = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % subtitles.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [subtitles]);

  // Primary YouTube No-Cookie embed URL (plays audio when unmuted)
  const primaryEmbedUrl = `https://www.youtube-nocookie.com/embed/${safeVideoId}?autoplay=1&mute=${
    isMuted ? '1' : '0'
  }&start=${startSeconds}&end=${endSeconds}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;

  // Secondary YouTube embed URL: ALWAYS MUTED (mute=1) to eliminate 100% of audio echo in split_screen and vertical_blur!
  const mutedEmbedUrl = `https://www.youtube-nocookie.com/embed/${safeVideoId}?autoplay=1&mute=1&start=${startSeconds}&end=${endSeconds}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;

  /**
   * Computes exact 1:1 distortion-free CSS positioning for a 16:9 YouTube iframe inside a 9:16 or 9:8 crop container.
   * By keeping aspectRatio: '16 / 9' on the iframe and translating by (-X%, -Y%) from the viewport center (50%, 50%),
   * YouTube never adds internal black bars and faces are never stretched!
   */
  const getSmartCropIframeStyle = (focusX: number, focusY: number, zoomLevel: number = 1.25): React.CSSProperties => {
    const clampedX = Math.max(18, Math.min(82, focusX));
    const clampedY = Math.max(22, Math.min(78, focusY));
    const safeZoom = Math.max(1.0, Math.min(1.8, zoomLevel));
    return {
      position: 'absolute',
      top: '50%',
      left: '50%',
      height: `${Math.round(108 * safeZoom)}%`,
      width: 'auto',
      aspectRatio: '16 / 9',
      maxWidth: 'none',
      transform: `translate(-${clampedX}%, -${clampedY}%)`,
      pointerEvents: 'none',
    };
  };

  // Dynamic social counters per platform
  const stats = {
    youtube: { likes: '184 mil', comments: '2.418', shares: 'Compartilhar' },
    tiktok: { likes: '428.5K', comments: '3,892', bookmarks: '78.4K', shares: '15.2K' },
    instagram: { likes: '92,4 mil', comments: '1.294', shares: '19,3 mil' },
  };

  return (
    <div className="relative flex flex-col items-center select-none animate-fadeIn">
      {/* 1. Multi-Platform UI Selector Bar */}
      <div className="mb-3.5 flex items-center gap-1.5 p-1 bg-zinc-950/90 border border-zinc-800 rounded-2xl shadow-xl backdrop-blur-md">
        <button
          onClick={() => handleSetPlatform('youtube')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            platform === 'youtube'
              ? 'bg-red-600 text-white shadow-md shadow-red-950/50 scale-[1.02]'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
          title="Ver prévia com a interface oficial do YouTube Shorts"
        >
          <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
          <span>YouTube Shorts</span>
        </button>

        <button
          onClick={() => handleSetPlatform('tiktok')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            platform === 'tiktok'
              ? 'bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/50 shadow-md shadow-cyan-950/40 scale-[1.02]'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
          title="Ver prévia com a interface oficial do TikTok (Para Você)"
        >
          <span>🎵 TikTok</span>
        </button>

        <button
          onClick={() => handleSetPlatform('instagram')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            platform === 'instagram'
              ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white shadow-md shadow-pink-950/50 scale-[1.02]'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
          title="Ver prévia com a interface oficial do Instagram Reels"
        >
          <span>📸 Reels</span>
        </button>
      </div>

      {/* 2. Smartphone Outer Chassis */}
      <div className="relative w-[300px] sm:w-[324px] h-[610px] sm:h-[650px] bg-[#090a0f] rounded-[46px] p-3 shadow-[0_25px_70px_-15px_rgba(112,0,255,0.45)] border-[6px] border-zinc-800 ring-1 ring-white/10 overflow-hidden">
        
        {/* Dynamic Island / iPhone Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-between px-3 shadow-inner">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700/60" />
          <div className="w-2 h-2 rounded-full bg-blue-900/40" />
        </div>

        {/* Screen Area (9:16 Aspect) */}
        <div className="relative w-full h-full rounded-[36px] overflow-hidden bg-black flex flex-col items-center justify-center">
          
          {/* OPTIONAL SAFE ZONE GUIDES OVERLAY (Opus Clip / Vizard Standard) */}
          {showSafeZones && (
            <div className="absolute inset-0 z-40 pointer-events-none">
              <div className="absolute top-14 bottom-24 left-3 right-14 border-2 border-dashed border-emerald-400/70 rounded-xl flex items-start justify-start p-1.5">
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 text-[8px] font-mono font-bold uppercase">
                  Zona Segura de Rosto & Legenda
                </span>
              </div>
            </div>
          )}

          {/* TOP STATUS / PLATFORM HEADER OVERLAY */}
          {platform === 'youtube' && (
            <div className="absolute top-11 left-3 right-3 z-30 flex items-center justify-between text-white pointer-events-none drop-shadow">
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-red-600 flex items-center justify-center text-[10px] font-black">
                  ▶
                </span>
                <span className="font-extrabold text-xs tracking-tight">Shorts</span>
              </div>
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-white" />
                <MoreVertical className="w-4 h-4 text-white" />
              </div>
            </div>
          )}

          {platform === 'tiktok' && (
            <div className="absolute top-11 left-4 right-4 z-30 flex items-center justify-between text-white pointer-events-none drop-shadow">
              <div className="w-4" />
              <div className="flex items-center gap-3.5 text-xs font-bold">
                <span className="text-zinc-400">Seguindo</span>
                <div className="relative">
                  <span className="text-white font-extrabold">Para Você</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full" />
                </div>
              </div>
              <Search className="w-4 h-4 text-white" />
            </div>
          )}

          {platform === 'instagram' && (
            <div className="absolute top-11 left-4 right-4 z-30 flex items-center justify-between text-white pointer-events-none drop-shadow">
              <span className="text-sm font-black tracking-tight flex items-center gap-1">
                Reels
              </span>
              <Camera className="w-4 h-4 text-white" />
            </div>
          )}

          {/* VIDEO LAYER: REAL VIDEO / EMBED / POSTER SIMULATOR */}
          {videoSrc ? (
            /* Direct rendered MP4 playback */
            <div className="relative z-10 w-full h-full overflow-hidden bg-black flex items-center justify-center">
              <video
                src={videoSrc}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          ) : previewMode === 'embed' ? (
            /* YouTube Embed with Distortion-Free 16:9 Smart Crop & Single Audio Stream */
            <>
              {format === 'vertical_blur' && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <iframe
                    src={mutedEmbedUrl}
                    title="Background Blur (Muted)"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={getSmartCropIframeStyle(50, 50, 1.35)}
                    className="filter blur-xl opacity-55"
                    allow="autoplay; encrypted-media"
                  />
                </div>
              )}

              {format === 'split_screen' ? (
                /* Dual Camera Vertical Stack (Exact 9:8 per half, Zero Stretching, Single Audio Track) */
                <div className="relative z-10 w-full h-full flex flex-col">
                  {/* Top: Convidado (Speaker 2) - Primary Audio Source */}
                  <div className="relative w-full h-1/2 overflow-hidden bg-black border-b border-yellow-400/80 shadow-md">
                    <iframe
                      src={primaryEmbedUrl}
                      title="Guest Camera (Top - Primary Audio)"
                      referrerPolicy="strict-origin-when-cross-origin"
                      style={getSmartCropIframeStyle(speaker2X, speaker2Y, zoom)}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    />
                    <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-yellow-400/40 text-[9px] font-black text-yellow-300 flex items-center gap-1 shadow">
                      <Mic className="w-2.5 h-2.5 text-yellow-400" />
                      <span>CÂMERA 2 • X:{speaker2X}%</span>
                    </div>
                  </div>

                  {/* High Contrast Divider Bar */}
                  <div className="relative w-full h-[3px] bg-gradient-to-r from-yellow-400 via-pink-500 to-yellow-400 z-20 shadow-[0_0_8px_rgba(250,204,21,0.8)] flex items-center justify-center">
                    <span className="px-2 py-0.5 rounded-full bg-black text-[7px] font-black tracking-widest text-white border border-yellow-400/50 uppercase shadow">
                      IA DUAL CAM 9:8 ⚡ SEM ECO
                    </span>
                  </div>

                  {/* Bottom: Host (Speaker 1) - ALWAYS MUTED to prevent Audio Echo */}
                  <div className="relative w-full h-1/2 overflow-hidden bg-black">
                    <iframe
                      src={mutedEmbedUrl}
                      title="Host Camera (Bottom - Muted)"
                      referrerPolicy="strict-origin-when-cross-origin"
                      style={getSmartCropIframeStyle(speaker1X, speaker1Y, zoom)}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    />
                    <div className="absolute top-2 left-3 z-20 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-cyan-400/40 text-[9px] font-black text-cyan-300 flex items-center gap-1 shadow">
                      <Mic className="w-2.5 h-2.5 text-cyan-400" />
                      <span>CÂMERA 1 • X:{speaker1X}%</span>
                    </div>
                  </div>
                </div>
              ) : format === 'dynamic_reframe' ? (
                /* Klap / Opus Clip Auto-Reframe: Smoothly switches between Speaker 2 and Speaker 1 */
                <div className="relative z-10 w-full h-full overflow-hidden bg-black">
                  <iframe
                    src={primaryEmbedUrl}
                    title="Dynamic Auto-Reframe Preview"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{
                      ...getSmartCropIframeStyle(
                        activeDynamicCam === 2 ? speaker2X : speaker1X,
                        activeDynamicCam === 2 ? speaker2Y : speaker1Y,
                        zoom
                      ),
                      transition: 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  />
                  <div className="absolute top-11 left-3 z-20 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-pink-500/50 text-[9px] font-bold text-pink-300 flex items-center gap-1.5 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
                    <span>
                      IA AUTO-REFRAME: {activeDynamicCam === 2 ? `CÂM 2 (${speaker2X}%)` : `CÂM 1 (${speaker1X}%)`}
                    </span>
                  </div>
                </div>
              ) : format === 'speaker_left' ? (
                <div className="relative z-10 w-full h-full overflow-hidden bg-black">
                  <iframe
                    src={primaryEmbedUrl}
                    title="Left Speaker Preview"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={getSmartCropIframeStyle(speaker1X, speaker1Y, zoom)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  />
                  <div className="absolute top-12 left-3 z-20 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-cyan-400/40 text-[9px] font-bold text-cyan-300 flex items-center gap-1">
                    <Mic className="w-2.5 h-2.5 text-cyan-400" />
                    <span>FOCO CÂM 1 (X:{speaker1X}%, Y:{speaker1Y}%)</span>
                  </div>
                </div>
              ) : format === 'speaker_right' ? (
                <div className="relative z-10 w-full h-full overflow-hidden bg-black">
                  <iframe
                    src={primaryEmbedUrl}
                    title="Right Speaker Preview"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={getSmartCropIframeStyle(speaker2X, speaker2Y, zoom)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  />
                  <div className="absolute top-12 left-3 z-20 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-yellow-400/40 text-[9px] font-bold text-yellow-300 flex items-center gap-1">
                    <Mic className="w-2.5 h-2.5 text-yellow-400" />
                    <span>FOCO CÂM 2 (X:{speaker2X}%, Y:{speaker2Y}%)</span>
                  </div>
                </div>
              ) : format === 'vertical_crop' || format === 'speaker_center' ? (
                <div className="relative z-10 w-full h-full overflow-hidden bg-black">
                  <iframe
                    src={primaryEmbedUrl}
                    title="Center Speaker 9:16 Preview"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={getSmartCropIframeStyle(50, 45, zoom)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  />
                </div>
              ) : (
                <div
                  className={`relative z-10 w-full transition-all duration-300 overflow-hidden ${
                    format === 'vertical_blur'
                      ? 'aspect-video w-full shadow-2xl border-y border-white/10'
                      : format === 'square'
                      ? 'aspect-square w-full shadow-2xl'
                      : 'aspect-video w-full shadow-2xl'
                  }`}
                >
                  <iframe
                    src={primaryEmbedUrl}
                    title="YouTube Shorts Preview"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={
                      format === 'square'
                        ? getSmartCropIframeStyle(50, 50, 1.05)
                        : { width: '100%', height: '100%' }
                    }
                    className="w-full h-full object-cover pointer-events-auto"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}
            </>
          ) : (
            /* Realistic High-Res Simulation Poster Mode */
            <div className="relative z-10 w-full h-full overflow-hidden bg-zinc-950 flex items-center justify-center">
              <img
                src={fallbackThumb}
                alt="Prévia em Alta Definição"
                className="w-full h-full object-cover opacity-90 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none" />
              {/* Animated Audio Equalizer Waveform */}
              <div className="absolute top-28 flex items-end gap-1 pointer-events-none opacity-80">
                <span className="w-1.5 h-6 bg-pink-500 rounded-full animate-bounce duration-500" />
                <span className="w-1.5 h-10 bg-yellow-400 rounded-full animate-bounce duration-700" />
                <span className="w-1.5 h-14 bg-cyan-400 rounded-full animate-bounce duration-300" />
                <span className="w-1.5 h-8 bg-purple-500 rounded-full animate-bounce duration-600" />
                <span className="w-1.5 h-12 bg-pink-400 rounded-full animate-bounce duration-400" />
              </div>
            </div>
          )}

          {/* OVERLAY: TOP IMPACT HEADLINE (Hormozi / Viral Hook) */}
          {overlayTitle && (
            <div className="absolute top-16 left-3 right-3 z-30 pointer-events-none flex flex-col items-center">
              <div className="bg-black/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-yellow-400/60 shadow-lg shadow-black/90 text-center animate-bounce duration-1000">
                <span className="text-yellow-400 font-black text-xs sm:text-sm tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                  {overlayTitle}
                </span>
              </div>
            </div>
          )}

          {/* ACTIVE SPEAKER BADGE */}
          {activeSpeaker && activeSpeaker !== 'ambos' && (
            <div className="absolute top-28 left-3 z-30 pointer-events-none">
              <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-white/20 text-[9px] font-bold text-zinc-200 flex items-center gap-1 shadow">
                <Mic className="w-2.5 h-2.5 text-pink-400" />
                {activeSpeaker === 'host' ? 'Host Falando' : 'Convidado Falando'}
              </span>
            </div>
          )}

          {/* OVERLAY: CENTER DYNAMIC SUBTITLES ANIMATION */}
          {subtitles && subtitles.length > 0 && (
            <div className="absolute bottom-28 left-4 right-4 z-30 pointer-events-none text-center">
              {subtitleTheme === 'hormozi' && (
                <div className="inline-block bg-black/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border-2 border-yellow-400 shadow-[0_4px_20px_rgba(250,204,21,0.5)]">
                  <p className="font-black text-sm sm:text-base tracking-wider text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                    <span className="text-yellow-400 font-black underline decoration-yellow-400 decoration-2">
                      {subtitles[activeWordIndex] || hook || 'PRESTE MUITA ATENÇÃO'}
                    </span>
                  </p>
                </div>
              )}

              {subtitleTheme === 'beast' && (
                <div className="inline-block bg-black/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border-2 border-green-400 shadow-[0_4px_20px_rgba(34,197,94,0.5)]">
                  <p className="font-black text-sm sm:text-base tracking-wider text-green-400 uppercase drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">
                    <span className="text-white mr-1 font-black">💥</span>
                    {subtitles[activeWordIndex] || hook || 'PRESTE MUITA ATENÇÃO'}
                  </p>
                </div>
              )}

              {subtitleTheme === 'cyberpunk' && (
                <div className="inline-block bg-[#0f051d]/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border-2 border-pink-500 shadow-[0_4px_20px_rgba(236,72,153,0.5)]">
                  <p className="font-black text-sm sm:text-base tracking-wider uppercase bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent drop-shadow">
                    <span className="mr-1 text-pink-400">⚡</span>
                    {subtitles[activeWordIndex] || hook || 'PRESTE MUITA ATENÇÃO'}
                  </p>
                </div>
              )}

              {subtitleTheme === 'clean' && (
                <div className="inline-block bg-zinc-900/85 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20 shadow-md">
                  <p className="font-bold text-xs sm:text-sm tracking-wide text-zinc-100 uppercase">
                    {subtitles[activeWordIndex] || hook || 'PRESTE MUITA ATENÇÃO'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. PLATFORM-SPECIFIC OVERLAY HUD (YouTube / TikTok / Reels) */}
          {platform === 'youtube' && (
            <>
              {/* Right Sidebar - YouTube Shorts Native Controls */}
              <div className="absolute right-2.5 bottom-16 z-30 flex flex-col items-center gap-3.5 text-white">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className="flex flex-col items-center gap-0.5 group active:scale-90 transition-transform"
                >
                  <div className={`p-2 rounded-full ${isLiked ? 'bg-red-600 text-white' : 'bg-black/50 text-white'}`}>
                    <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
                  </div>
                  <span className="text-[10px] font-bold drop-shadow">{stats.youtube.likes}</span>
                </button>

                <div className="flex flex-col items-center gap-0.5">
                  <div className="p-2 rounded-full bg-black/50">
                    <ThumbsDown className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[9px] font-medium drop-shadow">Dislike</span>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                  <div className="p-2 rounded-full bg-black/50">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-bold drop-shadow">{stats.youtube.comments}</span>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                  <div className="p-2 rounded-full bg-black/50">
                    <Share2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[9px] font-bold drop-shadow">Partilhar</span>
                </div>

                <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 p-0.5 flex items-center justify-center shadow">
                  <Disc3 className="w-4 h-4 text-white animate-spin duration-3000" />
                </div>
              </div>

              {/* Bottom Info - YouTube Shorts Native Channel Bar */}
              <div className="absolute left-3 right-16 bottom-5 z-30 text-white pointer-events-none">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center font-bold text-xs text-white shadow">
                    {channelName[0]?.toUpperCase() || 'C'}
                  </div>
                  <span className="text-xs font-bold truncate">@{channelName}</span>
                  <button
                    onClick={() => setIsSubscribed(!isSubscribed)}
                    className={`pointer-events-auto px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition shadow ${
                      isSubscribed
                        ? 'bg-zinc-800 text-zinc-300'
                        : 'bg-white hover:bg-zinc-200 text-black'
                    }`}
                  >
                    {isSubscribed ? 'Inscrito' : 'Inscrever-se'}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-100 line-clamp-2 leading-tight drop-shadow font-medium">
                  {hook || 'Esse trecho vai explodir sua mente! Salve para rever depois. #Shorts'}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-300">
                  <Music2 className="w-3 h-3 text-red-400" />
                  <span className="truncate">Som original - @{channelName}</span>
                </div>
              </div>

              {/* YouTube Red Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/80 z-30">
                <div className="h-full bg-red-600 animate-pulse w-3/4" />
              </div>
            </>
          )}

          {platform === 'tiktok' && (
            <>
              {/* Right Sidebar - TikTok Native Controls */}
              <div className="absolute right-2.5 bottom-14 z-30 flex flex-col items-center gap-3.5 text-white">
                {/* TikTok Avatar with Red Plus Badge */}
                <div className="relative mb-1">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 via-pink-500 to-yellow-400 p-[1.5px]">
                    <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center font-black text-xs">
                      {channelName[0]?.toUpperCase() || 'T'}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#ff0055] text-white flex items-center justify-center text-[11px] font-bold shadow">
                    +
                  </div>
                </div>

                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className="flex flex-col items-center gap-0.5 group active:scale-90 transition-transform"
                >
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-sm">
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#ff0055] text-[#ff0055]' : 'text-white'}`} />
                  </div>
                  <span className="text-[10px] font-extrabold drop-shadow">{stats.tiktok.likes}</span>
                </button>

                <div className="flex flex-col items-center gap-0.5">
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-sm">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-extrabold drop-shadow">{stats.tiktok.comments}</span>
                </div>

                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className="flex flex-col items-center gap-0.5 group active:scale-90 transition-transform"
                >
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-sm">
                    <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
                  </div>
                  <span className="text-[10px] font-extrabold drop-shadow">{stats.tiktok.bookmarks}</span>
                </button>

                <div className="flex flex-col items-center gap-0.5">
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-sm">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-extrabold drop-shadow">{stats.tiktok.shares}</span>
                </div>

                <div className="w-7 h-7 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center animate-spin duration-3000 shadow-lg">
                  <Disc3 className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Bottom Info - TikTok Native Handle & Sound Marquee */}
              <div className="absolute left-3 right-16 bottom-4 z-30 text-white pointer-events-none">
                <span className="text-xs font-black block mb-1 drop-shadow">@{channelName}</span>
                <p className="text-[11px] text-zinc-100 line-clamp-2 leading-tight drop-shadow font-normal">
                  {hook || 'Esse momento vai explodir sua mente! 🤯 #fyp #viral #foryou #cortes #reflexao'}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-200">
                  <Music2 className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span className="truncate">♫ som original - @{channelName}</span>
                </div>
              </div>

              {/* TikTok Thin White Progress Line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20 z-30">
                <div className="h-full bg-white w-2/3" />
              </div>
            </>
          )}

          {platform === 'instagram' && (
            <>
              {/* Right Sidebar - Instagram Reels Native Controls */}
              <div className="absolute right-2.5 bottom-14 z-30 flex flex-col items-center gap-3.5 text-white">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className="flex flex-col items-center gap-0.5 group active:scale-90 transition-transform"
                >
                  <div className="p-2 rounded-full bg-black/30 backdrop-blur-sm">
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  </div>
                  <span className="text-[10px] font-bold drop-shadow">{stats.instagram.likes}</span>
                </button>

                <div className="flex flex-col items-center gap-0.5">
                  <div className="p-2 rounded-full bg-black/30 backdrop-blur-sm">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold drop-shadow">{stats.instagram.comments}</span>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                  <div className="p-2 rounded-full bg-black/30 backdrop-blur-sm">
                    <Send className="w-5 h-5 text-white -rotate-12" />
                  </div>
                  <span className="text-[10px] font-bold drop-shadow">{stats.instagram.shares}</span>
                </div>

                <div className="p-2 rounded-full bg-black/30 backdrop-blur-sm">
                  <MoreHorizontal className="w-5 h-5 text-white" />
                </div>

                <div className="w-6 h-6 rounded border border-white/60 bg-zinc-800 p-0.5 flex items-center justify-center shadow">
                  <Disc3 className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Bottom Info - Instagram Reels Profile & Audio Tag */}
              <div className="absolute left-3 right-16 bottom-4 z-30 text-white pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-600 to-purple-600 p-[1.5px]">
                    <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center text-[10px] font-bold">
                      {channelName[0]?.toUpperCase() || 'I'}
                    </div>
                  </div>
                  <span className="text-xs font-bold truncate">@{channelName}</span>
                  <span className="text-[10px] text-zinc-400">•</span>
                  <button className="pointer-events-auto px-2 py-0.5 rounded-lg border border-white/60 text-[10px] font-semibold hover:bg-white/10 transition">
                    Seguir
                  </button>
                </div>
                <p className="text-[11px] text-zinc-100 line-clamp-2 leading-tight drop-shadow font-normal">
                  {hook || 'A verdade nua e crua sobre consistência. Compartilhe com quem precisa ouvir isso!'}
                </p>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-[10px] text-zinc-200">
                  <Music2 className="w-2.5 h-2.5 text-pink-400" />
                  <span className="truncate">Áudio original • @{channelName}</span>
                </div>
              </div>

              {/* Instagram Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20 z-30">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-3/5" />
              </div>
            </>
          )}

        </div>
      </div>

      {/* 4. Bottom Controls Bar: Sound, Mode Toggle & Duration */}
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 p-2 bg-zinc-950/90 border border-zinc-800 rounded-2xl shadow-xl max-w-sm">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition shadow-sm"
          title={isMuted ? 'Ativar Áudio do Vídeo' : 'Mutar Áudio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span>{isMuted ? 'Mudo' : 'Com Som'}</span>
        </button>

        <button
          onClick={() => setPreviewMode(previewMode === 'embed' ? 'poster' : 'embed')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
            previewMode === 'embed'
              ? 'bg-purple-950/50 border-purple-500/40 text-purple-300'
              : 'bg-yellow-950/50 border-yellow-500/40 text-yellow-300'
          }`}
          title="Alternar entre Player de Vídeo e Modo Simulação Estúdio HD"
        >
          {previewMode === 'embed' ? <Film className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
          <span>{previewMode === 'embed' ? 'Player Web' : 'Modo Estúdio'}</span>
        </button>

        <button
          onClick={() => setShowSafeZones(!showSafeZones)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
            showSafeZones
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
          }`}
          title="Mostrar ou ocultar as guias de Zona Segura do TikTok / Shorts / Reels"
        >
          <Layout className="w-3.5 h-3.5" />
          <span>Zona Segura</span>
        </button>

        <div className="text-xs text-zinc-300 px-2 font-mono flex items-center gap-1">
          <span className="text-pink-400 font-bold">{duration}s</span>
          <span className="text-zinc-500">corte</span>
        </div>
      </div>
    </div>
  );
};
