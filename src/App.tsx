import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TrendingTab } from './components/TrendingTab';
import { AnalyzeTab } from './components/AnalyzeTab';
import { EditorTab } from './components/EditorTab';
import { PublisherTab } from './components/PublisherTab';
import { ConnectionSettings } from './components/ConnectionSettings';
import { VideoInfo, ViralCut, SavedCut, PlatformCredentials } from './types';
import { Flame, Sparkles, Scissors, Share2, Compass, ShieldCheck, Key } from 'lucide-react';
import {
  LEGAL_APP_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_UPDATED_AT_PT,
  PRIVACY_POLICY_PT_SECTIONS,
  TERMS_OF_SERVICE_PT_SECTIONS,
} from './legalContent';

const STORAGE_SAVED_CUTS_KEY = 'viral_shorts_saved_cuts_v1';
const STORAGE_CREDENTIALS_KEY = 'viral_shorts_full_credentials_v1';

const INITIAL_CREDENTIALS: PlatformCredentials = {
  youtube: {
    accessToken: '',
    clientId: '',
    clientSecret: '',
    status: 'disconnected',
  },
  instagram: {
    accessToken: '',
    businessAccountId: '',
    appId: '',
    appSecret: '',
    status: 'disconnected',
  },
  tiktok: {
    accessToken: '',
    clientKey: '',
    clientSecret: '',
    status: 'disconnected',
  },
};

