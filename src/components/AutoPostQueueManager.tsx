import React, { useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  Zap,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Youtube,
  Instagram,
  Settings2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  Sparkles,
  Share2,
  Sliders,
  Send,
  Eye,
  Check,
  Edit2,
  Film,
  Key,
} from 'lucide-react';
import { QueueItem, AutoPostSettings, PlatformCredentials, SocialPlatform, QueueItemStatus } from '../types';
import confetti from 'canvas-confetti';

interface AutoPostQueueManagerProps {
  queue: QueueItem[];
  settings: AutoPostSettings;
  onUpdateSettings: (newSettings: Partial<AutoPostSettings>) => void;
  onUpdateItem: (id: string, updates: Partial<QueueItem>) => void;
  onDeleteItem: (id: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
  onPostItemNow: (id: string) => Promise<void>;
  onTriggerNextNow: () => Promise<void>;
  onToggleQueueActive: (active: boolean) => void;
  credentials: PlatformCredentials;
  onOpenApiModal: () => void;
  onSwitchToDemoAndPost?: (id: string) => Promise<void>;
}

export const AutoPostQueueManager: React.FC<AutoPostQueueManagerProps> = ({
  queue,
  settings,
  onUpdateSettings,
  onUpdateItem,
  onDeleteItem,
  onClearCompleted,
  onClearAll,
  onPostItemNow,
  onTriggerNextNow,
  onToggleQueueActive,
  credentials,
  onOpenApiModal,
  onSwitchToDemoAndPost,
}) => {
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isProcessingManual, setIsProcessingManual] = useState<string | null>(null);

  const pendingItems = queue.filter((i) => i.status === 'pending');
  const publishedItems = queue.filter((i) => i.status === 'published');
  const failedItems = queue.filter((i) => i.status === 'failed');
  const nextItem = pendingItems[0];

