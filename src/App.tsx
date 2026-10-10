import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { TrendingTab } from './components/TrendingTab';
import { AnalyzeTab } from './components/AnalyzeTab';
import { EditorTab } from './components/EditorTab';
import { PublisherTab } from './components/PublisherTab';
import { ConnectionSettings } from './components/ConnectionSettings';
import { AutoBotStatus } from './components/AutoPostQueueManager';
import { VideoInfo, ViralCut, SavedCut, PlatformCredentials, QueueItem, AutoPostSettings, SocialPlatform } from './types';
import { fetchJson } from './utils/api';
import { Flame, Sparkles, Scissors, Share2, Compass, ShieldCheck, Key, Zap } from 'lucide-react';
import { OfflineIndicator } from './components/OfflineIndicator';
import confetti from 'canvas-confetti';

const STORAGE_SAVED_CUTS_KEY = 'viral_shorts_saved_cuts_v1';
const STORAGE_CREDENTIALS_KEY = 'viral_shorts_full_credentials_v1';
const STORAGE_QUEUE_KEY = 'viral_shorts_autopost_queue_v1';
const STORAGE_QUEUE_SETTINGS_KEY = 'viral_shorts_autopost_settings_v1';

const DEFAULT_AUTO_POST_SETTINGS: AutoPostSettings = {
  autoEnqueueOnGenerate: true,
  isActive: true,
  intervalMinutes: 5,
  targetPlatforms: {
    youtube: true,
    instagram: true,
    tiktok: true,
  },
  defaultPrivacy: 'public',
};

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
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(
    initialPath === '/privacy' ? 'privacy' : initialPath === '/terms' ? 'terms' : null
  );
  const [activeTab, setActiveTab] = useState<'trending' | 'analyze' | 'editor' | 'publish' | 'settings'>('trending');
  const [credentials, setCredentials] = useState<PlatformCredentials>(INITIAL_CREDENTIALS);
  const [videoUrl, setVideoUrl] = useState<string>('https://www.youtube.com/watch?v=B57eOqeLVfc');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>({
    videoId: 'B57eOqeLVfc',
    videoUrl: 'https://www.youtube.com/watch?v=B57eOqeLVfc',
    title: 'O PODER DA DISCIPLINA (COM RENATO CARIANI) | Os Sócios 160',
    author: 'Os Sócios Podcast',
    thumbnail: 'https://img.youtube.com/vi/B57eOqeLVfc/maxresdefault.jpg',
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
      viralityAnalysis: 'Desmonta uma crença comum no primeiro segundo. Diálogo dinâmico entre apresentador e convidado perfeito para tela dividida (Split 2 Câmeras).',
      recommendedFormat: 'split_screen',
      activeSpeaker: 'ambos',
      subtitleTheme: 'hormozi',
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
      viralityAnalysis: 'Fala direta e visceral do convidado sobre a dor universal do vício em telas.',
      recommendedFormat: 'speaker_right',
      activeSpeaker: 'convidado',
      subtitleTheme: 'beast',
      caption: {
        youtube: 'A primeira hora do seu dia decide o seu futuro. Não toque no celular ao acordar! ⚠️ #Shorts',
        instagram: 'Quantas horas você perdeu nas redes hoje sem perceber? Assista e mude sua rotina matinal.',
        tiktok: 'Isso é o que acontece com seu cérebro de manhã 😳 #foco #rotina #estudos',
      },
      hashtags: ['#Shorts', '#Produtividade', '#Dopamina', '#HacksDeVida'],
      overlaySubtitlesSample: ['O ALGORITMO', 'ROUBOU SUA ATENÇÃO', 'ACORDE'],
    },
    {
      id: 'cut-demo-3',
      title: 'O HACK DA DOPAMINA RÁPIDA ⚡',
      startTime: '01:40',
      endTime: '02:25',
      startSeconds: 100,
      endSeconds: 145,
      durationSeconds: 45,
      viralityScore: 97,
      hook: 'Toda vez que você busca prazer imediato sem esforço, você cava sua própria cova.',
      payoff: 'Inverta a ordem: dor primeiro, recompensa depois. É assim que os melhores operam.',
      neuromarketingTrigger: 'Hack Mental & Contraste Extremo',
      viralityAnalysis: 'Host questionando e provocando reflexão científica com alta retenção visual.',
      recommendedFormat: 'speaker_left',
      activeSpeaker: 'host',
      subtitleTheme: 'cyberpunk',
      caption: {
        youtube: 'O segredo da dopamina que ninguém te conta. Pare de sabotar seu cérebro! ⚡ #Shorts',
        instagram: 'Você sente cansaço constante sem ter feito nada o dia todo? Esse corte explica o porquê.',
        tiktok: 'Como reiniciar seus receptores de dopamina em 24h 🧠 #neurociencia #biohacking #foco',
      },
      hashtags: ['#Shorts', '#Dopamina', '#Neurociencia', '#Habitos', '#AltaPerformance'],
      overlaySubtitlesSample: ['DOPAMINA BARATA', 'DESTRÓI SEU FOCO', 'MUDA HOJE'],
    },
    {
      id: 'cut-demo-4',
      title: 'A REGRA DOS 5 MINUTOS CONTRA PREGUIÇA ⏳',
      startTime: '02:30',
      endTime: '03:10',
      startSeconds: 150,
      endSeconds: 190,
      durationSeconds: 40,
      viralityScore: 95,
      hook: 'O seu cérebro odeia começar tarefas, mas ele não consegue parar uma tarefa começada.',
      payoff: 'Faça apenas cinco minutos. A inércia vai trabalhar a seu favor.',
      neuromarketingTrigger: 'Ganho Imediato & Transformação Rápida',
      viralityAnalysis: 'Dica prática imediata de alta aplicabilidade em formato widescreen centralizado com fundo desfocado.',
      recommendedFormat: 'vertical_blur',
      activeSpeaker: 'convidado',
      subtitleTheme: 'clean',
      caption: {
        youtube: 'O truque psicológico para vencer a procrastinação instantaneamente! 🔥 #Shorts',
        instagram: 'Salve para aplicar na próxima vez que bater aquela preguiça incontrolável.',
        tiktok: 'Testei isso e mudou minha rotina de trabalho 🤯 #estudos #produtividade #foco',
      },
      hashtags: ['#Shorts', '#Procrastinacao', '#DicasRapidas', '#Mindset', '#Produtividade'],
      overlaySubtitlesSample: ['APENAS 5 MINUTOS', 'ENGANE SEU CÉREBRO', 'VENCEU'],
    },
    {
      id: 'cut-demo-5',
      title: 'POR QUE 99% NUNCA ENRIQUECEM 💸',
      startTime: '03:20',
      endTime: '04:05',
      startSeconds: 200,
      endSeconds: 245,
      durationSeconds: 45,
      viralityScore: 99,
      hook: 'Pobre gasta o que ganha, classe média compra passivos achando que é ativo, e ricos compram tempo.',
      payoff: 'Enquanto você vender horas, seu teto sempre será limitado.',
      neuromarketingTrigger: 'Choque Financeiro & Autoridade',
      viralityAnalysis: 'Tópico de alta polarização. Debate intenso gravado em duas câmeras simultâneas no podcast.',
      recommendedFormat: 'split_screen',
      activeSpeaker: 'ambos',
      subtitleTheme: 'hormozi',
      caption: {
        youtube: 'A diferença definitiva entre quem cria riqueza e quem só sobrevive. Concorda? 💬 #Shorts',
        instagram: 'Qual lado você está escolhendo construir? Deixe nos comentários sua opinião sincera.',
        tiktok: 'Essa frase doeu mas é a pura verdade 😳 #financas #investimentos #riqueza #mindset',
      },
      hashtags: ['#Shorts', '#Financas', '#Riqueza', '#Empreendedorismo', '#Sucesso'],
      overlaySubtitlesSample: ['99% NÃO SABEM', 'RICOS COMPRAM TEMPO', 'ACORDE'],
    },
    {
      id: 'cut-demo-6',
      title: 'A LIÇÃO BRUTAL QUE NINGUÉM TE CONTA 🥊',
      startTime: '04:15',
      endTime: '04:58',
      startSeconds: 255,
      endSeconds: 298,
      durationSeconds: 43,
      viralityScore: 94,
      hook: 'O mundo não quer saber o quanto você se esforçou, ele só recompensa o resultado final.',
      payoff: 'Pare de pedir aplausos pelo esforço e comece a entregar consistência silenciosa.',
      neuromarketingTrigger: 'Choque de Realidade & Desafio Pessoal',
      viralityAnalysis: 'Mensagem dura e inspiradora com forte conexão emocional e taxa de salvamento nos favoritos.',
      recommendedFormat: 'vertical_blur',
      caption: {
        youtube: 'A verdade sobre o sucesso que a maioria tem medo de ouvir. Compartilhe com um amigo! 🚀 #Shorts',
        instagram: 'Marque aquela pessoa que precisa de um choque de realidade hoje. 👇',
        tiktok: 'Ouça isso todos os dias antes de trabalhar 🥊 #motivacao #disciplina #foco',
      },
      hashtags: ['#Shorts', '#Superacao', '#Consistencia', '#Disciplina', '#Mentalidade'],
      overlaySubtitlesSample: ['SEM DESCULPAS', 'ENTREGUE RESULTADOS', 'CONSISTÊNCIA'],
    },
  ]);
  const [selectedCut, setSelectedCut] = useState<ViralCut | null>(viralCuts[0]);
  const [savedCuts, setSavedCuts] = useState<SavedCut[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [autoPostSettings, setAutoPostSettings] = useState<AutoPostSettings>(DEFAULT_AUTO_POST_SETTINGS);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [autoBotStatus, setAutoBotStatus] = useState<AutoBotStatus>({
    isRunning: false,
    step: 0,
    message: 'Pronto para iniciar o piloto automático completo.',
    logs: [],
  });
  const initialLoadDone = useRef<boolean>(false);
  const queueRef = useRef<QueueItem[]>(queue);
  const credentialsRef = useRef<PlatformCredentials>(credentials);
  const autoPostSettingsRef = useRef<AutoPostSettings>(autoPostSettings);
  const isPostingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    credentialsRef.current = credentials;
  }, [credentials]);

  useEffect(() => {
    autoPostSettingsRef.current = autoPostSettings;
  }, [autoPostSettings]);

  // Load saved cuts, queue, settings and credentials from localStorage AND disk backend
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
            videoTitle: 'O Poder da Disciplina (Renato Cariani) | Os Sócios',
            videoUrl: 'https://www.youtube.com/watch?v=B57eOqeLVfc',
            cutTitle: 'A ILUSÃO DA MOTIVAÇÃO 🧠',
            startTime: '00:15',
            endTime: '00:55',
            durationSeconds: 40,
            format: 'split_screen',
            viralityScore: 98,
            caption: 'A verdade brutal sobre por que você procrastina. Pare de esperar motivação cair do céu! 🔥\n\n#Shorts #Viral',
            hashtags: ['Shorts', 'Neurociencia', 'Foco'],
            createdAt: new Date().toLocaleDateString('pt-BR'),
          },
        ]);
      }

      // Load queue
      const storedQueue = localStorage.getItem(STORAGE_QUEUE_KEY);
      if (storedQueue) {
        setQueue(JSON.parse(storedQueue));
      } else {
        // Initial sample queued item so user immediately discovers the auto-post queue (5 min countdown)
        const sampleScheduled = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        setQueue([
          {
            id: 'sample-queue-1',
            cutId: 'cut-demo-1',
            videoTitle: 'O Poder da Disciplina (Renato Cariani) | Os Sócios',
            videoUrl: 'https://www.youtube.com/watch?v=B57eOqeLVfc',
            cutTitle: 'A ILUSÃO DA MOTIVAÇÃO 🧠',
            startTime: '00:15',
            endTime: '00:55',
            durationSeconds: 40,
            format: 'split_screen',
            viralityScore: 98,
            hook: 'O maior erro que as pessoas cometem é achar que motivação dura para sempre.',
            payoff: 'Quem depende de sentir vontade nunca constrói nada grandioso.',
            caption: {
              youtube: 'A verdade brutal sobre por que você procrastina. Pare de esperar motivação cair do céu! 🔥\n\nAssista até o fim para virar essa chave.',
              instagram: 'Você ainda acredita que precisa de motivação todos os dias? Veja o que a neurociência diz sobre isso. 👇 Salve para lembrar!',
              tiktok: 'Pare de cair nessa mentira sobre disciplina! 🤯 #dopamina #foco #produtividade #shorts',
            },
            hashtags: ['#Shorts', '#Neurociencia', '#Disciplina', '#Mindset', '#Viral'],
            platforms: ['youtube'],
            scheduledFor: sampleScheduled,
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      // Load auto post settings
      const storedQueueSettings = localStorage.getItem(STORAGE_QUEUE_SETTINGS_KEY);
      if (storedQueueSettings) {
        const parsedSettings = JSON.parse(storedQueueSettings);
        if (parsedSettings.intervalMinutes === 30) {
          parsedSettings.intervalMinutes = 5;
        }
        setAutoPostSettings(parsedSettings);
      }

      // Load credentials and unify with tokens storage
      const storedCreds = localStorage.getItem(STORAGE_CREDENTIALS_KEY);
      const storedTokens = localStorage.getItem('viral_shorts_platform_tokens_v1');
      let mergedCreds: PlatformCredentials = INITIAL_CREDENTIALS;
      if (storedCreds) {
        try {
          mergedCreds = { ...INITIAL_CREDENTIALS, ...JSON.parse(storedCreds) };
        } catch (e) {
          console.warn('Failed to parse stored credentials:', e);
        }
      }
      if (storedTokens) {
        try {
          const t = JSON.parse(storedTokens);
          if (t.youtube && !mergedCreds.youtube?.accessToken) {
            mergedCreds.youtube = { ...mergedCreds.youtube, accessToken: t.youtube, status: 'connected' };
          }
          if (t.instagram && !mergedCreds.instagram?.accessToken) {
            mergedCreds.instagram = { ...mergedCreds.instagram, accessToken: t.instagram, status: 'connected' };
          }
          if (t.tiktok && !mergedCreds.tiktok?.accessToken) {
            mergedCreds.tiktok = { ...mergedCreds.tiktok, accessToken: t.tiktok, status: 'connected' };
          }
        } catch (e) {
          console.warn('Failed to parse stored tokens:', e);
        }
      }
      setCredentials(mergedCreds);

      // Fetch persistent backend storage to restore state across restarts/browsers
      fetch('/api/storage/state')
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.state) {
            if (res.state.lastUpdated) {
              setLastSavedAt(res.state.lastUpdated);
            }
            if (Array.isArray(res.state.savedCuts) && res.state.savedCuts.length > 0) {
              setSavedCuts(res.state.savedCuts);
            }
            if (Array.isArray(res.state.queue) && res.state.queue.length > 0) {
              setQueue(res.state.queue);
            }
            if (res.state.autoPostSettings) {
              const loadedSettings = { ...res.state.autoPostSettings };
              if (loadedSettings.intervalMinutes === 30) {
                loadedSettings.intervalMinutes = 5;
              }
              setAutoPostSettings(loadedSettings);
            }
            if (res.state.credentials) {
              setCredentials((prev) => ({
                ...prev,
                ...res.state.credentials,
                youtube: { ...prev.youtube, ...res.state.credentials.youtube },
                instagram: { ...prev.instagram, ...res.state.credentials.instagram },
                tiktok: { ...prev.tiktok, ...res.state.credentials.tiktok },
              }));
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          initialLoadDone.current = true;
        });

      // Sync with backend
      fetch('/api/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: mergedCreds }),
      }).catch(() => {});
    } catch (e) {
      console.warn('Failed to load storage items:', e);
      initialLoadDone.current = true;
    }
  }, []);

  // Automatic Background Persistence to Disk and LocalStorage
  useEffect(() => {
    if (!initialLoadDone.current) return;
    try {
      localStorage.setItem(STORAGE_SAVED_CUTS_KEY, JSON.stringify(savedCuts));
    } catch (e) {}

    const timer = setTimeout(() => {
      setIsSaving(true);
      fetch('/api/storage/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedCuts, queue, autoPostSettings, credentials }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            setLastSavedAt(res.lastUpdated || new Date().toISOString());
          }
        })
        .catch((e) => console.warn('Auto-save error:', e))
        .finally(() => setIsSaving(false));
    }, 1200);

    return () => clearTimeout(timer);
  }, [savedCuts, queue, autoPostSettings, credentials]);

  const handleForceSync = () => {
    setIsSaving(true);
    fetch('/api/storage/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedCuts, queue, autoPostSettings, credentials }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setLastSavedAt(res.lastUpdated || new Date().toISOString());
        }
      })
      .catch((e) => console.warn('Manual sync error:', e))
      .finally(() => setIsSaving(false));
  };

  const handleSaveCredentials = (newCreds: PlatformCredentials) => {
    setCredentials(newCreds);
    try {
      localStorage.setItem(STORAGE_CREDENTIALS_KEY, JSON.stringify(newCreds));
      // Keep alternate tokens key also in sync
      const tokensObj = {
        youtube: newCreds.youtube?.accessToken || '',
        instagram: newCreds.instagram?.accessToken || '',
        tiktok: newCreds.tiktok?.accessToken || '',
      };
      localStorage.setItem('viral_shorts_platform_tokens_v1', JSON.stringify(tokensObj));

      fetch('/api/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: newCreds }),
      }).catch((err) => console.warn('Backend sync failed:', err));
    } catch (e) {
      console.warn('Failed to save credentials to localStorage:', e);
    }
  };

  const getEffectivePlatforms = (settings: AutoPostSettings, creds: PlatformCredentials): SocialPlatform[] => {
    const connectedAndEnabled: SocialPlatform[] = [];
    const hasYt = Boolean(creds.youtube?.accessToken?.trim() || creds.youtube?.refreshToken?.trim());
    const hasIg = Boolean(creds.instagram?.accessToken?.trim());
    const hasTt = Boolean(creds.tiktok?.accessToken?.trim());

    if (settings.targetPlatforms.youtube && hasYt) connectedAndEnabled.push('youtube');
    if (settings.targetPlatforms.instagram && hasIg) connectedAndEnabled.push('instagram');
    if (settings.targetPlatforms.tiktok && hasTt) connectedAndEnabled.push('tiktok');

    if (connectedAndEnabled.length > 0) return connectedAndEnabled;

    const enabled: SocialPlatform[] = [];
    if (settings.targetPlatforms.youtube) enabled.push('youtube');
    if (settings.targetPlatforms.instagram) enabled.push('instagram');
    if (settings.targetPlatforms.tiktok) enabled.push('tiktok');
    return enabled.length > 0 ? enabled : ['youtube'];
  };

  // Queue Management Functions
  const handleEnqueueCuts = (
    cutsToEnqueue: ViralCut[],
    options?: {
      immediateFirst?: boolean;
      overrideVideoUrl?: string;
      overrideVideoTitle?: string;
      overrideIntervalMinutes?: number;
    }
  ): QueueItem[] => {
    const now = Date.now();
    const effectiveIntervalMinutes = options?.overrideIntervalMinutes || autoPostSettingsRef.current.intervalMinutes || 5;
    const intervalMs = effectiveIntervalMinutes * 60 * 1000;

    const activePlatforms = getEffectivePlatforms(autoPostSettingsRef.current, credentialsRef.current);

    // Base time: if immediateFirst is requested, schedule from right now; otherwise after last pending item
    const currentQueue = queueRef.current;
    const pending = currentQueue.filter((q) => q.status === 'pending');
    let baseTime = now;
    if (!options?.immediateFirst && pending.length > 0) {
      const lastScheduled = Math.max(...pending.map((p) => new Date(p.scheduledFor).getTime()));
      if (lastScheduled > now) {
        baseTime = lastScheduled;
      }
    }

    const newItems: QueueItem[] = cutsToEnqueue.map((cut, idx) => {
      const offsetIndex = options?.immediateFirst ? idx : idx + 1;
      const scheduledTime = new Date(baseTime + offsetIndex * intervalMs);
      return {
        id: `queue-${cut.id}-${Date.now()}-${idx}`,
        cutId: cut.id,
        videoTitle: options?.overrideVideoTitle || videoInfo?.title || 'Vídeo Fonte',
        videoUrl: options?.overrideVideoUrl || videoUrl,
        cutTitle: cut.title,
        startTime: cut.startTime,
        endTime: cut.endTime,
        durationSeconds: cut.durationSeconds,
        format: cut.recommendedFormat,
        viralityScore: cut.viralityScore,
        hook: cut.hook,
        payoff: cut.payoff,
        caption: cut.caption,
        hashtags: cut.hashtags,
        platforms: activePlatforms,
        scheduledFor: scheduledTime.toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    });

    // When immediateFirst is true (Auto Bot), place new items before older pending items and shift older pending items after them
    let updatedQueue: QueueItem[];
    if (options?.immediateFirst) {
      const nonPending = currentQueue.filter((q) => q.status !== 'pending');
      const shiftedOldPending = pending.map((oldItem, i) => ({
        ...oldItem,
        scheduledFor: new Date(baseTime + (newItems.length + i) * intervalMs).toISOString(),
      }));
      updatedQueue = [...newItems, ...shiftedOldPending, ...nonPending];
    } else {
      updatedQueue = [...currentQueue, ...newItems];
    }

    queueRef.current = updatedQueue;
    setQueue(updatedQueue);
    try {
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(updatedQueue));
    } catch (e) {
      console.warn('Failed to save queue to localStorage:', e);
    }
    return newItems;
  };

  const handleEnqueueSingleCut = (cut: ViralCut) => {
    handleEnqueueCuts([cut]);
  };

  const handleUpdateAutoPostSettings = (newSettings: Partial<AutoPostSettings>) => {
    setAutoPostSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      autoPostSettingsRef.current = updated;
      try {
        localStorage.setItem(STORAGE_QUEUE_SETTINGS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save auto post settings:', e);
      }
      return updated;
    });
  };

  const handleUpdateQueueItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue((prevQueue) => {
      const updated = prevQueue.map((i) => (i.id === id ? { ...i, ...updates } : i));
      queueRef.current = updated;
      try {
        localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save queue item:', e);
      }
      return updated;
    });
  };

  const handleDeleteQueueItem = (id: string) => {
    setQueue((prevQueue) => {
      const updated = prevQueue.filter((i) => i.id !== id);
      queueRef.current = updated;
      try {
        localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to delete queue item:', e);
      }
      return updated;
    });
  };

  const handleClearCompletedQueue = () => {
    setQueue((prevQueue) => {
      const updated = prevQueue.filter((i) => i.status !== 'published');
      queueRef.current = updated;
      try {
        localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to clear completed queue:', e);
      }
      return updated;
    });
  };

  const handleClearAllQueue = () => {
    queueRef.current = [];
    setQueue([]);
    try {
      localStorage.removeItem(STORAGE_QUEUE_KEY);
    } catch (e) {
      console.warn('Failed to clear queue:', e);
    }
  };

  // Immediate or Automated Post Execution for a Queue Item
  const handlePostQueueItemNow = async (id: string, itemOverride?: QueueItem) => {
    if (isPostingRef.current.has(id)) return;
    const item = itemOverride || queueRef.current.find((q) => q.id === id);
    if (!item) return;

    isPostingRef.current.add(id);
    handleUpdateQueueItem(id, { status: 'posting' });

    const currentCreds = credentialsRef.current;
    const currentSettings = autoPostSettingsRef.current;
    const logs: string[] = [];
    const publishedAccounts: { platform: SocialPlatform; account: string; videoUrl?: string; videoId?: string }[] = [];
    let hasSuccess = false;
    let lastError = '';

    // Filter platforms to connected ones if at least one platform is connected
    const platformsToPost = item.platforms.filter((p) => {
      const token = currentCreds[p]?.accessToken;
      const refresh = (currentCreds[p] as any)?.refreshToken;
      return Boolean((token && token.trim()) || (refresh && refresh.trim()));
    });
    const effectivePlatforms = platformsToPost.length > 0 ? platformsToPost : item.platforms;

    try {
      for (const p of effectivePlatforms) {
        const token = currentCreds[p]?.accessToken;
        const refreshToken = (currentCreds[p] as any)?.refreshToken;
        if ((!token || !token.trim()) && (!refreshToken || !refreshToken.trim())) {
          logs.push(`⚠️ [${p.toUpperCase()}] Token não configurado em APIs & Conexões.`);
          continue;
        }

        try {
          const res = await fetchJson<any>('/api/post-social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: p,
              token: token || refreshToken,
              refreshToken: (currentCreds[p] as any)?.refreshToken,
              clientId: (currentCreds[p] as any)?.clientId,
              clientSecret: (currentCreds[p] as any)?.clientSecret,
              title: item.cutTitle,
              caption: `${item.caption[p]}\n\n${item.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`,
              privacy: currentSettings.defaultPrivacy,
              videoUrl: item.videoUrl,
              startTime: item.startTime,
              endTime: item.endTime,
              format: item.format,
              hook: item.hook,
            }),
          });

          if (res.ok && res.data.success) {
            hasSuccess = true;
            const account = res.data.account || 'Conta Conectada';
            const postedUrl = res.data.videoUrl;
            const postedId = res.data.videoId;
            publishedAccounts.push({ platform: p, account, videoUrl: postedUrl, videoId: postedId });
            logs.push(`✅ [${p.toUpperCase()}] ${res.data.message || 'Publicado com sucesso!'}`);
          } else {
            const err = res.data?.error || res.error || 'Erro na transmissão da rede social';
            lastError = err;
            logs.push(`❌ [${p.toUpperCase()}] ${err}`);
          }
        } catch (err: any) {
          lastError = err.message;
          logs.push(`❌ [${p.toUpperCase()}] Erro de conexão: ${err.message}`);
        }
      }

      if (hasSuccess) {
        handleUpdateQueueItem(id, {
          status: 'published',
          publishedAt: new Date().toISOString(),
          publishedAccounts,
          logs: [...(item.logs || []), ...logs],
        });
      } else {
        handleUpdateQueueItem(id, {
          status: 'failed',
          error: lastError || 'Nenhum token configurado para as redes selecionadas. Configure em APIs & Conexões.',
          logs: [...(item.logs || []), ...logs],
        });
      }
    } finally {
      isPostingRef.current.delete(id);
    }
  };

  const handleTriggerNextQueueNow = async () => {
    const next = [...queueRef.current]
      .filter((q) => q.status === 'pending')
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0];
    if (next) {
      await handlePostQueueItemNow(next.id, next);
    }
  };

  // Skip the 5-minute waiting timer for a specific item (or next waiting item), post it right away, and shift remaining pending items to +5min, +10min, +15min...
  const handleSkipWaitAndPostNow = async (targetId?: string) => {
    const pendingSorted = [...queueRef.current]
      .filter((q) => q.status === 'pending')
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

    const targetItem = targetId
      ? queueRef.current.find((q) => q.id === targetId)
      : pendingSorted[0];

    if (!targetItem) return;

    const intervalMs = (autoPostSettingsRef.current.intervalMinutes || 5) * 60 * 1000;
    const now = Date.now();
    let pendingRank = 1;

    // Shift all remaining pending items to now + 5m, now + 10m, etc.
    setQueue((prevQueue) => {
      const updated = prevQueue.map((item) => {
        if (item.id === targetItem.id) {
          return { ...item, scheduledFor: new Date(now).toISOString() };
        }
        if (item.status === 'pending') {
          const nextSchedule = new Date(now + pendingRank * intervalMs).toISOString();
          pendingRank += 1;
          return { ...item, scheduledFor: nextSchedule };
        }
        return item;
      });
      queueRef.current = updated;
      try {
        localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    await handlePostQueueItemNow(targetItem.id, targetItem);
  };

  // Re-align all pending items to strict 5-minute intervals from now
  const handleRescheduleEvery5Minutes = () => {
    handleUpdateAutoPostSettings({ intervalMinutes: 5, isActive: true });
    const now = Date.now();
    const intervalMs = 5 * 60 * 1000;
    let rank = 1;

    setQueue((prevQueue) => {
      const updated = prevQueue.map((item) => {
        if (item.status === 'pending') {
          const scheduledFor = new Date(now + rank * intervalMs).toISOString();
          rank += 1;
          return { ...item, scheduledFor };
        }
        return item;
      });
      queueRef.current = updated;
      try {
        localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // 1-Click Autonomous Bot: Choose Trending Video -> Analyze & Smart Frame -> Generate Viral Cuts -> Enqueue Every 5 Minutes & Post #1 Immediately!
  const handleStartAutoBot = async (customNiche: string = 'geral') => {
    if (autoBotStatus.isRunning) return;

    setLegalView(null);
    setActiveTab('publish');
    handleUpdateAutoPostSettings({ intervalMinutes: 5, isActive: true, autoEnqueueOnGenerate: true });

    const botLogs: string[] = [];
    const pushBotState = (patch: Partial<AutoBotStatus>, newLog?: string) => {
      if (newLog) botLogs.push(newLog);
      setAutoBotStatus((prev) => ({
        ...prev,
        ...patch,
        logs: [...botLogs],
      }));
    };

    pushBotState(
      {
        isRunning: true,
        step: 1,
        message: 'Passo 1/4: Buscando vídeos em alta no YouTube para escolher a melhor fonte...',
        chosenVideoTitle: undefined,
        chosenVideoUrl: undefined,
        cutsGenerated: undefined,
      },
      `🤖 [Passo 1/4] Buscando vídeos virais em alta no nicho "${customNiche}"...`
    );

    try {
      // STEP 1: Fetch trending videos & pick one not yet in queue
      const trendRes = await fetchJson<any>('/api/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: customNiche, refresh: true }),
      });

      const trendingList: any[] = trendRes.ok && Array.isArray(trendRes.data?.trending) ? trendRes.data.trending : [];
      const queuedUrls = new Set(queueRef.current.map((q) => q.videoUrl));
      const chosenVideo =
        trendingList.find((v) => v?.url && !queuedUrls.has(v.url)) ||
        trendingList[0] || {
          title: 'O PODER DA DISCIPLINA (COM RENATO CARIANI) | Os Sócios 160',
          url: 'https://www.youtube.com/watch?v=B57eOqeLVfc',
          channel: 'Os Sócios Podcast',
        };

      const targetUrl: string = chosenVideo.url;
      const targetTitle: string = chosenVideo.title || 'Podcast em Alta';
      setVideoUrl(targetUrl);

      pushBotState(
        {
          step: 2,
          chosenVideoTitle: targetTitle,
          chosenVideoUrl: targetUrl,
          message: `Passo 2/4: Vídeo escolhido! Extraindo transcrição e mapeando rosto em 9:16...`,
        },
        `✅ Vídeo selecionado: "${targetTitle}"`
      );

      // STEP 2: Fetch video metadata/transcript AND Gemini Vision speaker framing in parallel
      const [infoRes, framingRes] = await Promise.all([
        fetchJson<any>('/api/video-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        }),
        fetchJson<any>('/api/analyze-framing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: targetUrl, title: targetTitle }),
        }),
      ]);

      const fetchedInfo: VideoInfo = infoRes.ok && infoRes.data?.videoId
        ? {
            videoId: infoRes.data.videoId,
            videoUrl: targetUrl,
            title: infoRes.data.title || targetTitle,
            author: infoRes.data.author || chosenVideo.channel || 'Canal YouTube',
            thumbnail: infoRes.data.thumbnail || `https://img.youtube.com/vi/${infoRes.data.videoId}/maxresdefault.jpg`,
          }
        : {
            videoId: 'B57eOqeLVfc',
            videoUrl: targetUrl,
            title: targetTitle,
            author: chosenVideo.channel || 'Canal YouTube',
            thumbnail: 'https://img.youtube.com/vi/B57eOqeLVfc/maxresdefault.jpg',
          };

      const fetchedTranscript: string =
        (infoRes.ok && infoRes.data?.transcript) ||
        transcript ||
        '[00:15] O maior erro que as pessoas cometem é achar que motivação dura para sempre.\n[00:45] Quando a dopamina cai, você precisa de sistemas claros.';

      setVideoInfo(fetchedInfo);
      setTranscript(fetchedTranscript);

      const framingData = framingRes.ok && framingRes.data?.framing ? framingRes.data.framing : null;
      pushBotState(
        {
          step: 3,
          chosenVideoTitle: fetchedInfo.title,
          message: 'Passo 3/4: IA identificando os momentos mais virais e realizando os cortes...',
        },
        `🎯 Transcrição e enquadramento inteligente prontos (${framingData?.recommendedFormat || '9:16 Vertical'}). Gerando múltiplos cortes virais...`
      );

      // STEP 3: Generate multiple viral cuts with Gemini AI
      const cutsRes = await fetchJson<any>('/api/generate-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: fetchedInfo.title,
          transcript: fetchedTranscript,
          userPrompt: userPrompt || 'gere vários cortes virais dinâmicos com alto potencial de retenção',
        }),
      });

      let generatedCuts: ViralCut[] =
        cutsRes.ok && Array.isArray(cutsRes.data?.cuts) && cutsRes.data.cuts.length > 0
          ? cutsRes.data.cuts
          : viralCuts;

      if (framingData) {
        generatedCuts = generatedCuts.map((c) => ({
          ...c,
          framing: c.framing || framingData,
        }));
      }

      setViralCuts(generatedCuts);
      if (generatedCuts.length > 0) {
        setSelectedCut(generatedCuts[0]);
      }

      // STEP 4: Enqueue all cuts spaced by 5 minutes (First item scheduled for NOW, 2nd +5m, 3rd +10m...)
      const enqueuedItems = handleEnqueueCuts(generatedCuts, {
        immediateFirst: true,
        overrideVideoUrl: targetUrl,
        overrideVideoTitle: fetchedInfo.title,
        overrideIntervalMinutes: 5,
      });

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });

      pushBotState(
        {
          step: 4,
          cutsGenerated: enqueuedItems.length,
          message: `Passo 4/4: ${enqueuedItems.length} cortes agendados de 5 em 5 min! Publicando o 1º vídeo agora...`,
        },
        `🚀 ${enqueuedItems.length} cortes adicionados à fila com 5 minutos de diferença! Disparando o 1º corte imediatamente...`
      );

      if (enqueuedItems.length > 0) {
        await handlePostQueueItemNow(enqueuedItems[0].id, enqueuedItems[0]);
      }

      pushBotState(
        {
          isRunning: false,
          step: 4,
          cutsGenerated: enqueuedItems.length,
          message: `✅ Bot concluiu o 1º envio! Os próximos ${Math.max(0, enqueuedItems.length - 1)} cortes estão aguardando na fila de 5 em 5 min.`,
        },
        `🎉 1º corte processado! A fila automática postará o próximo vídeo a cada 5 minutos (ou clique em "Pular Tempo de Espera" abaixo).`
      );
    } catch (err: any) {
      console.error('AutoBot Error:', err);
      pushBotState(
        {
          isRunning: false,
          step: 0,
          message: `❌ Erro no Bot Automático: ${err.message || 'Falha inesperada'}`,
        },
        `❌ Erro: ${err.message || 'Falha ao executar pipeline automático'}`
      );
    }
  };

  const handleSwitchToDemoAndPost = async (id: string) => {
    const demoCreds: PlatformCredentials = {
      ...credentialsRef.current,
      youtube: {
        ...credentialsRef.current.youtube,
        accessToken: 'demo_youtube_shorts_verified_token',
        clientId: 'demo-client-id.apps.googleusercontent.com',
        clientSecret: 'demo-client-secret',
        status: 'connected',
        channelTitle: 'Canal YouTube (Modo Teste)',
        customUrl: '@canal.demonstracao',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
        verifiedAt: new Date().toLocaleTimeString('pt-BR'),
      },
    };
    handleSaveCredentials(demoCreds);
    setTimeout(() => {
      handlePostQueueItemNow(id);
    }, 150);
  };

  const handleToggleQueueActive = (active: boolean) => {
    handleUpdateAutoPostSettings({ isActive: active });
  };

  // Background Auto-Post Worker Engine (checks every 2 seconds for precision countdown)
  useEffect(() => {
    if (!autoPostSettings.isActive) return;

    const timer = setInterval(() => {
      // Do not start a second upload if one is already in flight
      if (isPostingRef.current.size > 0) return;

      const now = Date.now();
      const dueItem = [...queueRef.current]
        .filter((item) => item.status === 'pending' && new Date(item.scheduledFor).getTime() <= now)
        .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0];

      if (dueItem) {
        handlePostQueueItemNow(dueItem.id, dueItem);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [autoPostSettings.isActive]);

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

  return (
    <div className="min-h-screen bg-[#0b0c12] text-zinc-100 flex flex-col selection:bg-[#ff0055] selection:text-white">
      {/* Global Header & Nav */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cutsCount={viralCuts.length}
        savedCount={savedCuts.length}
        queueCount={queue.filter((q) => q.status === 'pending').length}
        isQueueActive={autoPostSettings.isActive}
        lastSavedAt={lastSavedAt}
        isSaving={isSaving}
        onManualSync={handleForceSync}
        onStartAutoBot={() => handleStartAutoBot('geral')}
        isAutoBotRunning={autoBotStatus.isRunning}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {legalView ? (
          <div className="bg-[#141520] border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-950/60 border border-purple-800/40 text-purple-300 uppercase tracking-wider">
                  Documento Oficial Obrigatório
                </span>
                <h2 className="text-2xl font-black text-white mt-2">
                  {legalView === 'privacy' ? 'Política de Privacidade (Privacy Policy)' : 'Termos de Serviço (Terms of Service)'}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  URL Oficial: <code className="text-yellow-300">{window.location.origin}/{legalView}</code>
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
                <h3 className="text-sm font-bold text-white">Privacy Policy for ViralShorts Studio AI</h3>
                <p className="text-[11px] text-zinc-500">Effective Date: October 2026</p>

                <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl space-y-1">
                  <h4 className="font-bold text-purple-300">TikTok Content Posting API Compliance</h4>
                  <p>
                    ViralShorts Studio AI requires authorization to upload user-selected videos to TikTok via the official Content Posting API. We access only the permissions you explicitly grant: <code>video.upload</code>, <code>video.publish</code>, and <code>user.info.basic</code>.
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-white">1. Information We Access and Collect</h4>
                  <p>We receive temporary OAuth access tokens strictly to publish short clips that you edit and approve in our web interface. We access your display name and avatar solely to show your connected channel status in the dashboard.</p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-white">2. No Selling of Data</h4>
                  <p>We do not sell, rent, or commercialize your personal information, tokens, or video media to any third party or data broker.</p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-white">3. Data Retention and Deletion</h4>
                  <p>OAuth tokens are stored securely in your browser and private session. You may revoke access at any time in TikTok settings or by clearing your keys under the "APIs & Conexões" tab in this application. For data deletion requests, contact: <strong>erick.moreiradefensoria@gmail.com</strong>.</p>
                </div>

                <div className="pt-4 border-t border-zinc-800 text-[11px] text-zinc-400">
                  Developer Contact: Erick Moreira • Email: erick.moreiradefensoria@gmail.com
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                <h3 className="text-sm font-bold text-white">Terms of Service for ViralShorts Studio AI</h3>
                <p className="text-[11px] text-zinc-500">Effective Date: October 2026</p>

                <div className="space-y-1">
                  <h4 className="font-bold text-white">1. Acceptance of Terms</h4>
                  <p>By using ViralShorts Studio AI, you agree to these Terms of Service. You are responsible for ensuring that all video clips and media you process adhere to applicable copyright laws and platform community guidelines.</p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-white">2. Third-Party Platform Terms</h4>
                  <p>Your use of TikTok, YouTube, and Instagram integrations is governed by the respective terms of service of each platform.</p>
                </div>

                <div className="pt-4 border-t border-zinc-800 text-[11px] text-zinc-400">
                  Developer Contact: Erick Moreira • Email: erick.moreiradefensoria@gmail.com
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {activeTab === 'trending' && (
              <TrendingTab
                onSelectVideo={handleSelectTrendingVideo}
                onStartAutoBot={handleStartAutoBot}
                isAutoBotRunning={autoBotStatus.isRunning}
              />
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
                autoPostSettings={autoPostSettings}
                onUpdateAutoPostSettings={handleUpdateAutoPostSettings}
                onEnqueueCuts={handleEnqueueCuts}
                onEnqueueSingleCut={handleEnqueueSingleCut}
                onNavigateToPublish={() => setActiveTab('publish')}
                queueCount={queue.filter((q) => q.status === 'pending').length}
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
                onEnqueueCut={handleEnqueueSingleCut}
              />
            )}

            {activeTab === 'publish' && (
              <PublisherTab
                videoUrl={videoUrl}
                videoInfo={videoInfo}
                currentCut={selectedCut}
                savedCuts={savedCuts}
                onDeleteSavedCut={handleDeleteSavedCut}
                onLoadSavedCut={handleLoadSavedCut}
                queue={queue}
                autoPostSettings={autoPostSettings}
                onUpdateAutoPostSettings={handleUpdateAutoPostSettings}
                onUpdateQueueItem={handleUpdateQueueItem}
                onDeleteQueueItem={handleDeleteQueueItem}
                onClearCompletedQueue={handleClearCompletedQueue}
                onClearAllQueue={handleClearAllQueue}
                onPostQueueItemNow={handlePostQueueItemNow}
                onTriggerNextQueueNow={handleTriggerNextQueueNow}
                onToggleQueueActive={handleToggleQueueActive}
                onEnqueueCurrentCut={handleEnqueueSingleCut}
                credentials={credentials}
                onSaveCredentials={handleSaveCredentials}
                onSwitchToDemoAndPost={handleSwitchToDemoAndPost}
                onStartAutoBot={handleStartAutoBot}
                autoBotStatus={autoBotStatus}
                onSkipWaitAndPostNow={handleSkipWaitAndPostNow}
                onRescheduleEvery5Minutes={handleRescheduleEvery5Minutes}
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
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-pointer" onClick={() => { setLegalView(null); setActiveTab('trending'); }}>
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              Tendências
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-pointer" onClick={() => { setLegalView(null); setActiveTab('analyze'); }}>
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              Detecção IA
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-pointer" onClick={() => { setLegalView(null); setActiveTab('editor'); }}>
              <Scissors className="w-3.5 h-3.5 text-yellow-400" />
              Editor 9:16
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-pointer" onClick={() => { setLegalView(null); setActiveTab('publish'); }}>
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              Publicação
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-pointer" onClick={() => { setLegalView(null); setActiveTab('settings'); }}>
              <Key className="w-3.5 h-3.5 text-pink-400" />
              APIs & Conexões
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <button
              onClick={() => {
                setLegalView('privacy');
                window.history.pushState({}, '', '/privacy');
              }}
              className="hover:text-purple-400 underline transition"
            >
              Política de Privacidade (/privacy)
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setLegalView('terms');
                window.history.pushState({}, '', '/terms');
              }}
              className="hover:text-purple-400 underline transition"
            >
              Termos de Serviço (/terms)
            </button>
          </div>
        </div>
      </footer>

      {/* PWA Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}
