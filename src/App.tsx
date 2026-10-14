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

const STORAGE_SAVED_CUTS_KEY = 'viral_shorts_saved_cuts_v2';
const STORAGE_CREDENTIALS_KEY = 'viral_shorts_full_credentials_v1';
const STORAGE_QUEUE_KEY = 'viral_shorts_autopost_queue_v2';
const STORAGE_QUEUE_SETTINGS_KEY = 'viral_shorts_autopost_settings_v2';

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
    title: 'O PODER DA DISCIPLINA (COM RENATO CARIANI) | Joel Jota',
    author: 'Joel Jota',
    thumbnail: 'https://img.youtube.com/vi/B57eOqeLVfc/maxresdefault.jpg',
  });
  const [transcript, setTranscript] = useState<string>(
    '[38:17] Eu fazia ações e quando eu não tinha esses resultados muito bem claros eu corria atrás até entregar.\n[38:42] Ser uma pessoa competitiva é uma arma poderosa: qualquer coisa nunca está bom.\n[39:06] Quando eu entrei na área digital e comecei a gravar, construí o maior canal de musculação do mundo começando do zero.\n[39:55] Eu tenho várias competições silenciosas comigo mesmo para nunca acomodar.\n[40:43] No começo do ano todo mundo faz promessa, mas quem não é condicionado morre no meio do caminho antes da linha de chegada.\n[41:30] Competitividade e metas claras fazem parte de todo profissional de sucesso.\n[42:21] Disciplina não é um estado sazonal: é um padrão diário inegociável.'
  );
  const [userPrompt, setUserPrompt] = useState<string>(
    'encontrar a parte de fala mais interessante e chamativa para o público e criar cortes em sequência contínua (Parte 1, Parte 2, Parte 3...)'
  );
  const [viralCuts, setViralCuts] = useState<ViralCut[]>([
    {
      id: 'cut-seq-1',
      title: '🔥 [PARTE 1] SER UMA PESSOA COMPETITIVA É UMA ARMA PODEROSA — Renato Cariani',
      partBadge: 'PARTE 1',
      startTime: '38:17',
      endTime: '39:06',
      startSeconds: 2297,
      endSeconds: 2346,
      durationSeconds: 49,
      viralityScore: 99,
      hook: '"Eu fazia ações e quando eu não tinha esses resultados muito bem claros, eu corria atrás até virar o jogo..."',
      payoff: '"Ser uma pessoa competitiva é uma arma poderosa — não aceite que qualquer coisa está bom!"',
      teaserOffsetSec: 25,
      teaserDurationSec: 4,
      teaserStartTime: '38:42',
      teaserEndTime: '38:46',
      teaserText: 'SER UMA PESSOA COMPETITIVA É UMA ARMA PODEROSA!',
      retentionStrategyOption: 3,
      neuromarketingTrigger: 'Gancho Cold-Open Clímax (00:00–00:04) & Início da História',
      viralityAnalysis: 'Pico #1 de interesse e retenção do público ("Mais Reproduzidos") detectado em 38:17. Começa com 4s do clímax em 38:42 e desenvolve a história limpa sem poluição visual.',
      recommendedFormat: 'speaker_center',
      activeSpeaker: 'Renato Cariani (Centralizado)',
      subtitleTheme: 'none',
      framing: {
        speaker1X: 50,
        speaker1Y: 30,
        speaker2X: 50,
        speaker2Y: 30,
        zoom: 1.0,
        detectedFacesCount: 1,
      },
      caption: {
        youtube: '🔥 [PARTE 1] — "Ser uma pessoa competitiva é uma arma poderosa!"\n\n⏭️ A Parte 2 (continuação direta dessa fala) sai em instantes aqui no canal! Siga para não perder.\n\n#Shorts #Cortes #RenatoCariani #Disciplina #Viral',
        instagram: '🔥 [PARTE 1] — "Ser uma pessoa competitiva é uma arma poderosa!"\n\n⏭️ A Parte 2 (continuação direta dessa fala) sai em instantes no perfil! Siga para acompanhar.',
        tiktok: '🔥 [PARTE 1] — "Ser uma pessoa competitiva é uma arma poderosa!" ⏭️ Parte 2 (continuação) no perfil! #cortes #podcast #disciplina #viral',
      },
      hashtags: ['#Shorts', '#Cortes', '#Disciplina', '#RenatoCariani', '#Viral'],
      overlaySubtitlesSample: ['ARMA PODEROSA', 'SEJA COMPETITIVO', 'RESULTADO CLARO', 'CORRA ATRÁS', 'NUNCA ACOMODE', 'VIRE O JOGO'],
    },
    {
      id: 'cut-seq-2',
      title: '🔥 [PARTE 2 - CONTINUAÇÃO] COMO ELE CRIOU O MAIOR CANAL DE MUSCULAÇÃO DO MUNDO DO ZERO',
      partBadge: 'PARTE 2',
      startTime: '39:06',
      endTime: '39:55',
      startSeconds: 2346,
      endSeconds: 2395,
      durationSeconds: 49,
      viralityScore: 98,
      hook: '"Quando eu entrei na área digital e comecei a gravar, construí o maior canal de musculação do mundo começando do zero..."',
      payoff: '"Hoje é ainda mais competitivo — e é exatamente isso que separa quem cresce de quem para."',
      teaserOffsetSec: 24,
      teaserDurationSec: 4,
      teaserStartTime: '39:30',
      teaserEndTime: '39:34',
      teaserText: 'CONSTRUÍ O MAIOR CANAL DO MUNDO COMEÇANDO DO ZERO!',
      retentionStrategyOption: 3,
      neuromarketingTrigger: 'Gancho Cold-Open Clímax & Continuação Direta (Parte 2)',
      viralityAnalysis: 'Continuação direta e sequencial da Parte 1 (38:17–39:06 → 39:06–39:55), mantendo 100% do contexto e da linha de raciocínio.',
      recommendedFormat: 'speaker_center',
      activeSpeaker: 'Renato Cariani (Centralizado)',
      subtitleTheme: 'none',
      framing: {
        speaker1X: 50,
        speaker1Y: 30,
        speaker2X: 50,
        speaker2Y: 30,
        zoom: 1.0,
        detectedFacesCount: 1,
      },
      caption: {
        youtube: '🔥 [PARTE 2 - CONTINUAÇÃO] — Como ele construiu o maior canal de musculação do mundo começando do zero!\n\n⏭️ A Parte 3 (continuação direta) sai em instantes aqui no canal!\n\n#Shorts #Cortes #RenatoCariani #Sucesso',
        instagram: '🔥 [PARTE 2 - CONTINUAÇÃO] — Do zero ao maior canal do mundo!\n\n⏭️ Parte 3 (continuação) já vai ao ar!',
        tiktok: '🔥 [PARTE 2 - CONTINUAÇÃO] — Do zero ao maior do mundo! ⏭️ Parte 3 a seguir! #cortes #podcast #viral',
      },
      hashtags: ['#Shorts', '#Cortes', '#Mentalidade', '#Sucesso', '#Viral'],
      overlaySubtitlesSample: ['MAIOR DO MUNDO', 'COMEÇOU DO ZERO', 'ÁREA DIGITAL', 'CRESCIMENTO REAL', 'SEM PARAR', 'ALTO NÍVEL'],
    },
    {
      id: 'cut-seq-3',
      title: '🔥 [PARTE 3 - CONTINUAÇÃO] A TÉCNICA DA COMPETIÇÃO SILENCIOSA PARA BATER METAS',
      partBadge: 'PARTE 3',
      startTime: '39:55',
      endTime: '40:43',
      startSeconds: 2395,
      endSeconds: 2443,
      durationSeconds: 48,
      viralityScore: 98,
      hook: '"Eu tenho várias competições contra um monte de gente que nem sabe que está competindo comigo..."',
      payoff: '"Com meta é assim também: você cria um alvo claro para nunca entrar na zona de conforto."',
      teaserOffsetSec: 23,
      teaserDurationSec: 4,
      teaserStartTime: '40:18',
      teaserEndTime: '40:22',
      teaserText: 'VOCÊ CRIA UM ALVO CLARO PARA NUNCA ACOMODAR!',
      retentionStrategyOption: 3,
      neuromarketingTrigger: 'Gancho Cold-Open Clímax & Quebra de Padrão (Parte 3)',
      viralityAnalysis: 'Continuação direta e sequencial da Parte 2 (39:06–39:55 → 39:55–40:43), mantendo 100% do contexto e da linha de raciocínio.',
      recommendedFormat: 'speaker_center',
      activeSpeaker: 'Renato Cariani (Centralizado)',
      subtitleTheme: 'none',
      framing: {
        speaker1X: 50,
        speaker1Y: 30,
        speaker2X: 50,
        speaker2Y: 30,
        zoom: 1.0,
        detectedFacesCount: 1,
      },
      caption: {
        youtube: '🔥 [PARTE 3 - CONTINUAÇÃO] — A técnica mental das metas e da competição silenciosa!\n\n⏭️ A Parte 4 sai em instantes aqui no canal!\n\n#Shorts #Cortes #Metas #Foco',
        instagram: '🔥 [PARTE 3 - CONTINUAÇÃO] — A técnica da competição silenciosa para nunca acomodar.\n\n⏭️ Parte 4 na sequência!',
        tiktok: '🔥 [PARTE 3 - CONTINUAÇÃO] — Nunca entre na zona de conforto! #cortes #metas #foco #viral',
      },
      hashtags: ['#Shorts', '#Cortes', '#Metas', '#Foco', '#AltaPerformance'],
      overlaySubtitlesSample: ['ALVO CLARO', 'SEM ACOMODAR', 'META FORTE', 'ZONA ZERO', 'JOGO MENTAL', 'VENCE NO SILÊNCIO'],
    },
    {
      id: 'cut-seq-4',
      title: '🔥 [PARTE 4 - CONTINUAÇÃO] POR QUE QUEM NÃO É CONDICIONADO MORRE NO MEIO DO CAMINHO',
      partBadge: 'PARTE 4',
      startTime: '40:43',
      endTime: '41:30',
      startSeconds: 2443,
      endSeconds: 2490,
      durationSeconds: 47,
      viralityScore: 97,
      hook: '"No começo do ano todo mundo faz promessa, mas quando a pessoa não é condicionada ela morre no meio do caminho..."',
      payoff: '"Quando ela vê a linha de chegada, já perdeu o fôlego porque não treinou a constância."',
      teaserOffsetSec: 22,
      teaserDurationSec: 4,
      teaserStartTime: '41:05',
      teaserEndTime: '41:09',
      teaserText: 'QUEM NÃO TREINA A CONSTÂNCIA PARA NO MEIO DO CAMINHO!',
      retentionStrategyOption: 3,
      neuromarketingTrigger: 'Gancho Cold-Open Clímax & Revelação Central (Parte 4)',
      viralityAnalysis: 'Continuação direta e sequencial da Parte 3 (39:55–40:43 → 40:43–41:30), mantendo 100% do contexto e da linha de raciocínio.',
      recommendedFormat: 'speaker_center',
      activeSpeaker: 'Renato Cariani (Centralizado)',
      subtitleTheme: 'none',
      framing: {
        speaker1X: 50,
        speaker1Y: 30,
        speaker2X: 50,
        speaker2Y: 30,
        zoom: 1.0,
        detectedFacesCount: 1,
      },
      caption: {
        youtube: '🔥 [PARTE 4 - CONTINUAÇÃO] — Por que 99% das promessas morrem no meio do caminho?\n\n⏭️ A Parte 5 sai em instantes aqui no canal!\n\n#Shorts #Cortes #Constancia #Disciplina',
        instagram: '🔥 [PARTE 4 - CONTINUAÇÃO] — Não pare no meio do caminho antes da linha de chegada!',
        tiktok: '🔥 [PARTE 4 - CONTINUAÇÃO] — O segredo do condicionamento mental! #cortes #disciplina #viral',
      },
      hashtags: ['#Shorts', '#Cortes', '#Constancia', '#Disciplina', '#Mindset'],
      overlaySubtitlesSample: ['NÃO PARE', 'LINHA FINAL', 'TREINE CONSTÂNCIA', 'FÔLEGO REAL', 'ATÉ O FIM', 'VÁ ALÉM'],
    },
    {
      id: 'cut-seq-5',
      title: '🔥 [PARTE 5 - CONTINUAÇÃO] METAS DE FATURAMENTO E A MENTALIDADE DOS VENCEDORES',
      partBadge: 'PARTE 5',
      startTime: '41:30',
      endTime: '42:21',
      startSeconds: 2490,
      endSeconds: 2541,
      durationSeconds: 51,
      viralityScore: 97,
      hook: '"Lógico que eu quero resultado: eu tenho meta de faturamento e competitividade faz parte de todo profissional de sucesso..."',
      payoff: '"Quem diz que o importante é só competir nunca construiu nada extraordinário."',
      teaserOffsetSec: 25,
      teaserDurationSec: 4,
      teaserStartTime: '41:55',
      teaserEndTime: '41:59',
      teaserText: 'COMPETITIVIDADE FAZ PARTE DE TODO PROFISSIONAL DE SUCESSO!',
      retentionStrategyOption: 3,
      neuromarketingTrigger: 'Gancho Cold-Open Clímax & Exemplo Real (Parte 5)',
      viralityAnalysis: 'Continuação direta e sequencial da Parte 4 (40:43–41:30 → 41:30–42:21), mantendo 100% do contexto e da linha de raciocínio.',
      recommendedFormat: 'speaker_center',
      activeSpeaker: 'Renato Cariani (Centralizado)',
      subtitleTheme: 'none',
      framing: {
        speaker1X: 50,
        speaker1Y: 30,
        speaker2X: 50,
        speaker2Y: 30,
        zoom: 1.0,
        detectedFacesCount: 1,
      },
      caption: {
        youtube: '🔥 [PARTE 5 - CONTINUAÇÃO] — A verdade sobre metas de resultado e ambição saudável!\n\n⏭️ A Parte 6 (Final da sequência) sai em instantes!\n\n#Shorts #Cortes #Negocios #Sucesso',
        instagram: '🔥 [PARTE 5 - CONTINUAÇÃO] — Competitividade faz parte de todo profissional de sucesso.',
        tiktok: '🔥 [PARTE 5 - CONTINUAÇÃO] — "O importante é competir?" Veja essa resposta! #cortes #negocios #viral',
      },
      hashtags: ['#Shorts', '#Cortes', '#Negocios', '#Resultados', '#Sucesso'],
      overlaySubtitlesSample: ['META CLARA', 'RESULTADO FORTE', 'MENTALIDADE REAL', 'JOGUE PRA VENCER', 'ALTA PERFORMANCE', 'SUCESSO REAL'],
    },
    {
      id: 'cut-seq-6',
      title: '🔥 [PARTE 6 - FINAL] A DISCIPLINA NÃO É SAZONAL: É UM PADRÃO DE VIDA INEGOCIÁVEL',
      partBadge: 'PARTE 6 - FINAL',
      startTime: '42:21',
      endTime: '43:08',
      startSeconds: 2541,
      endSeconds: 2588,
      durationSeconds: 47,
      viralityScore: 99,
      hook: '"A disciplina não é um estado sazonal — ela é um padrão de comportamento quando você acorda todos os dias..."',
      payoff: '"Conclusão definitiva: quando você transforma rotina em identidade, ninguém te para."',
      teaserOffsetSec: 22,
      teaserDurationSec: 4,
      teaserStartTime: '42:43',
      teaserEndTime: '42:47',
      teaserText: 'DISCIPLINA NÃO É SAZONAL, É UM PADRÃO DE VIDA!',
      retentionStrategyOption: 3,
      neuromarketingTrigger: 'Gancho Cold-Open Clímax & Lição de Ouro (Desfecho Final)',
      viralityAnalysis: 'Desfecho direto e sequencial da Parte 5 (41:30–42:21 → 42:21–43:08), fechando o raciocínio completo com chave de ouro.',
      recommendedFormat: 'speaker_center',
      activeSpeaker: 'Renato Cariani (Centralizado)',
      subtitleTheme: 'none',
      framing: {
        speaker1X: 50,
        speaker1Y: 30,
        speaker2X: 50,
        speaker2Y: 30,
        zoom: 1.0,
        detectedFacesCount: 1,
      },
      caption: {
        youtube: '🔥 [PARTE 6 - FINAL] — A disciplina não é sazonal, é um padrão de vida!\n\n✅ Sequência completa! Volte no canal se perdeu a Parte 1.\n\n#Shorts #Cortes #Disciplina #RenatoCariani #JoelJota',
        instagram: '🔥 [PARTE 6 - FINAL] — Fechando essa sequência incrível sobre disciplina e competitividade! ✅ Veja as partes anteriores no perfil.',
        tiktok: '🔥 [PARTE 6 - FINAL] — Disciplina é padrão de vida! ✅ Sequência completa no perfil! #cortes #disciplina #viral',
      },
      hashtags: ['#Shorts', '#Cortes', '#Disciplina', '#habitos', '#Viral'],
      overlaySubtitlesSample: ['PADRÃO DE VIDA', 'DISCIPLINA REAL', 'TODO SANTO DIA', 'ROTINA FORTE', 'NINGUÉM TE PARA', 'LIÇÃO FINAL'],
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
    const isLegacyRandomCut = (item: any): boolean => {
      if (!item) return false;
      const cid = String(item.cutId || item.id || '');
      const title = String(item.cutTitle || item.title || '');
      if (cid.includes('cut-demo-')) return true;
      if (title.includes('(CO ') || title === 'A ILUSÃO DA MOTIVAÇÃO 🧠') return true;
      if (item.startTime === '00:15' && item.endTime === '00:55') return true;
      return false;
    };

    try {
      const stored = localStorage.getItem(STORAGE_SAVED_CUTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).filter((c: any) => !isLegacyRandomCut(c));
        setSavedCuts(parsed);
      } else {
        setSavedCuts([
          {
            id: 'sample-seq-cut-1',
            videoTitle: 'O PODER DA DISCIPLINA (COM RENATO CARIANI) | Joel Jota',
            videoUrl: 'https://www.youtube.com/watch?v=B57eOqeLVfc',
            cutTitle: '🔥 [PARTE 1] SER UMA PESSOA COMPETITIVA É UMA ARMA PODEROSA — Renato Cariani',
            startTime: '38:17',
            endTime: '39:06',
            durationSeconds: 49,
            format: 'split_screen',
            viralityScore: 99,
            caption: '🔥 [PARTE 1] — "Ser uma pessoa competitiva é uma arma poderosa!"\n\n⏭️ A Parte 2 (continuação direta) sai em instantes!',
            hashtags: ['Shorts', 'Disciplina', 'RenatoCariani'],
            createdAt: new Date().toLocaleDateString('pt-BR'),
          },
        ]);
      }

      // Load queue
      const storedQueue = localStorage.getItem(STORAGE_QUEUE_KEY);
      if (storedQueue) {
        const parsedQ = JSON.parse(storedQueue).filter((q: any) => q.status === 'published' || !isLegacyRandomCut(q));
        setQueue(parsedQ);
      } else {
        const nowMs = Date.now();
        const defaultSeqQueue: QueueItem[] = viralCuts.map((c, idx) => ({
          id: `sample-seq-queue-${idx + 1}`,
          cutId: c.id,
          videoTitle: 'O PODER DA DISCIPLINA (COM RENATO CARIANI) | Joel Jota',
          videoUrl: 'https://www.youtube.com/watch?v=B57eOqeLVfc',
          cutTitle: c.title,
          startTime: c.startTime,
          endTime: c.endTime,
          durationSeconds: c.durationSeconds,
          format: c.recommendedFormat,
          viralityScore: c.viralityScore,
          hook: c.hook,
          payoff: c.payoff,
          caption: c.caption,
          hashtags: c.hashtags,
          platforms: ['youtube'],
          scheduledFor: new Date(nowMs + (idx + 1) * 5 * 60 * 1000).toISOString(),
          status: 'pending',
          createdAt: new Date(nowMs).toISOString(),
        }));
        setQueue(defaultSeqQueue);
      }

      // Load auto post settings
      const storedQueueSettings = localStorage.getItem(STORAGE_QUEUE_SETTINGS_KEY);
      if (storedQueueSettings) {
        const parsedSettings = JSON.parse(storedQueueSettings);
        if (parsedSettings.intervalMinutes === 30 || parsedSettings.intervalMinutes === 15) {
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
              const cleanSaved = res.state.savedCuts.filter((c: any) => !isLegacyRandomCut(c));
              if (cleanSaved.length > 0) setSavedCuts(cleanSaved);
            }
            if (Array.isArray(res.state.queue) && res.state.queue.length > 0) {
              const cleanQueue = res.state.queue.filter(
                (q: any) => q.status === 'published' || !isLegacyRandomCut(q)
              );
              if (cleanQueue.length > 0) setQueue(cleanQueue);
            }
            if (res.state.autoPostSettings) {
              const loadedSettings = { ...res.state.autoPostSettings };
              if (loadedSettings.intervalMinutes === 30 || loadedSettings.intervalMinutes === 15) {
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
      // Store public profile status and usernames in localStorage, without raw unencrypted secrets
      const safePublicCreds: PlatformCredentials = {
        youtube: {
          ...newCreds.youtube,
          accessToken: newCreds.youtube?.accessToken ? '***stored_in_backend_vault***' : '',
          refreshToken: newCreds.youtube?.refreshToken ? '***stored_in_backend_vault***' : '',
          clientSecret: '',
        },
        instagram: {
          ...newCreds.instagram,
          accessToken: newCreds.instagram?.accessToken ? '***stored_in_backend_vault***' : '',
          appSecret: '',
        },
        tiktok: {
          ...newCreds.tiktok,
          accessToken: newCreds.tiktok?.accessToken ? '***stored_in_backend_vault***' : '',
          clientSecret: '',
        },
      };
      localStorage.setItem(STORAGE_CREDENTIALS_KEY, JSON.stringify(safePublicCreds));
      localStorage.removeItem('viral_shorts_platform_tokens_v1');

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

      // STEP 2: Fetch video metadata, real spoken transcript + YouTube Heatmap, and Gemini Vision speaker framing in parallel
      const [infoRes, transcriptRes, framingRes] = await Promise.all([
        fetchJson<any>('/api/video-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        }),
        fetchJson<any>('/api/transcript', {
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
        (transcriptRes.ok && transcriptRes.data?.transcript) || '';

      setVideoInfo(fetchedInfo);
      if (fetchedTranscript) {
        setTranscript(fetchedTranscript);
      }

      const framingData = framingRes.ok && (framingRes.data?.framing || framingRes.data) ? (framingRes.data?.framing || framingRes.data) : null;
      pushBotState(
        {
          step: 3,
          chosenVideoTitle: fetchedInfo.title,
          message: 'Passo 3/4: IA localizando a fala mais interessante e criando cortes em continuação (Parte 1, 2, 3...)...',
        },
        `🎯 Transcrição real (${transcriptRes.data?.count || 'vários'} trechos) + Mapa de Retenção extraídos! Criando sequência contínua de cortes...`
      );

      // STEP 3: Generate connected sequential viral cuts (Parte 1 -> Parte 2 -> Parte 3...) via /api/analyze
      const cutsRes = await fetchJson<any>('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: targetUrl,
          videoTitle: fetchedInfo.title,
          channelName: fetchedInfo.author,
          transcript: fetchedTranscript,
          cutsCount: 6,
          userPrompt:
            userPrompt ||
            'encontrar a parte de fala mais interessante e chamativa para o público e criar cortes em sequência contínua (Parte 1, Parte 2, Parte 3...)',
        }),
      });

      let generatedCuts: ViralCut[] =
        cutsRes.ok && Array.isArray(cutsRes.data?.cuts) && cutsRes.data.cuts.length > 0
          ? cutsRes.data.cuts
          : viralCuts;

      if (framingData && typeof framingData.speaker1X === 'number') {
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