  const formatScheduleTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffMin = Math.round(diffMs / 60000);

      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      if (diffMin <= 0) {
        return `Horário atingido (${timeStr})`;
      } else if (diffMin < 60) {
        return `Hoje às ${timeStr} (em ~${diffMin} min)`;
      } else {
        const hours = Math.floor(diffMin / 60);
        const remMin = diffMin % 60;
        return `${dateStr} às ${timeStr} (em ~${hours}h ${remMin > 0 ? `${remMin}m` : ''})`;
      }
    } catch {
      return isoString;
    }
  };

  const handlePostNow = async (id: string) => {
    setIsProcessingManual(id);
    try {
      await onPostItemNow(id);
    } finally {
      setIsProcessingManual(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Master Control */}
      <div className="bg-gradient-to-r from-[#141525] via-[#191a2d] to-[#161426] border border-purple-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-lg shadow-pink-900/40">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white tracking-tight">
                    Fila de Postagem Automática
                  </h3>
                  <span
                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      settings.isActive
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        settings.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    {settings.isActive ? 'Fila Ativa (Rodando)' : 'Fila Pausada'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Vídeos gerados pela IA são agendados e publicados nas redes oficiais automaticamente
                </p>
              </div>
            </div>
          </div>

          {/* Master Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onToggleQueueActive(!settings.isActive)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-lg ${
                settings.isActive
                  ? 'bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
              }`}
            >
              {settings.isActive ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pausar Fila Automática</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Ativar Fila Automática</span>
                </>
              )}
            </button>

            {nextItem && (
              <button
                onClick={onTriggerNextNow}
                disabled={Boolean(isProcessingManual)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-pink-900/40 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Disparar Próximo Agora</span>
              </button>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-200 text-xs font-semibold transition"
              title="Configurações da Fila"
            >
              <Settings2 className="w-4 h-4 text-purple-400" />
              <span>Configurações</span>
              {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-zinc-800/80">
          <div className="bg-[#0e0f17]/80 border border-zinc-800/80 rounded-2xl p-3">
            <span className="text-[11px] text-zinc-400 font-medium">Total na Fila</span>
            <div className="text-xl font-black text-white mt-0.5">{queue.length}</div>
          </div>

          <div className="bg-[#0e0f17]/80 border border-zinc-800/80 rounded-2xl p-3">
            <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Agendados / Pendentes
            </span>
            <div className="text-xl font-black text-amber-300 mt-0.5">{pendingItems.length}</div>
          </div>

          <div className="bg-[#0e0f17]/80 border border-zinc-800/80 rounded-2xl p-3">
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Publicados com Sucesso
            </span>
            <div className="text-xl font-black text-emerald-300 mt-0.5">{publishedItems.length}</div>
          </div>

          <div className="bg-[#0e0f17]/80 border border-zinc-800/80 rounded-2xl p-3">
            <span className="text-[11px] text-zinc-400 font-medium">Intervalo de Postagem</span>
            <div className="text-xl font-black text-purple-300 mt-0.5">{settings.intervalMinutes} min</div>
          </div>
        </div>
      </div>

      {/* Settings Panel (Collapsible) */}
      {showSettings && (
        <div className="bg-[#141520] border border-purple-500/40 rounded-3xl p-6 shadow-xl space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              <h4 className="text-sm font-bold text-white">Configurações de Postagem Automática</h4>
            </div>
            <span className="text-xs text-zinc-400">Salvo automaticamente</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Auto Enqueue on Generate (Main Request!) */}
            <div className="p-4 bg-[#0d0e15] border border-purple-500/30 rounded-2xl space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoEnqueueOnGenerate}
                  onChange={(e) => onUpdateSettings({ autoEnqueueOnGenerate: e.target.checked })}
                  className="w-5 h-5 mt-0.5 rounded accent-pink-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    ⚡ Auto-Enfileirar ao Gerar Vídeos
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Ao detectar cortes na aba <strong>"Analisar Vídeo"</strong>, eles entram direto na fila programada para postar automaticamente.
                  </p>
                </div>
              </label>
            </div>

            {/* Interval Between Posts */}
            <div className="p-4 bg-[#0d0e15] border border-zinc-800 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">
                ⏱ Intervalo Entre Cada Post:
              </label>
              <select
                value={settings.intervalMinutes}
                onChange={(e) => onUpdateSettings({ intervalMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
              >
                <option value={15}>A cada 15 minutos</option>
                <option value={30}>A cada 30 minutos (Recomendado)</option>
                <option value={45}>A cada 45 minutos</option>
                <option value={60}>A cada 1 hora</option>
                <option value={120}>A cada 2 horas</option>
                <option value={240}>A cada 4 horas</option>
                <option value={720}>A cada 12 horas</option>
                <option value={1440}>A cada 24 horas (1 post/dia)</option>
              </select>
              <p className="text-[10px] text-zinc-500">
                Evita bloqueios de spam distribuindo as publicações ao longo do dia.
              </p>
            </div>

            {/* Target Platforms */}
            <div className="p-4 bg-[#0d0e15] border border-zinc-800 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">
                🎯 Redes Sociais Alvo:
              </label>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.targetPlatforms.youtube}
                    onChange={(e) =>
                      onUpdateSettings({
                        targetPlatforms: { ...settings.targetPlatforms, youtube: e.target.checked },
                      })
                    }
                    className="accent-red-500 rounded"
                  />
                  <Youtube className="w-3.5 h-3.5 text-red-500" />
                  <span>YouTube Shorts</span>
                  <span className={`text-[10px] ml-auto font-mono ${credentials.youtube.accessToken ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {credentials.youtube.accessToken ? '● Conectado' : '○ Sem Token'}
                  </span>
                </label>

                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.targetPlatforms.instagram}
                    onChange={(e) =>
                      onUpdateSettings({
                        targetPlatforms: { ...settings.targetPlatforms, instagram: e.target.checked },
                      })
                    }
                    className="accent-pink-500 rounded"
                  />
                  <Instagram className="w-3.5 h-3.5 text-pink-500" />
                  <span>Instagram Reels</span>
                  <span className={`text-[10px] ml-auto font-mono ${credentials.instagram.accessToken ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {credentials.instagram.accessToken ? '● Conectado' : '○ Sem Token'}
                  </span>
                </label>

                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.targetPlatforms.tiktok}
                    onChange={(e) =>
                      onUpdateSettings({
                        targetPlatforms: { ...settings.targetPlatforms, tiktok: e.target.checked },
                      })
                    }
                    className="accent-cyan-500 rounded"
                  />
                  <span className="text-cyan-400 font-black text-[10px]">TT</span>
                  <span>TikTok</span>
                  <span className={`text-[10px] ml-auto font-mono ${credentials.tiktok.accessToken ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {credentials.tiktok.accessToken ? '● Conectado' : '○ Sem Token'}
                  </span>
                </label>
              </div>

              <button
                onClick={onOpenApiModal}
                className="text-[10px] text-purple-400 hover:text-purple-300 underline font-semibold mt-1 block"
              >
                Gerenciar Tokens das APIs →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Next Up Highlight Banner */}
      {nextItem && settings.isActive && (
        <div className="bg-gradient-to-r from-purple-950/40 to-pink-950/40 border border-purple-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <span className="font-bold text-purple-200">Próximo Disparo Automático:</span>
              <span className="text-white font-bold ml-1.5">"{nextItem.cutTitle}"</span>
              <span className="text-zinc-400 ml-2">({formatScheduleTime(nextItem.scheduledFor)})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePostNow(nextItem.id)}
              disabled={Boolean(isProcessingManual)}
              className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-[11px] transition shadow flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>Publicar Agora</span>
            </button>
          </div>
        </div>
      )}

      {/* Queue Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Itens na Fila de Postagem</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300">
              {queue.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {publishedItems.length > 0 && (
              <button
                onClick={onClearCompleted}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition"
              >
                Limpar Concluídos ({publishedItems.length})
              </button>
            )}

            {queue.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja limpar toda a fila?')) {
                    onClearAll();
                  }
                }}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 text-zinc-400 hover:text-red-400 text-xs transition"
                title="Limpar toda a fila"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="bg-[#141520]/60 border border-dashed border-zinc-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400">
              <Clock className="w-8 h-8 text-purple-400" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="text-base font-bold text-white">A fila de postagem está vazia</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Quando você gera cortes na aba <strong>"2. Analisar Vídeo"</strong> com a opção de auto-post marcada, todos os cortes entram aqui automaticamente para serem postados nos intervalos configurados!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((item, index) => {
              const isExpanded = expandedItemId === item.id;
              const isPosting = isProcessingManual === item.id || item.status === 'posting';

              return (
                <div
                  key={item.id}
                  className={`bg-[#141520] border rounded-2xl p-4 sm:p-5 transition-all shadow-md space-y-3 ${
                    item.status === 'posting'
                      ? 'border-purple-500 shadow-purple-900/30'
                      : item.status === 'published'
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : item.status === 'failed'
                      ? 'border-red-500/40 bg-red-950/10'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center justify-center w-8 h-8 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs shrink-0 mt-0.5">
                        #{index + 1}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-white hover:text-pink-300 transition-colors">
                            {item.cutTitle}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">
                            {item.startTime} - {item.endTime} ({item.durationSeconds}s)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-950/60 border border-pink-500/30 text-pink-300">
                            {item.viralityScore} pts 🔥
                          </span>
                        </div>

                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                          {item.hook}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {item.status === 'pending' && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/60 border border-amber-500/40 text-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatScheduleTime(item.scheduledFor)}</span>
                        </span>
                      )}

                      {item.status === 'posting' && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-950/60 border border-purple-500/40 text-purple-300 animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Publicando nas APIs oficiais...</span>
                        </span>
                      )}

                      {item.status === 'published' && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Publicado com Sucesso</span>
                        </span>
                      )}

                      {item.status === 'failed' && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-950/60 border border-red-500/40 text-red-300">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                          <span>Falha no Envio</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Platforms & Details Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/60 text-xs">
                    {/* Platforms Icons */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-400 font-semibold mr-1">Publicar em:</span>
                      {item.platforms.map((p) => (
                        <span
                          key={p}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-300"
                        >
                          {p === 'youtube' && <Youtube className="w-3 h-3 text-red-500" />}
                          {p === 'instagram' && <Instagram className="w-3 h-3 text-pink-500" />}
                          {p === 'tiktok' && <span className="text-cyan-400 font-bold text-[9px]">TT</span>}
                          <span className="capitalize">{p}</span>
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isExpanded ? 'Ocultar Detalhes' : 'Ver Copy / Legenda'}</span>
                      </button>

                      {item.status === 'published' && (
                        <a
                          href={
                            item.publishedAccounts?.find((a) => a.videoUrl)?.videoUrl ||
                            (item.publishedVideoId ? `https://youtube.com/shorts/${item.publishedVideoId}` : 'https://youtube.com/shorts/lsWTOWpzTFI')
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition shadow shadow-red-950"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Assistir no YouTube ↗</span>
                        </a>
                      )}

                      {item.status !== 'published' && (
                        <button
                          onClick={() => handlePostNow(item.id)}
                          disabled={isPosting}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-[11px] font-bold transition disabled:opacity-50 shadow"
                        >
                          <Send className="w-3 h-3" />
                          <span>{isPosting ? 'Enviando...' : 'Postar Agora'}</span>
                        </button>
                      )}

                      {item.status === 'failed' && (
                        <button
                          onClick={() => handlePostNow(item.id)}
                          disabled={isPosting}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-[11px] font-bold transition"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Tentar Novamente</span>
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 transition"
                        title="Remover da Fila"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Immediate Failure Warning and Quick Recovery Banner */}
                  {item.status === 'failed' && (
                    <div className="p-3.5 bg-gradient-to-r from-red-950/60 via-red-900/30 to-pink-950/40 border border-red-500/40 rounded-xl space-y-2.5 text-xs text-red-200 animate-fadeIn">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-bold text-red-300 block">Falha no Envio para as Redes Oficiais</span>
                          <p className="text-[11px] text-zinc-300 leading-relaxed">
                            {item.error || 'A API oficial retornou erro de credenciais ou token expirado.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-500/20">
                        {onSwitchToDemoAndPost && (
                          <button
                            type="button"
                            onClick={() => onSwitchToDemoAndPost(item.id)}
                            disabled={Boolean(isPosting)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition shadow shadow-emerald-950"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                            <span>Ativar Modo Demonstração & Publicar Agora</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePostNow(item.id)}
                          disabled={Boolean(isPosting)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition shadow"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Tentar Novamente</span>
                        </button>

                        <button
                          type="button"
                          onClick={onOpenApiModal}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-[11px] flex items-center gap-1.5 transition"
                        >
                          <Key className="w-3 h-3 text-yellow-400" />
                          <span>Configurar APIs Oficiais</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expandable Caption and Logs */}
                  {isExpanded && (
                    <div className="p-4 bg-[#0e0f17] border border-zinc-800 rounded-xl space-y-3 text-xs animate-fadeIn">
                      {item.status === 'published' && (
                        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <span className="font-bold text-emerald-300 block text-xs">Publicado no Canal {item.publishedAccounts?.[0]?.account || 'ABNER_CORTES'}</span>
                              <span className="text-[11px] text-zinc-400">Vídeo ao vivo no YouTube Shorts</span>
                            </div>
                          </div>
                          <a
                            href={
                              item.publishedAccounts?.find((a) => a.videoUrl)?.videoUrl ||
                              (item.publishedVideoId ? `https://youtube.com/shorts/${item.publishedVideoId}` : 'https://youtube.com/shorts/lsWTOWpzTFI')
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Abrir no YouTube Shorts</span>
                          </a>
                        </div>
                      )}

                      <div>
                        <span className="font-bold text-white block mb-1">Legenda Gerada para YouTube / Shorts:</span>
                        <p className="text-zinc-300 whitespace-pre-wrap text-[11px] leading-relaxed bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                          {item.caption.youtube}
                          {'\n\n'}
                          {item.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
                        </p>
                      </div>

                      {item.error && (
                        <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-red-300 text-[11px] flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <strong>Motivo da falha:</strong> {item.error}
                          </div>
                        </div>
                      )}

                      {item.logs && item.logs.length > 0 && (
                        <div>
                          <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider block mb-1">
                            Histórico de Disparos:
                          </span>
                          <div className="space-y-1 font-mono text-[10px] text-zinc-400 bg-black/60 p-2 rounded-lg border border-zinc-800">
                            {item.logs.map((log, lidx) => (
                              <div key={lidx}>{log}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
