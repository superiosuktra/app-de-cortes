import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Smartphone,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  Terminal,
  Check,
  Copy,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Type,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import { VideoInfo, ViralCut, VideoFormat, SavedCut } from '../types';
import { ShortsPhonePreview } from './ShortsPhonePreview';
import { FORMAT_OPTIONS } from '../mockData';
import confetti from 'canvas-confetti';

interface EditorTabProps {
  videoUrl: string;
  videoInfo: VideoInfo | null;
  viralCuts: ViralCut[];
  selectedCut: ViralCut | null;
  setSelectedCut: (cut: ViralCut | null) => void;
  onSaveCut: (cut: SavedCut) => void;
  onNavigateToPublish: (cut: ViralCut) => void;
}

function parseTimeToSeconds(timeStr: string): number {
  const clean = (timeStr || '').replace(/[\[\]\s]/g, '');
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return 0;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatSecondsToMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return `${m.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
}

export const EditorTab: React.FC<EditorTabProps> = ({
  videoUrl,
  videoInfo,
  viralCuts,
  selectedCut,
  setSelectedCut,
  onSaveCut,
  onNavigateToPublish,
}) => {
  const [startTime, setStartTime] = useState<string>('00:15');
  const [endTime, setEndTime] = useState<string>('01:00');
  const [format, setFormat] = useState<VideoFormat>('vertical_crop');
  const [overlayTitle, setOverlayTitle] = useState<string>('ESSE MOMENTO MUDOU TUDO 🚨');
  const [customHook, setCustomHook] = useState<string>('');
  const [ffmpegCommand, setFfmpegCommand] = useState<string>('');
  const [isCopiedCommand, setIsCopiedCommand] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Sync state whenever selectedCut changes
  useEffect(() => {
    if (selectedCut) {
      setStartTime(selectedCut.startTime);
      setEndTime(selectedCut.endTime);
      setOverlayTitle(selectedCut.title || 'MOMENTO VIRAL 🚨');
      setCustomHook(selectedCut.hook || '');
      setFormat(selectedCut.recommendedFormat || 'vertical_crop');
    }
  }, [selectedCut]);

  const startSec = parseTimeToSeconds(startTime);
  const endSec = parseTimeToSeconds(endTime);
  const duration = Math.max(0, endSec - startSec);
  const isTooLong = duration > 180;
  const isOptimal = duration >= 25 && duration <= 90;

  // Video ID resolution
  const videoId =
    videoInfo?.videoId ||
    videoUrl.match(/(?:v=|\/v\/|embed\/|youtu\.be\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/)?.[1] ||
    'y7G5J2_7c5w';

  // Generate FFmpeg command on the fly
  useEffect(() => {
    let filter = '';
    if (format === 'vertical_crop') {
      filter = `-vf "crop=trunc(ih*9/16/2)*2:ih,scale=1080:1920,setsar=1"`;
    } else if (format === 'vertical_blur') {
      filter = `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]" -map "[v]" -map 0:a?`;
    } else {
      filter = `-c:v copy`;
    }

    const cleanTitle = overlayTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'corte_viral';
    const cmd = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --download-sections "*${startTime}-${endTime}" "${videoUrl || 'https://www.youtube.com/watch?v=' + videoId}" -o "raw.mp4" && ffmpeg -i "raw.mp4" ${filter} -c:a aac -b:a 128k -movflags +faststart "${cleanTitle}.mp4" && rm "raw.mp4"`;
    setFfmpegCommand(cmd);
  }, [startTime, endTime, format, overlayTitle, videoUrl, videoId]);

  const handleAdjustStart = (deltaSeconds: number) => {
    const newSec = Math.max(0, startSec + deltaSeconds);
    setStartTime(formatSecondsToMMSS(newSec));
  };

  const handleAdjustEnd = (deltaSeconds: number) => {
    const newSec = Math.max(startSec + 5, endSec + deltaSeconds);
    setEndTime(formatSecondsToMMSS(newSec));
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(ffmpegCommand);
    setIsCopiedCommand(true);
    setTimeout(() => setIsCopiedCommand(false), 2500);
  };

  const handleSaveToLibrary = () => {
    const newSavedCut: SavedCut = {
      id: `cut-${Date.now()}`,
      videoTitle: videoInfo?.title || 'Vídeo do YouTube',
      videoUrl: videoUrl || `https://www.youtube.com/watch?v=${videoId}`,
      cutTitle: overlayTitle,
      startTime,
      endTime,
      durationSeconds: duration,
      format,
      viralityScore: selectedCut?.viralityScore || 92,
      caption: selectedCut?.caption?.youtube || `${overlayTitle}\n\n#Shorts #Viral`,
      hashtags: selectedCut?.hashtags || ['Shorts', 'Viral', 'Podcast'],
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };

    onSaveCut(newSavedCut);
    setIsSaved(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Cuts Selector Bar (if cuts exist) */}
      {viralCuts.length > 0 && (
        <div className="bg-[#141520] border border-zinc-800 rounded-2xl p-4 shadow-lg">
          <label className="text-xs font-bold text-zinc-300 block mb-2.5">
            Cortes Sugeridos pela IA (Selecione para carregar os tempos):
          </label>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {viralCuts.map((cut, idx) => {
              const isSelected = selectedCut?.id === cut.id;
              return (
                <button
                  key={cut.id || idx}
                  onClick={() => setSelectedCut(cut)}
                  className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-pink-400 shadow-md shadow-pink-900/40'
                      : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-black/40 text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="truncate max-w-[180px]">{cut.title}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    [{cut.startTime} → {cut.endTime}]
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Controls & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Editor Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#141520] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Ajuste Fino do Corte</h3>
                  <p className="text-xs text-zinc-400">Configure os tempos, formato e título de overlay</p>
                </div>
              </div>

              {/* Duration Status Tag */}
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                  isTooLong
                    ? 'bg-red-950/40 border-red-500/40 text-red-300'
                    : isOptimal
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}
              >
                <span>Duração: {duration}s</span>
                {isTooLong && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
              </div>
            </div>

            {/* Warning if video exceeds 180s (from Colab script) */}
            {isTooLong && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-950/30 border border-red-600/40 rounded-2xl text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Atenção:</strong> O trecho tem mais de 3 minutos ({duration} segundos). O algoritmo do YouTube não o classificará como Short vertical e ele pode perder a entrega orgânica rápida. Reduza o tempo para menos de 90s para máxima viralidade.
                </p>
              </div>
            )}

            {/* Time Adjustments Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Time Box */}
              <div className="p-4 bg-[#0e0f17] border border-zinc-800 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Tempo Inicial</span>
                  <span className="text-[10px] text-zinc-500 font-mono">MM:SS</span>
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="00:15"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-base font-mono font-bold text-white focus:outline-none focus:border-purple-500 text-center"
                />
                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={() => handleAdjustStart(-5)}
                    className="flex-1 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition"
                  >
                    -5s
                  </button>
                  <button
                    onClick={() => handleAdjustStart(-1)}
                    className="flex-1 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition"
                  >
                    -1s
                  </button>
                  <button
                    onClick={() => handleAdjustStart(1)}
                    className="flex-1 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition"
                  >
                    +1s
                  </button>
                  <button
                    onClick={() => handleAdjustStart(5)}
                    className="flex-1 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition"
                  >
                    +5s
                  </button>
                </div>
              </div>

              {/* End Time Box */}
              <div className="p-4 bg-[#0e0f17] border border-zinc-800 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Tempo Final</span>
                  <span className="text-[10px] text-zinc-500 font-mono">MM:SS</span>
                </label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="01:00"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-base font-mono font-bold text-white focus:outline-none focus:border-purple-500 text-center"
                />
                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={() => handleAdjustEnd(-5)}
                    className="flex-1 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition"
                  >
                    -5s
                  </button>
                  <button
                    onClick={() => handleAdjustEnd(-1)}
                    className="flex-1 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition"
                  >
                    -1s
                  </button>
                  <button
                    onClick={() => handleAdjustEnd(1)}
                    className="flex-1 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition"
                  >
                    +1s
                  </button>
                  <button
                    onClick={() => handleAdjustEnd(5)}
                    className="flex-1 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition"
                  >
                    +5s
                  </button>
                </div>
              </div>
            </div>

            {/* Video Format Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>Formato de Conversão de Vídeo</span>
                <span className="text-[10px] text-pink-400">Compatível com FFmpeg</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setFormat(opt.id as VideoFormat)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      format === opt.id
                        ? 'bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-pink-500 text-white shadow-md shadow-pink-950/40'
                        : 'bg-[#0e0f17] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{opt.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Overlay Title Customizer */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-yellow-400" />
                  Título de Overlay na Tela (Gancho Visual)
                </span>
                <span className="text-[10px] text-zinc-500">Aparece no topo do Short</span>
              </label>
              <input
                type="text"
                value={overlayTitle}
                onChange={(e) => setOverlayTitle(e.target.value)}
                placeholder="Ex: ESSE MOMENTO MUDOU TUDO 🚨"
                className="w-full px-3.5 py-2.5 bg-[#0e0f17] border border-zinc-800 rounded-xl text-sm font-bold text-yellow-400 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleSaveToLibrary}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold transition shadow-sm"
              >
                {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4 text-pink-400" />}
                <span>{isSaved ? 'Salvo na Biblioteca!' : 'Salvar Corte na Biblioteca'}</span>
              </button>

              <button
                onClick={() => {
                  if (selectedCut) {
                    onNavigateToPublish(selectedCut);
                  } else {
                    onNavigateToPublish({
                      id: `cut-${Date.now()}`,
                      title: overlayTitle,
                      startTime,
                      endTime,
                      startSeconds: startSec,
                      endSeconds: endSec,
                      durationSeconds: duration,
                      viralityScore: 94,
                      hook: customHook || overlayTitle,
                      payoff: 'Conclusão forte',
                      neuromarketingTrigger: 'Curiosidade',
                      viralityAnalysis: 'Trecho otimizado para retenção',
                      recommendedFormat: format,
                      caption: {
                        youtube: `${overlayTitle}\n\nAssista até o fim para entender! #Shorts`,
                        instagram: `${overlayTitle}\n\nComente sua opinião abaixo! 👇`,
                        tiktok: `${overlayTitle} 🤯 #fyp #viral`,
                      },
                      hashtags: ['Shorts', 'Viral', 'Podcasts', 'Motivação'],
                    });
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#7000ff] to-[#ff0055] text-white text-xs font-bold shadow-lg shadow-purple-900/40 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition"
              >
                <span>Avançar para Publicação & Legendas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* FFmpeg Code Snippet Card (Identical to Colab command) */}
          <div className="bg-[#12131d] border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Comando de Renderização FFmpeg (Alta Definição)
                </h4>
              </div>
              <button
                onClick={handleCopyCommand}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-semibold transition"
              >
                {isCopiedCommand ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedCommand ? 'Copiado!' : 'Copiar Comando'}</span>
              </button>
            </div>
            
            <p className="text-[11px] text-zinc-400">
              Caso deseje renderizar o corte no seu computador localmente em 4K/1080p usando FFmpeg e yt-dlp:
            </p>

            <div className="p-3 bg-black/80 rounded-xl border border-zinc-800/80 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {ffmpegCommand}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive 9:16 Smartphone Simulator (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 px-2">
            <span className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-pink-400" />
              Simulador de Visualização Vertical (9:16)
            </span>
            <span className="text-[10px] text-zinc-400">Looping em tempo real</span>
          </div>

          <ShortsPhonePreview
            videoId={videoId}
            startSeconds={startSec}
            endSeconds={endSec}
            format={format}
            overlayTitle={overlayTitle}
            hook={customHook}
            subtitles={selectedCut?.overlaySubtitlesSample || ['VEJA O QUE ACONTECEU', 'MOMENTO IMPRESSIONANTE', 'PRESTE ATENÇÃO NISSO']}
          />
        </div>

      </div>
    </div>
  );
};
