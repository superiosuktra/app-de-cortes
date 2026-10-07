import React, { useState, useEffect } from 'react';
import {
  Zap,
  Sparkles,
  Play,
  FileText,
  Clock,
  Flame,
  Check,
  Copy,
  Scissors,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Brain,
  Hash,
} from 'lucide-react';
import { VideoInfo, ViralCut } from '../types';
import { fetchJson } from '../utils/api';

interface AnalyzeTabProps {
  videoUrl: string;
  setVideoUrl: (url: string) => void;
  videoInfo: VideoInfo | null;
  setVideoInfo: (info: VideoInfo | null) => void;
  transcript: string;
  setTranscript: (text: string) => void;
  userPrompt: string;
  setUserPrompt: (prompt: string) => void;
  viralCuts: ViralCut[];
  setViralCuts: (cuts: ViralCut[]) => void;
  onOpenCutInEditor: (cut: ViralCut) => void;
}

const PRESET_VIDEOS = [
  {
    name: 'Flow: Neurociência & Dopamina',
    url: 'https://www.youtube.com/watch?v=y7G5J2_7c5w',
    prompt: 'focar em dicas contra-intuitivas sobre foco, disciplina e vícios digitais',
  },
  {
    name: 'PrimoCast: Segredos de Negócios',
    url: 'https://www.youtube.com/watch?v=2ZIpFytCSVc',
    prompt: 'focar em lições de riqueza, mentalidade e frases de alto impacto',
  },
  {
    name: 'Huberman: Otimização Cerebral',
    url: 'https://www.youtube.com/watch?v=QmOF0crdyRU',
    prompt: 'focar em protocolos científicos rápidos de saúde e energia imediata',
  },
];

