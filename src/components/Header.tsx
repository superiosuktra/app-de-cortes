import React from 'react';
import { Flame, Sparkles, Scissors, Share2, Compass, Film, Zap } from 'lucide-react';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: 'trending' | 'analyze' | 'editor' | 'publish' | 'settings';
  setActiveTab: (tab: 'trending' | 'analyze' | 'editor' | 'publish' | 'settings') => void;
  cutsCount: number;
  savedCount: number;
  connectedApisCount?: number;
  queueCount?: number;
  isQueueActive?: boolean;
  lastSavedAt?: string | null;
  isSaving?: boolean;
  onManualSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  cutsCount,
  savedCount,
  queueCount = 0,
  isQueueActive = false,
  lastSavedAt = null,
  isSaving = false,
  onManualSync,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0e0f14]/90 backdrop-blur-md border-b border-zinc-800/80 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between py-3 lg:h-20 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#7000ff] via-[#b000ff] to-[#ff0055] p-[2px] shadow-lg shadow-purple-500/20 group-hover:shadow-pink-500/30 transition-all duration-300">
                  <div className="w-full h-full bg-[#12131a] rounded-[10px] flex items-center justify-center">
                    <Flame className="w-6 h-6 text-[#ff0055] animate-pulse" />
                  </div>
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff0055]"></span>
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                    <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                      AI VIRAL SHORTS
                    </span>
                    <span className="bg-gradient-to-r from-[#ff0055] to-[#7000ff] bg-clip-text text-transparent">
                      CUTTER
                    </span>
                  </h1>
                  <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-fuchsia-950/60 border border-fuchsia-500/30 text-fuchsia-300">
                    <Sparkles className="w-3 h-3 text-pink-400" />
                    Gemini 3.8
                  </span>
                </div>
                <p className="text-xs text-zinc-400 hidden sm:block">
                  Caçador & Editor Inteligente de Cortes Virais para TikTok, Reels e Shorts
                </p>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex lg:hidden items-center gap-2">
              <AutoSaveIndicator lastSavedAt={lastSavedAt} isSaving={isSaving} onManualSync={onManualSync} />
              <PWAInstallButton />
            </div>
          </div>

          {/* Navigation Tabs & Desktop Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <nav className="flex items-center gap-1 sm:gap-2 p-1 bg-[#161720] border border-zinc-800 rounded-xl overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveTab('trending')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 ${
                  activeTab === 'trending'
                    ? 'bg-gradient-to-r from-[#7000ff] to-[#b000ff] text-white shadow-md shadow-purple-900/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Compass className="w-4 h-4 text-purple-300" />
                <span className="hidden md:inline">1. Buscar Tendências</span>
                <span className="md:hidden">Tendências</span>
              </button>

              <button
                onClick={() => setActiveTab('analyze')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 ${
                  activeTab === 'analyze'
                    ? 'bg-gradient-to-r from-[#b000ff] to-[#ff0055] text-white shadow-md shadow-pink-900/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Zap className="w-4 h-4 text-pink-300" />
                <span className="hidden md:inline">2. Analisar Vídeo</span>
                <span className="md:hidden">Analisar</span>
                {cutsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold">
                    {cutsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 ${
                  activeTab === 'editor'
                    ? 'bg-gradient-to-r from-[#ff0055] to-[#7000ff] text-white shadow-md shadow-purple-900/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Scissors className="w-4 h-4 text-pink-300" />
                <span className="hidden md:inline">3. Cortar & Preview</span>
                <span className="md:hidden">Cortar</span>
              </button>

              <button
                onClick={() => setActiveTab('publish')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 ${
                  activeTab === 'publish'
                    ? 'bg-gradient-to-r from-[#7000ff] to-[#ff0055] text-white shadow-md shadow-pink-900/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Share2 className="w-4 h-4 text-purple-300" />
                <span className="hidden md:inline">4. Publicar & Fila</span>
                <span className="md:hidden">Publicar</span>
                {queueCount > 0 && (
                  <span
                    title={`${queueCount} vídeo(s) na fila de postagem ${isQueueActive ? '(Fila ativa)' : '(Fila pausada)'}`}
                    className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isQueueActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span>Fila: {queueCount}</span>
                  </span>
                )}
                {savedCount > 0 && queueCount === 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold">
                    {savedCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
                title="Configurações de Conexão das APIs"
              >
                <Film className="w-4 h-4 text-yellow-400" />
                <span className="hidden lg:inline">5. APIs & Conexões</span>
                <span className="lg:hidden">APIs</span>
              </button>
            </nav>

            {/* Desktop Quick Actions: AutoSave Status & PWA Install Button */}
            <div className="hidden lg:flex items-center gap-2">
              <AutoSaveIndicator lastSavedAt={lastSavedAt} isSaving={isSaving} onManualSync={onManualSync} />
              <PWAInstallButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
