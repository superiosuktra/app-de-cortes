import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Heart, MessageCircle, Share2, Disc3, Sparkles, Mic, Users, Layout } from 'lucide-react';
import { VideoFormat, SubtitleTheme } from '../types';

interface ShortsPhonePreviewProps {
  videoId: string;
  startSeconds: number;
  endSeconds: number;
  format: VideoFormat;
  subtitleTheme?: SubtitleTheme;
  activeSpeaker?: string;
  overlayTitle?: string;
  hook?: string;
  subtitles?: string[];
}

export const ShortsPhonePreview: React.FC<ShortsPhonePreviewProps> = ({
  videoId,
  startSeconds,
  endSeconds,
  format,
  subtitleTheme = 'hormozi',
  activeSpeaker,
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
        <div className="relative w-full h-full rounded-[34px] overflow-hidden bg-black flex flex-col items-center justify-center">
          
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

          {/* DUAL CAMERA PODCAST STACK (Opus Clip / Klap Signature Layout) */}
          {format === 'split_screen' ? (
            <div className="relative z-10 w-full h-full flex flex-col">
              {/* Top Viewport: Convidado (Right side of 16:9) */}
              <div className="relative w-full h-1/2 overflow-hidden bg-black border-b border-yellow-400/80 shadow-md">
                <iframe
                  src={embedUrl}
                  title="Guest Camera (Top)"
                  className="w-[310%] h-[125%] -ml-[145%] -mt-[10%] object-cover pointer-events-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
                <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-yellow-400/40 text-[9px] font-black text-yellow-300 flex items-center gap-1 shadow">
                  <Mic className="w-2.5 h-2.5 text-yellow-400" />
                  <span>CONVIDADO</span>
                </div>
              </div>

              {/* Glowing Separator Bar */}
              <div className="relative w-full h-[3px] bg-gradient-to-r from-yellow-400 via-pink-500 to-yellow-400 z-20 shadow-[0_0_8px_rgba(250,204,21,0.8)] flex items-center justify-center">
                <span className="px-2 py-0.5 rounded-full bg-black text-[7px] font-black tracking-widest text-white border border-yellow-400/50 uppercase shadow">
                  OPUS DUAL CAM ⚡
                </span>
              </div>

              {/* Bottom Viewport: Host (Left side of 16:9) */}
              <div className="relative w-full h-1/2 overflow-hidden bg-black">
                <iframe
                  src={embedUrl}
                  title="Host Camera (Bottom)"
                  className="w-[310%] h-[125%] -ml-[25%] -mt-[10%] object-cover pointer-events-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
                <div className="absolute top-2 left-3 z-20 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-cyan-400/40 text-[9px] font-black text-cyan-300 flex items-center gap-1 shadow">
                  <Mic className="w-2.5 h-2.5 text-cyan-400" />
                  <span>HOST</span>
                </div>
              </div>
            </div>
          ) : format === 'speaker_left' ? (
            /* Left Speaker Focus (Host Focus) */
            <div className="relative z-10 w-full h-full overflow-hidden bg-black">
              <iframe
                src={embedUrl}
                title="Left Speaker Preview"
                className="w-[320%] h-full -ml-[25%] object-cover pointer-events-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
              <div className="absolute top-12 left-3 z-20 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-cyan-400/40 text-[9px] font-bold text-cyan-300 flex items-center gap-1">
                <Mic className="w-2.5 h-2.5 text-cyan-400" />
                <span>FOCO: HOST (ESQ)</span>
              </div>
            </div>
          ) : format === 'speaker_right' ? (
            /* Right Speaker Focus (Guest Focus) */
            <div className="relative z-10 w-full h-full overflow-hidden bg-black">
              <iframe
                src={embedUrl}
                title="Right Speaker Preview"
                className="w-[320%] h-full -ml-[195%] object-cover pointer-events-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
              <div className="absolute top-12 left-3 z-20 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-yellow-400/40 text-[9px] font-bold text-yellow-300 flex items-center gap-1">
                <Mic className="w-2.5 h-2.5 text-yellow-400" />
                <span>FOCO: CONVIDADO (DIR)</span>
              </div>
            </div>
          ) : (
            /* Standard Layouts (Center Crop, Blur, Square, Original) */
            <div
              className={`relative z-10 w-full transition-all duration-300 ${
                format === 'vertical_crop' || format === 'speaker_center'
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
          )}

          {/* Overlay: Top Impact Headline (Hormozi / Viral Shorts Style) */}
          {overlayTitle && (
            <div className="absolute top-14 left-3 right-3 z-20 pointer-events-none flex flex-col items-center">
              <div className="bg-black/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-yellow-400/50 shadow-lg shadow-black/80 text-center animate-bounce duration-1000">
                <span className="text-yellow-400 font-black text-xs sm:text-sm tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {overlayTitle}
                </span>
              </div>
            </div>
          )}

          {/* Active Speaker Badge Indicator */}
          {activeSpeaker && activeSpeaker !== 'ambos' && (
            <div className="absolute top-24 left-3 z-20 pointer-events-none">
              <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-white/20 text-[9px] font-bold text-zinc-200 flex items-center gap-1">
                <Mic className="w-2.5 h-2.5 text-pink-400" />
                {activeSpeaker === 'host' ? 'Host Falando' : 'Convidado Falando'}
              </span>
            </div>
          )}

          {/* Overlay: Center Viral Subtitle Words Animation with SubtitleTheme Styling */}
          {subtitles && subtitles.length > 0 && (
            <div className="absolute bottom-28 left-4 right-4 z-20 pointer-events-none text-center">
              {subtitleTheme === 'hormozi' && (
                <div className="inline-block bg-black/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border-2 border-yellow-400 shadow-[0_4px_20px_rgba(250,204,21,0.4)]">
                  <p className="font-black text-sm sm:text-base tracking-wider text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                    <span className="text-yellow-400 font-black underline decoration-yellow-400 decoration-2">
                      {subtitles[activeWordIndex] || hook || 'PRESTE MUITA ATENÇÃO'}
                    </span>
                  </p>
                </div>
              )}

              {subtitleTheme === 'beast' && (
                <div className="inline-block bg-black/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border-2 border-green-400 shadow-[0_4px_20px_rgba(34,197,94,0.4)]">
                  <p className="font-black text-sm sm:text-base tracking-wider text-green-400 uppercase drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">
                    <span className="text-white mr-1 font-black">💥</span>
                    {subtitles[activeWordIndex] || hook || 'PRESTE MUITA ATENÇÃO'}
                  </p>
                </div>
              )}

              {subtitleTheme === 'cyberpunk' && (
                <div className="inline-block bg-[#0f051d]/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border-2 border-pink-500 shadow-[0_4px_20px_rgba(236,72,153,0.4)]">
                  <p className="font-black text-sm sm:text-base tracking-wider uppercase bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent drop-shadow">
                    <span className="mr-1 text-pink-400">⚡</span>
                    {subtitles[activeWordIndex] || hook || 'PRESTE MUITA ATENÇÃO'}
                  </p>
                </div>
              )}

              {subtitleTheme === 'clean' && (
                <div className="inline-block bg-zinc-900/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20 shadow-md">
                  <p className="font-bold text-xs sm:text-sm tracking-wide text-zinc-100 uppercase">
                    {subtitles[activeWordIndex] || hook || 'PRESTE MUITA ATENÇÃO'}
                  </p>
                </div>
              )}
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