export const AnalyzeTab: React.FC<AnalyzeTabProps> = ({
  videoUrl,
  setVideoUrl,
  videoInfo,
  setVideoInfo,
  transcript,
  setTranscript,
  userPrompt,
  setUserPrompt,
  viralCuts,
  setViralCuts,
  onOpenCutInEditor,
}) => {
  const [isLoadingInfo, setIsLoadingInfo] = useState<boolean>(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [copiedCutId, setCopiedCutId] = useState<string | null>(null);
  const [transcriptNotice, setTranscriptNotice] = useState<string>('');

  // Fetch video info when url changes or on blur
  const handleFetchVideoInfo = async (urlToFetch: string = videoUrl) => {
    if (!urlToFetch.trim()) return;
    setIsLoadingInfo(true);
    setStatusMessage('Buscando informações do vídeo no YouTube...');
    try {
      const res = await fetchJson<any>('/api/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToFetch }),
      });
      const data = res.data;
      if (res.ok && data) {
        setVideoInfo(data);
        setStatusMessage(`Vídeo carregado: ${data.title}`);
        // If transcript is empty, auto fetch it
        if (!transcript) {
          handleFetchTranscript(urlToFetch);
        }
      } else {
        setStatusMessage(`Aviso: ${data?.error || res.error || 'Não foi possível carregar os dados do vídeo.'}`);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Erro ao conectar ao serviço do YouTube.');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // Fetch transcript from YouTube
  const handleFetchTranscript = async (urlToFetch: string = videoUrl) => {
    if (!urlToFetch.trim()) return;
    setIsLoadingTranscript(true);
    setStatusMessage('Buscando transcrição e legendas com timestamps...');
    setTranscriptNotice('');
    try {
      const res = await fetchJson<any>('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToFetch }),
      });
      const data = res.data;
      if (res.ok && data?.transcript) {
        setTranscript(data.transcript);
        setStatusMessage(`Transcrição obtida com sucesso! (${data.count} trechos de áudio).`);
      } else {
        setTranscriptNotice(
          data?.message ||
          res.error ||
          'Não foram encontradas legendas automáticas para este vídeo. Você pode colar a transcrição ou a IA analisará com base nos tópicos do vídeo.'
        );
        setStatusMessage('Transcrição não disponível no YouTube.');
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Falha ao obter transcrição automática.');
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  // Run AI Viral Cut Analysis
  const handleRunAnalysis = async () => {
    if (!videoUrl.trim()) {
      setStatusMessage('Insira a URL ou ID do vídeo do YouTube primeiro.');
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage('Enviando para o Gemini 3.8 Flash analisar neuromarketing e momentos magnéticos...');

    try {
      const res = await fetchJson<any>('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          transcript,
          userPrompt,
          videoTitle: videoInfo?.title,
          channelName: videoInfo?.author,
        }),
      });

      const data = res.data;
      if (res.ok && data?.cuts && data.cuts.length > 0) {
        setViralCuts(data.cuts);
        setStatusMessage(`✅ Sucesso! ${data.cuts.length} cortes virais identificados com métricas de retenção.`);
      } else {
        setStatusMessage(`Erro na análise: ${data?.error || res.error || 'A IA não retornou cortes válidos.'}`);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Erro durante a análise: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyCaption = (cut: ViralCut) => {
    const textToCopy = `${cut.caption.youtube}\n\n${cut.hashtags.join(' ')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCutId(cut.id);
    setTimeout(() => setCopiedCutId(null), 2500);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Config Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Video Input & Configurations (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[#141520] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Configurar Vídeo</h3>
                  <p className="text-xs text-zinc-400">Insira o link ou escolha um teste rápido</p>
                </div>
              </div>

              {/* Status Pulse */}
              {isAnalyzing && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 animate-pulse">
                  <Sparkles className="w-3 h-3 text-pink-400" />
                  IA Analisando
                </span>
              )}
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Testar com 1 Clique (Presets Prontos):</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_VIDEOS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setVideoUrl(preset.url);
                      setUserPrompt(preset.prompt);
                      handleFetchVideoInfo(preset.url);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-[11px] font-medium text-zinc-300 hover:text-white transition"
                  >
                    ⚡ {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>URL do Vídeo do YouTube</span>
                <span className="text-[10px] text-zinc-500">Suporta Vídeos, Podcasts e Shorts</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onBlur={() => handleFetchVideoInfo()}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-3.5 py-2.5 bg-[#0f1017] border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition"
                />
                <button
                  onClick={() => handleFetchVideoInfo()}
                  disabled={isLoadingInfo || !videoUrl}
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition disabled:opacity-50"
                  title="Carregar Metadados"
                >
                  {isLoadingInfo ? '...' : 'Carregar'}
                </button>
              </div>
            </div>

            {/* Loaded Video Metadata Card */}
            {videoInfo && (
              <div className="flex gap-3 p-3 bg-[#191b28] border border-zinc-700/60 rounded-2xl">
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-24 h-16 object-cover rounded-xl border border-zinc-800"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoInfo.videoId}/0.jpg`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wide">
                    {videoInfo.author}
                  </span>
                  <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                    {videoInfo.title}
                  </h4>
                </div>
              </div>
            )}

            {/* Custom User Prompt / Directive */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Direcionamento Estratégico (Prompt)</span>
                <span className="text-[10px] text-purple-400">Personalize o foco da IA</span>
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Ex: gere vídeos com maior possibilidade de se tornar viral focando em humor, frases de choque e lições acionáveis..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-[#0f1017] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition resize-none"
              />
            </div>

            {/* Transcripts Accordion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Transcrição com Timecodes</span>
                </label>
                <button
                  onClick={() => handleFetchTranscript()}
                  disabled={isLoadingTranscript || !videoUrl}
                  className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition"
                >
                  {isLoadingTranscript ? 'Obtendo...' : 'Reobter Legendas'}
                </button>
              </div>

              {transcriptNotice && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-950/30 border border-amber-600/30 rounded-xl text-[11px] text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <p>{transcriptNotice}</p>
                </div>
              )}

              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="[00:15] Exemplo de transcrição com timestamps... (Obtido automaticamente do vídeo ou cole aqui)"
                rows={4}
                className="w-full px-3 py-2 bg-[#0f1017] border border-zinc-800 rounded-xl text-[11px] font-mono text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition resize-none"
              />
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !videoUrl}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#7000ff] via-[#b000ff] to-[#ff0055] text-white font-extrabold text-sm shadow-xl shadow-purple-900/40 hover:shadow-pink-900/50 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className={`w-5 h-5 text-yellow-300 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analisando Neuromarketing...' : '🔥 Detectar Cortes Virais'}</span>
            </button>

            {/* Status Feedback Output */}
            {statusMessage && (
              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                <span className="truncate">{statusMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Recommendations List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#ff0055]" />
              <h3 className="text-lg font-extrabold text-white">
                Recomendações de Cortes da IA
              </h3>
            </div>
            {viralCuts.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-fuchsia-950/60 border border-fuchsia-500/30 text-fuchsia-300">
                {viralCuts.length} Cortes Magnéticos
              </span>
            )}
          </div>

          {/* Cuts Empty State */}
          {viralCuts.length === 0 && !isAnalyzing && (
            <div className="bg-[#141520]/60 border border-dashed border-zinc-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400">
                <Scissors className="w-8 h-8 text-pink-400" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-base font-bold text-white mb-1">
                  Nenhum corte detectado ainda
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Insira o link de um vídeo do YouTube ao lado (ou clique em um dos presets de teste rápido) e clique no botão <strong>"Detectar Cortes Virais"</strong> para a IA encontrar os melhores momentos.
                </p>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {isAnalyzing && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-[#141520] border border-zinc-800 rounded-2xl p-6 space-y-3 animate-pulse"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-48 bg-zinc-800 rounded-md" />
                    <div className="h-6 w-24 bg-pink-900/40 rounded-full" />
                  </div>
                  <div className="h-4 w-full bg-zinc-800/60 rounded" />
                  <div className="h-4 w-3/4 bg-zinc-800/40 rounded" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-8 w-32 bg-zinc-800 rounded-lg" />
                    <div className="h-8 w-28 bg-zinc-800 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cuts List Cards */}
          {viralCuts.map((cut, index) => {
            const isCopied = copiedCutId === cut.id;
            return (
              <div
                key={cut.id || index}
                className="bg-[#141520] hover:bg-[#161826] border border-zinc-800 hover:border-purple-500/50 rounded-2xl p-5 sm:p-6 transition-all duration-300 shadow-lg space-y-4 group"
              >
                {/* Header: Title Overlay & Virality Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white group-hover:text-pink-300 transition-colors">
                      {cut.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Timecode Badge */}
                    <div className="px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-pink-400" />
                      <span>{cut.startTime} → {cut.endTime} ({cut.durationSeconds}s)</span>
                    </div>

                    {/* Virality Score Badge */}
                    <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 text-pink-300 text-xs font-extrabold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
                      <span>{cut.viralityScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Neuromarketing & Hook Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#0d0e15] border border-zinc-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      Gatilho Psicológico
                    </span>
                    <p className="text-zinc-200 font-semibold">{cut.neuromarketingTrigger}</p>
                  </div>

                  <div className="p-3 bg-[#0d0e15] border border-zinc-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                      ⚡ Gancho Inicial (Primeiros 3s)
                    </span>
                    <p className="text-zinc-200 italic line-clamp-2">"{cut.hook}"</p>
                  </div>
                </div>

                {/* Virality Analysis Explanation */}
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/50">
                  <strong className="text-pink-400">Por que viraliza:</strong> {cut.viralityAnalysis}
                </p>

                {/* Hashtags */}
                {cut.hashtags && cut.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cut.hashtags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-950/40 text-purple-300 border border-purple-800/40"
                      >
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    onClick={() => onOpenCutInEditor(cut)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7000ff] to-[#ff0055] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>Abrir no Editor & Cortar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleCopyCaption(cut)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition ${
                      isCopied
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                        : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-700'
                    }`}
                    title="Copiar Legenda e Hashtags sugeridas"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? 'Copiada!' : 'Copiar Legenda'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