export default function App() {
  const getLegalViewFromPath = (pathname: string): 'privacy' | 'terms' | null =>
    pathname === '/privacy' ? 'privacy' : pathname === '/terms' ? 'terms' : null;
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(
    getLegalViewFromPath(initialPath)
  );
  const [activeTab, setActiveTab] = useState<'trending' | 'analyze' | 'editor' | 'publish' | 'settings'>('trending');
  const [credentials, setCredentials] = useState<PlatformCredentials>(INITIAL_CREDENTIALS);
  const [videoUrl, setVideoUrl] = useState<string>('https://www.youtube.com/watch?v=y7G5J2_7c5w');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>({
    videoId: 'y7G5J2_7c5w',
    videoUrl: 'https://www.youtube.com/watch?v=y7G5J2_7c5w',
    title: 'Flow Podcast: Inteligência Emocional e Neurociência do Comportamento',
    author: 'Flow Podcast',
    thumbnail: 'https://img.youtube.com/vi/y7G5J2_7c5w/maxresdefault.jpg',
  });
  const [transcript, setTranscript] = useState<string>(
    '[00:15] O maior erro que as pessoas cometem é achar que motivação dura para sempre.\n[00:32] Quando a dopamina cai, você precisa ter sistemas claros de rotina.\n[00:54] Quem depende de sentir vontade de fazer nunca constrói nada grandioso.\n[01:15] Se você não dominar a sua mente logo pela manhã, o algoritmo vai dominar ela por você.'
  );
  const [userPrompt, setUserPrompt] = useState<string>(
    'gere vídeos com maior possibilidade de se tornar viral focando em neurociência, choque e quebra de crenças'
  );
  const [viralCuts, setViralCuts] = useState<ViralCut[]>([
    {
      id: 'cut-demo-1',
      title: 'A ILUSÃO DA MOTIVAÇÃO 🧠',
      startTime: '00:15',
      endTime: '00:55',
      startSeconds: 15,
      endSeconds: 55,
      durationSeconds: 40,
      viralityScore: 98,
      hook: 'O maior erro que as pessoas cometem é achar que motivação dura para sempre.',
      payoff: 'Quem depende de sentir vontade nunca constrói nada grandioso.',
      neuromarketingTrigger: 'Quebra de Padrão & Choque de Realidade',
      viralityAnalysis: 'Desmonta uma crença comum no primeiro segundo. Gera alta taxa de salvamento e comentários de identificação.',
      recommendedFormat: 'vertical_crop',
      caption: {
        youtube: 'A verdade brutal sobre por que você procrastina. Pare de esperar motivação cair do céu! 🔥\n\nAssista até o fim para virar essa chave.',
        instagram: 'Você ainda acredita que precisa de motivação todos os dias? Veja o que a neurociência diz sobre isso. 👇 Salve para lembrar!',
        tiktok: 'Pare de cair nessa mentira sobre disciplina! 🤯 #dopamina #foco #produtividade #shorts',
      },
      hashtags: ['#Shorts', '#Neurociencia', '#Disciplina', '#Mindset', '#Viral'],
      overlaySubtitlesSample: ['A ILUSÃO', 'DA MOTIVAÇÃO', 'PARE AGORA'],
    },
    {
      id: 'cut-demo-2',
      title: 'O ALGORITMO ROUBOU SUA MENTE 🚨',
      startTime: '00:50',
      endTime: '01:25',
      startSeconds: 50,
      endSeconds: 85,
      durationSeconds: 35,
      viralityScore: 96,
      hook: 'Se você não dominar a sua mente logo pela manhã, o algoritmo vai dominar por você.',
      payoff: 'Retome o controle da sua atenção antes que seja tarde.',
      neuromarketingTrigger: 'Medo de Ficar Para Trás (FOMO) & Alerta',
      viralityAnalysis: 'Toca na dor universal do vício em telas e desperta senso de urgência imediato.',
      recommendedFormat: 'vertical_blur',
      caption: {
        youtube: 'A primeira hora do seu dia decide o seu futuro. Não toque no celular ao acordar! ⚠️ #Shorts',
        instagram: 'Quantas horas você perdeu nas redes hoje sem perceber? Assista e mude sua rotina matinal.',
        tiktok: 'Isso é o que acontece com seu cérebro de manhã 😳 #foco #rotina #estudos',
      },
      hashtags: ['#Shorts', '#Produtividade', '#Dopamina', '#HacksDeVida'],
      overlaySubtitlesSample: ['O ALGORITMO', 'ROUBOU SUA ATENÇÃO', 'ACORDE'],
    },
  ]);
  const [selectedCut, setSelectedCut] = useState<ViralCut | null>(viralCuts[0]);
  const [savedCuts, setSavedCuts] = useState<SavedCut[]>([]);

  // Load saved cuts and credentials from localStorage
  useEffect(() => {
    const syncLegalViewWithLocation = () => {
      setLegalView(getLegalViewFromPath(window.location.pathname));
    };

    window.addEventListener('popstate', syncLegalViewWithLocation);
    return () => window.removeEventListener('popstate', syncLegalViewWithLocation);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SAVED_CUTS_KEY);
      if (stored) {
        setSavedCuts(JSON.parse(stored));
      } else {
        // Initial sample saved cut
        setSavedCuts([
          {
            id: 'sample-cut-1',
            videoTitle: 'Flow Podcast: Inteligência Emocional e Neurociência',
            videoUrl: 'https://www.youtube.com/watch?v=y7G5J2_7c5w',
            cutTitle: 'A ILUSÃO DA MOTIVAÇÃO 🧠',
            startTime: '00:15',
            endTime: '00:55',
            durationSeconds: 40,
            format: 'vertical_crop',
            viralityScore: 98,
            caption: 'A verdade brutal sobre por que você procrastina. Pare de esperar motivação cair do céu! 🔥\n\n#Shorts #Viral',
            hashtags: ['Shorts', 'Neurociencia', 'Foco'],
            createdAt: new Date().toLocaleDateString('pt-BR'),
          },
        ]);
      }

      const storedCreds = localStorage.getItem(STORAGE_CREDENTIALS_KEY);
      if (storedCreds) {
        const parsed = JSON.parse(storedCreds);
        setCredentials(parsed);
        // Sync with backend
        fetch('/api/settings/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials: parsed }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to load storage items:', e);
    }
  }, []);

  const handleSaveCredentials = (newCreds: PlatformCredentials) => {
    setCredentials(newCreds);
    try {
      localStorage.setItem(STORAGE_CREDENTIALS_KEY, JSON.stringify(newCreds));
      fetch('/api/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: newCreds }),
      }).catch((err) => console.warn('Backend sync failed:', err));
    } catch (e) {
      console.warn('Failed to save credentials to localStorage:', e);
    }
  };

  // Save cuts to localStorage
  const handleSaveCut = (newCut: SavedCut) => {
    const updated = [newCut, ...savedCuts];
    setSavedCuts(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_CUTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  };

  const handleDeleteSavedCut = (id: string) => {
    const updated = savedCuts.filter((c) => c.id !== id);
    setSavedCuts(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_CUTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update localStorage:', e);
    }
  };

  const handleSelectTrendingVideo = (url: string) => {
    setVideoUrl(url);
    setActiveTab('analyze');
  };

  const handleOpenCutInEditor = (cut: ViralCut) => {
    setSelectedCut(cut);
    setActiveTab('editor');
  };

  const handleNavigateToPublish = (cut: ViralCut) => {
    setSelectedCut(cut);
    setActiveTab('publish');
  };

  const handleLoadSavedCut = (saved: SavedCut) => {
    setSelectedCut({
      id: saved.id,
      title: saved.cutTitle,
      startTime: saved.startTime,
      endTime: saved.endTime,
      startSeconds: 0,
      endSeconds: saved.durationSeconds,
      durationSeconds: saved.durationSeconds,
      viralityScore: saved.viralityScore,
      hook: saved.cutTitle,
      payoff: 'Desfecho marcante',
      neuromarketingTrigger: 'Curiosidade',
      viralityAnalysis: 'Corte salvo na biblioteca',
      recommendedFormat: saved.format,
      caption: {
        youtube: saved.caption,
        instagram: saved.caption,
        tiktok: saved.caption,
      },
      hashtags: saved.hashtags,
    });
    setVideoUrl(saved.videoUrl);
    setActiveTab('editor');
  };

  const navigateToAppTab = (tab: 'trending' | 'analyze' | 'editor' | 'publish' | 'settings') => {
    setLegalView(null);
    setActiveTab(tab);
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c12] text-zinc-100 flex flex-col selection:bg-[#ff0055] selection:text-white">
      {/* Global Header & Nav */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cutsCount={viralCuts.length}
        savedCount={savedCuts.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {legalView ? (
          <div className="bg-[#141520] border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-950/60 border border-purple-800/40 text-purple-300 uppercase tracking-wider">
                  Documentação Legal
                </span>
                <h2 className="text-2xl font-black text-white mt-2">
                  {legalView === 'privacy' ? 'Política de Privacidade' : 'Termos de Serviço'}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  URL pública: <code className="text-yellow-300">{window.location.origin}/{legalView}</code>
                </p>
              </div>

              <button
                onClick={() => {
                  setLegalView(null);
                  window.history.pushState({}, '', '/');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>← Voltar ao Aplicativo</span>
              </button>
            </div>

            {legalView === 'privacy' ? (
              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                <h3 className="text-sm font-bold text-white">Política de Privacidade — {LEGAL_APP_NAME}</h3>
                <p className="text-[11px] text-zinc-500">Última atualização: {LEGAL_UPDATED_AT_PT}</p>

                {PRIVACY_POLICY_PT_SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <h4 className="font-bold text-white">{section.title}</h4>
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={`${section.title}-paragraph-${index}`}>{paragraph}</p>
                    ))}
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1">
                        {section.bullets.map((bullet) => (
                          <li key={`${section.title}-${bullet}`}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}

                <div className="pt-4 border-t border-zinc-800 text-[11px] text-zinc-400">
                  Contato: {LEGAL_CONTACT_EMAIL}
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                <h3 className="text-sm font-bold text-white">Termos de Serviço — {LEGAL_APP_NAME}</h3>
                <p className="text-[11px] text-zinc-500">Última atualização: {LEGAL_UPDATED_AT_PT}</p>

                {TERMS_OF_SERVICE_PT_SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <h4 className="font-bold text-white">{section.title}</h4>
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={`${section.title}-paragraph-${index}`}>{paragraph}</p>
                    ))}
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1">
                        {section.bullets.map((bullet) => (
                          <li key={`${section.title}-${bullet}`}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}

                <div className="pt-4 border-t border-zinc-800 text-[11px] text-zinc-400">
                  Contato: {LEGAL_CONTACT_EMAIL}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {activeTab === 'trending' && (
              <TrendingTab onSelectVideo={handleSelectTrendingVideo} />
            )}

            {activeTab === 'analyze' && (
              <AnalyzeTab
                videoUrl={videoUrl}
                setVideoUrl={setVideoUrl}
                videoInfo={videoInfo}
                setVideoInfo={setVideoInfo}
                transcript={transcript}
                setTranscript={setTranscript}
                userPrompt={userPrompt}
                setUserPrompt={setUserPrompt}
                viralCuts={viralCuts}
                setViralCuts={setViralCuts}
                onOpenCutInEditor={handleOpenCutInEditor}
              />
            )}

            {activeTab === 'editor' && (
              <EditorTab
                videoUrl={videoUrl}
                videoInfo={videoInfo}
                viralCuts={viralCuts}
                selectedCut={selectedCut}
                setSelectedCut={setSelectedCut}
                onSaveCut={handleSaveCut}
                onNavigateToPublish={handleNavigateToPublish}
              />
            )}

            {activeTab === 'publish' && (
              <PublisherTab
                currentCut={selectedCut}
                savedCuts={savedCuts}
                onDeleteSavedCut={handleDeleteSavedCut}
                onLoadSavedCut={handleLoadSavedCut}
              />
            )}

            {activeTab === 'settings' && (
              <ConnectionSettings
                credentials={credentials}
                onSaveCredentials={handleSaveCredentials}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#090a0f] py-8 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-400 font-medium">
              AI Viral Shorts Cutter • Powered by Gemini 3.8 Flash
            </span>
          </div>

          <div className="flex items-center gap-6 text-zinc-400">
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-pointer" onClick={() => navigateToAppTab('trending')}>
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              Tendências
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-pointer" onClick={() => navigateToAppTab('analyze')}>
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              Detecção IA
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-pointer" onClick={() => navigateToAppTab('editor')}>
              <Scissors className="w-3.5 h-3.5 text-yellow-400" />
              Editor 9:16
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-pointer" onClick={() => navigateToAppTab('publish')}>
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              Publicação
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-pointer" onClick={() => navigateToAppTab('settings')}>
              <Key className="w-3.5 h-3.5 text-pink-400" />
              APIs & Conexões
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <a
              href="/privacy"
              onClick={(event) => {
                event.preventDefault();
                setLegalView('privacy');
                window.history.pushState({}, '', '/privacy');
              }}
              className="hover:text-purple-400 underline transition"
            >
              Política de Privacidade (/privacy)
            </a>
            <span>•</span>
            <a
              href="/terms"
              onClick={(event) => {
                event.preventDefault();
                setLegalView('terms');
                window.history.pushState({}, '', '/terms');
              }}
              className="hover:text-purple-400 underline transition"
            >
              Termos de Serviço (/terms)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
