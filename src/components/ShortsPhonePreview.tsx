import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Heart, MessageCircle, Share2, Disc3, Sparkles } from 'lucide-react';
import { VideoFormat } from '../types';

interface ShortsPhonePreviewProps {
  videoId: string;
  startSeconds: number;
  endSeconds: number;
  format: VideoFormat;
  overlayTitle?: string;
  hook?: string;
  subtitles?: string[];
}

export const ShortsPhonePreview: React.FC<ShortsPhonePreviewProps> = ({
  videoId,
  startSeconds,
  endSeconds,
  format,
  overlayTitle = 'O MOMENTO QUE MUDOU TUDO 🚨',
  hook,
  subtitles = ['ISSO ACONTECEU', 'QUANDO MENOS ESPERAVA', 'PRESTE ATENÇÃO NISSO'],
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const [likes, setLikes] = useState<number>(24800);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const duration = Math.max(1, endSeconds - startSeconds);

  // Subtitle animator loop
  useEffect(() => {
    if (!subtitles || subtitles.length === 0) return;
    const interval = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % subtitles.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [subtitles]);

  // Handle iframe embed URL with YouTube embed parameters
  // autoplay=1, mute=1 for autoplay policy compliance, start & end timecodes, loop & enablejsapi
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${
    isMuted ? '1' : '0'
  }&start=${startSeconds}&end=${endSeconds}&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${videoId}`;

  return (
    <div className="relative flex flex-col items-center">
      {/* Smartphone Outer Chassis */}
      <div className="relative w-[300px] sm:w-[320px] h-[600px] sm:h-[640px] bg-[#090a0f] rounded-[44px] p-3 shadow-[0_25px_60px_-15px_rgba(112,0,255,0.4)] border-[6px] border-zinc-800/90 ring-1 ring-white/10 overflow-hidden">
        
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700/60" />
          <div className="w-2 h-2 rounded-full bg-blue-900/40" />
        </div>

        {/* Screen Area (9:16 Aspect) */}
        <div className="relative w-full h-full rounded-[34px] overflow-hidden bg-black flex items-center justify-center">
          
          {/* Format Background & Video Layer */}
          {format === 'vertical_blur' && (
            <div className="absolute inset-0 z-0 overflow-hidden">
              <iframe
                src={embedUrl}
                title="Background Blur"
                className="w-[300%] h-[300%] -ml-[100%] -mt-[100%] filter blur-xl scale-125 opacity-60 pointer-events-none"
                allow="autoplay; encrypted-media"
              />
            </div>
          )}

          {/* Main Video Player Container */}
          <div
            className={`relative z-10 w-full transition-all duration-300 ${
              format === 'vertical_crop'
                ? 'h-full scale-[2.2] flex items-center justify-center'
                : format === 'vertical_blur'
                ? 'h-[52%] shadow-2xl'
                : format === 'square'
                ? 'aspect-square w-full shadow-2xl'
                : 'aspect-video w-full shadow-2xl'
            }`}
          >
            <iframe
              src={embedUrl}
              title="YouTube Shorts Preview"
              className="w-full h-full object-cover pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Overlay: Top Impact Headline (Hormozi / Viral Shorts Style) */}
          {overlayTitle && (
            <div className="absolute top-14 left-3 right-3 z-20 pointer-events-none flex flex-col items-center">
              <div className="bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-yellow-400/30 shadow-lg shadow-black/80 text-center animate-bounce duration-1000">
                <span className="text-yellow-400 font-black text-xs sm:text-sm tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {overlayTitle}
                </span>
              </div>
            </div>
          )}

          {/* Overlay: Center Viral Subtitle Words Animation */}
          {subtitles && subtitles.length > 0 && (
            <div className="absolute bottom-28 left-4 right-4 z-20 pointer-events-none text-center">
              <div className="inline-block bg-black/70 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10">
                <p className="font-extrabold text-sm sm:text-base tracking-wider text-white drop-shadow-[0_2px_8px_rgba(0,0,0,1)] uppercase">
                  <span className="text-pink-500 mr-1.5">⚡</span>
                  <span className="text-yellow-300 underline decoration-yellow-400 decoration-2">
                    {subtitles[activeWordIndex] || hook || 'PRESTE MUITA ATENÇÃO'}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Social Overlay UI (Right Sidebar - TikTok/Shorts Style) */}
          <div className="absolute right-2.5 bottom-16 z-20 flex flex-col items-center gap-4 text-white">
            <button
              onClick={() => {
                setIsLiked(!isLiked);
                setLikes((prev) => (isLiked ? prev - 1 : prev + 1));
              }}
              className="flex flex-col items-center gap-0.5 group active:scale-90 transition-transform"
            >
              <div className={`p-2 rounded-full ${isLiked ? 'bg-pink-600/80 text-white' : 'bg-black/40 backdrop-blur-sm text-white'}`}>
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
              </div>
              <span className="text-[10px] font-bold drop-shadow">{likes.toLocaleString()}</span>
            </button>

            <div className="flex flex-col items-center gap-0.5">
              <div className="p-2 rounded-full bg-black/40 backdrop-blur-sm">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold drop-shadow">842</span>
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <div className="p-2 rounded-full bg-black/40 backdrop-blur-sm">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold drop-shadow">Partilhar</span>
            </div>

            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-[2px] animate-spin duration-3000">
              <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center">
                <Disc3 className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Bottom Info Bar */}
          <div className="absolute left-3 right-16 bottom-5 z-20 text-white pointer-events-none">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ff0055] text-white">
                #SHORTS
              </span>
              <span className="text-xs font-bold truncate">@viral_master</span>
            </div>
            <p className="text-[11px] text-zinc-200 line-clamp-2 leading-tight drop-shadow font-medium">
              {hook || 'Esse trecho vai explodir sua cabeça! Não deixe de salvar.'}
            </p>
          </div>

          {/* Bottom Progress Bar */}
          <div className="absolute bottom-1 left-0 right-0 h-1 bg-zinc-800 z-30">
            <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-400 animate-pulse w-3/4" />
          </div>

        </div>
      </div>

      {/* Quick Player Control Bar underneath Phone */}
      <div className="mt-4 flex items-center gap-2 p-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition"
          title={isMuted ? 'Ativar Áudio' : 'Mutar Áudio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span>{isMuted ? 'Com Som' : 'Mudo'}</span>
        </button>

        <div className="h-4 w-px bg-zinc-700" />

        <div className="text-xs text-zinc-300 px-2 font-mono">
          <span className="text-pink-400 font-bold">{duration}s</span> de corte
        </div>

        <div className="h-4 w-px bg-zinc-700" />

        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          Simulação 9:16
        </span>
      </div>
    </div>
  );
};
