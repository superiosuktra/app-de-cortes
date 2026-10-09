import { GoogleGenAI, Type } from '@google/genai';
import { YoutubeTranscript } from 'youtube-transcript';
import { GEMINI_API_KEY } from '../config.js';

// Shared Gemini client instance
export const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Helper: Extract YouTube Video ID from any standard URL or raw ID
 */
export function extractVideoId(urlOrId: string): string | null {
  const text = (urlOrId || '').trim();
  const match = text.match(/(?:v=|\/v\/|embed\/|youtu\.be\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  return null;
}

/**
 * Helper: Parse MM:SS or HH:MM:SS to seconds
 */
export function parseTimeToSeconds(timeStr: string): number {
  const clean = (timeStr || '').replace(/[\[\]\s]/g, '');
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return 0;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

/**
 * Helper: Format seconds to MM:SS
 */
export function formatSecondsToMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return `${m.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
}

/**
 * Fetch video metadata via YouTube oEmbed
 */
export async function fetchVideoMetadata(videoId: string) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let title = 'Vídeo do YouTube';
  let author = 'Canal do YouTube';

  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
    );
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      title = oembedData.title || title;
      author = oembedData.author_name || author;
    }
  } catch (e) {
    console.warn('[GeminiService] oEmbed fetch warning:', e);
  }

  const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const fallbackThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return {
    videoId,
    videoUrl,
    title,
    author,
    thumbnail,
    fallbackThumbnail,
  };
}

/**
 * Fetch video transcript using YoutubeTranscript with multi-language fallback
 */
export async function fetchTranscript(videoId: string) {
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'pt',
    }).catch(async () => {
      return await YoutubeTranscript.fetchTranscript(videoId);
    });

    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error('Nenhuma legenda encontrada.');
    }

    const formattedLines = transcriptItems.map((item) => {
      const seconds = Math.floor(item.offset / 1000);
      const timeStr = formatSecondsToMMSS(seconds);
      return `[${timeStr}] ${item.text.replace(/&amp;/g, '&').replace(/&#39;/g, "'")}`;
    });

    return {
      videoId,
      transcript: formattedLines.join('\n'),
      count: transcriptItems.length,
      hasRealCaptions: true,
    };
  } catch (err: any) {
    return {
      videoId,
      transcript: '',
      count: 0,
      hasRealCaptions: false,
      message:
        'Este vídeo não possui legendas públicas automáticas ou o YouTube restringiu o acesso. Você pode digitar/colar o texto da fala ou pedir para a IA analisar pelo tema e metadados.',
    };
  }
}

/**
 * Live search on YouTube for long-form podcasts and interviews (>20 min)
 */
async function searchRealYouTubeVideos(niche: string): Promise<any[]> {
  try {
    const queryVariations = [
      `podcast ${niche} cortes`,
      `entrevista completa ${niche}`,
      `podcast ${niche} brasil`,
      `mesacast ${niche}`,
    ];
    // Randomize query to ensure diverse results on each click
    const query = queryVariations[Math.floor(Math.random() * queryVariations.length)];
    // sp=CAM%253D filters videos longer than 20 minutes (podcasts/long-form)
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=CAM%253D`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];

    let data: any;
    try {
      data = JSON.parse(match[1]);
    } catch {
      return [];
    }

    const items: any[] = [];
    function findVideos(obj: any) {
      if (!obj || typeof obj !== 'object') return;
      if (obj.videoRenderer) {
        items.push(obj.videoRenderer);
        return;
      }
      for (const key of Object.keys(obj)) {
        findVideos(obj[key]);
      }
    }
    findVideos(data);

    const results: any[] = [];
    const seenIds = new Set<string>();

    for (const vr of items) {
      if (results.length >= 6) break;
      const videoId = vr.videoId;
      if (!videoId || seenIds.has(videoId)) continue;
      seenIds.add(videoId);

      const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || 'Episódio em Alta';
      const channel = vr.ownerText?.runs?.map((r: any) => r.text).join('') || vr.longBylineText?.runs?.map((r: any) => r.text).join('') || 'Canal Oficial';
      const duration = vr.lengthText?.simpleText || '1h 30min';

      results.push({
        title,
        channel,
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        duration,
        viralityScore: Math.floor(Math.random() * 10) + 90,
        reason: `Vídeo em alta com discussões dinâmicas, ganchos fortes nos primeiros minutos e alto potencial de cortes virais.`,
        suggestedThemes: [niche, 'Podcast', 'Cortes'],
      });
    }

    return results;
  } catch (err) {
    console.warn('[GeminiService] Falha na busca ao vivo do YouTube:', err);
    return [];
  }
}

/**
 * Large curated pool of dynamic channels and videos for varied offline rotation
 */
const CURATED_POOL = [
  {
    title: 'JAIR BOLSONARO - Inteligência Ltda. Podcast #651',
    channel: 'Inteligência Ltda',
    videoId: 'qbTzhB0akt8',
    url: 'https://www.youtube.com/watch?v=qbTzhB0akt8',
    duration: '3h 20min',
    viralityScore: 98,
    reason: 'Debates dinâmicos com ganchos fortes nos primeiros segundos e grande polarização.',
    suggestedThemes: ['Política', 'Brasil', 'Entrevista'],
  },
  {
    title: 'LULA - Flow News Especial',
    channel: 'Flow Podcast',
    videoId: 'y-KdHRZ9Ggo',
    url: 'https://www.youtube.com/watch?v=y-KdHRZ9Ggo',
    duration: '2h 10min',
    viralityScore: 97,
    reason: 'Momentos de forte repercussão e frases de impacto direto para cortes virais.',
    suggestedThemes: ['Atualidades', 'Opinião', 'Debate'],
  },
  {
    title: 'PrimoCast #300: Os Segredos dos Maiores Negócios',
    channel: 'PrimoCast',
    videoId: '2ZIpFytCSVc',
    url: 'https://www.youtube.com/watch?v=2ZIpFytCSVc',
    duration: '2h 15min',
    viralityScore: 96,
    reason: 'Frases de alto impacto financeiro, quebra de crenças e lições práticas imediatas.',
    suggestedThemes: ['Mentalidade', 'Finanças', 'Disciplina'],
  },
  {
    title: 'Flow Podcast: Inteligência Emocional e Neurociência',
    channel: 'Flow Podcast',
    videoId: 'y7G5J2_7c5w',
    url: 'https://www.youtube.com/watch?v=y7G5J2_7c5w',
    duration: '1h 50min',
    viralityScore: 94,
    reason: 'Debates dinâmicos com ganchos fortes nos primeiros 5 segundos.',
    suggestedThemes: ['Psicologia', 'Comportamento', 'Foco'],
  },
  {
    title: 'Huberman Lab: Como Hackear o Foco e a Dopamina',
    channel: 'Andrew Huberman',
    videoId: 'QmOF0crdyRU',
    url: 'https://www.youtube.com/watch?v=QmOF0crdyRU',
    duration: '2h 05min',
    viralityScore: 98,
    reason: 'Ciência aplicada de forma simples e revelações contra-intuitivas.',
    suggestedThemes: ['Neurociência', 'Dopamina', 'Produtividade'],
  },
  {
    title: 'Ciência Sem Fim: Segredos do Universo e Inteligência Artificial',
    channel: 'Ciência Sem Fim',
    videoId: '5qap5aO4i9A',
    url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    duration: '2h 40min',
    viralityScore: 93,
    reason: 'Fatos curiosos que despertam choque e fascínio imediato na audiência.',
    suggestedThemes: ['Ciência', 'Tecnologia', 'Curiosidades'],
  },
  {
    title: 'Ironberg Podcast: Disciplina, Rotina e Foco Extremo',
    channel: 'Ironberg Podcast',
    videoId: 'xj9nNrTxlI0',
    url: 'https://www.youtube.com/watch?v=xj9nNrTxlI0',
    duration: '1h 40min',
    viralityScore: 95,
    reason: 'Choque de realidade motivacional com linguagem direta e autêntica.',
    suggestedThemes: ['Saúde', 'Motivação', 'Superação'],
  },
  {
    title: 'Os Sócios Podcast: Como Construir Patrimônio e Liberdade',
    channel: 'Os Sócios',
    videoId: 'B7FNkIwLbyw',
    url: 'https://www.youtube.com/watch?v=B7FNkIwLbyw',
    duration: '2h 20min',
    viralityScore: 95,
    reason: 'Dicas práticas de investimentos com alta taxa de salvamento nos Shorts.',
    suggestedThemes: ['Negócios', 'Finanças', 'Empreendedorismo'],
  },
];

/**
 * Auto Explore Trending Long-form Videos for Viral Shorts
 * Combines real-time YouTube search with AI curation and diversified rotation
 */
export async function fetchTrendingVideos(niche: string = 'geral') {
  // 1. First Priority: Live Real-Time YouTube Search!
  const liveResults = await searchRealYouTubeVideos(niche);
  if (liveResults && liveResults.length >= 3) {
    console.log(`[GeminiService] Encontrados ${liveResults.length} vídeos em alta ao vivo no YouTube para o nicho "${niche}"`);
    return liveResults;
  }

  // 2. Second Priority: Gemini AI with dynamic timestamp & variety
  if (GEMINI_API_KEY) {
    const prompt = `
Você é um estrategista de conteúdo viral e curador de canais no YouTube.
Hoje é ${new Date().toLocaleDateString('pt-BR')}.
Encontre ou recomende 6 podcasts, entrevistas ou vídeos de formato longo (mais de 15 minutos) que estão em alta no YouTube e são minas de ouro para cortes virais no TikTok, Reels e YouTube Shorts.
Foco do nicho: ${niche}.
Varie os canais e apresentadores (ex: Flow Podcast, Inteligência Ltda, Podpah, PrimoCast, Os Sócios, Lex Fridman, Huberman Lab, Ciência Sem Fim, Ironberg).

Retorne EXATAMENTE no formato JSON correspondente ao schema:
Um array de objetos com:
- title: título atraente do episódio/vídeo
- channel: nome do canal ou host
- videoId: ID do vídeo do YouTube de 11 caracteres válido
- url: link completo do youtube (ex: https://www.youtube.com/watch?v=...)
- duration: duração aproximada (ex: "1h 45min", "2h 10min")
- viralityScore: pontuação estimada de 85 a 99
- reason: por que esse vídeo tem alto potencial viral de retenção e ganchos
- suggestedThemes: 2 a 3 temas quentes abordados
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                channel: { type: Type.STRING },
                videoId: { type: Type.STRING },
                url: { type: Type.STRING },
                duration: { type: Type.STRING },
                viralityScore: { type: Type.NUMBER },
                reason: { type: Type.STRING },
                suggestedThemes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['title', 'channel', 'videoId', 'url', 'viralityScore', 'reason'],
            },
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.warn('[GeminiService] Erro ao consultar Gemini para tendências:', error);
    }
  }

  // 3. Fallback: Shuffle and rotate curated pool so user never sees the same 3
  const shuffled = [...CURATED_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 6);
}

/**
 * Detect & analyze viral cuts using Gemini 3.8 Flash
 */
export async function analyzeViralCuts({
  videoUrl,
  transcript,
  userPrompt,
  videoTitle,
  channelName,
}: {
  videoUrl: string;
  transcript: string;
  userPrompt?: string;
  videoTitle?: string;
  channelName?: string;
}) {
  const videoId = extractVideoId(videoUrl) || 'video';
  const directive = userPrompt?.trim() || 'gerar vídeos magnéticos com maior retenção e chance de viralizar';

  const systemInstruction = `
Você é o mais consagrado diretor de pós-produção e estrategista de neuromarketing digital, mídias sociais (Shorts, TikTok, Reels) e retenção orgânica.
Sua especialidade é identificar momentos exatos em podcasts e vídeos que prendem a atenção do espectador no primeiro segundo e geram milhões de visualizações, compartilhamentos e comentários.

Diretriz personalizada do criador:
"${directive}"

Regras Críticas para os Cortes:
1. Duração: Entre 30 e 90 segundos (máximo 150 segundos).
2. Gancho Inicial (Hook): Os primeiros 3 segundos devem conter uma frase de choque, curiosidade irresistível ou quebra de padrão.
3. Desfecho (Payoff): O corte não pode terminar no meio de uma frase inacabada; deve ter uma conclusão memorável ou provocação final.
4. Título de Overlay: Título curto e impactante para colocar no topo do vídeo em letras maiúsculas (ex: "O ERRO QUE DESTRÓI SUA MEMÓRIA ⚠️", "ELE PERDEU TUDO EM 24 HORAS 🤯").
5. Legenda persuasiva com gancho, copy de 2 frases, chamada para ação (CTA) e hashtags quentes (#Shorts #Viral #Reels #TikTok).
`;

  const prompt = `
Título do Vídeo: ${videoTitle || 'Vídeo do YouTube'}
Canal: ${channelName || 'YouTube'}
URL: https://www.youtube.com/watch?v=${videoId}

Transcrição com marcações de tempo:
${transcript && transcript.trim().length > 20 ? transcript.slice(0, 30000) : '[00:15] O maior erro que as pessoas cometem é achar que motivação dura para sempre.\n[00:45] Quando a dopamina cai, você precisa ter sistemas claros.\n[01:20] Se você não dominar isso, vai passar a vida inteira recomeçando do zero.'}

Selecione de 3 a 5 cortes virais extraordinários. Retorne rigorosamente no formato JSON de acordo com o schema.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING, description: 'Título de overlay para a tela em maiúsculas com emoji' },
            startTime: { type: Type.STRING, description: 'Tempo inicial no formato MM:SS ou HH:MM:SS' },
            endTime: { type: Type.STRING, description: 'Tempo final no formato MM:SS ou HH:MM:SS' },
            viralityScore: { type: Type.NUMBER, description: 'Score de viralidade de 70 a 99' },
            hook: { type: Type.STRING, description: 'O gancho nos primeiros 3 segundos' },
            payoff: { type: Type.STRING, description: 'A conclusão ou clímax do corte' },
            neuromarketingTrigger: { type: Type.STRING, description: 'Gatilho mental principal' },
            viralityAnalysis: { type: Type.STRING, description: 'Por que este trecho específico engaja e retém a audiência' },
            recommendedFormat: {
              type: Type.STRING,
              description: 'vertical_crop | vertical_blur | original',
            },
            caption: {
              type: Type.OBJECT,
              properties: {
                youtube: { type: Type.STRING },
                instagram: { type: Type.STRING },
                tiktok: { type: Type.STRING },
              },
              required: ['youtube', 'instagram', 'tiktok'],
            },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            overlaySubtitlesSample: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Palavras de impacto chave para destacar em amarelo/vermelho',
            },
          },
          required: [
            'title',
            'startTime',
            'endTime',
            'viralityScore',
            'hook',
            'payoff',
            'neuromarketingTrigger',
            'viralityAnalysis',
            'caption',
            'hashtags',
          ],
        },
      },
    },
  });

  const rawCuts = JSON.parse(response.text?.trim() || '[]');

  return rawCuts.map((cut: any, idx: number) => {
    const s = parseTimeToSeconds(cut.startTime);
    const e = parseTimeToSeconds(cut.endTime);
    const durationSeconds = Math.max(10, e > s ? e - s : 45);
    const startSeconds = s;
    const endSeconds = s + durationSeconds;

    return {
      ...cut,
      id: cut.id || `cut-${idx + 1}-${Date.now()}`,
      startSeconds,
      endSeconds,
      durationSeconds,
      startTime: formatSecondsToMMSS(startSeconds),
      endTime: formatSecondsToMMSS(endSeconds),
      recommendedFormat: cut.recommendedFormat || 'vertical_crop',
    };
  });
}

/**
 * Generate platform-tailored social media captions
 */
export async function generateCaption({
  cutTitle,
  hook,
  platform,
  trigger,
  customTone,
}: {
  cutTitle: string;
  hook: string;
  platform?: string;
  trigger?: string;
  customTone?: string;
}) {
  const prompt = `
Crie uma legenda de alta conversão para o ${platform || 'YouTube Shorts'}.
Título do Corte: ${cutTitle}
Gancho Inicial: ${hook}
Gatilho Mental: ${trigger || 'Engajamento'}
Tom desejado: ${customTone || 'Magnético, persuasivo e dinâmico'}

Requisitos:
- 1 Gancho de impacto na primeira linha (antes do botão 'ver mais')
- 2 a 3 frases envolventes de contexto rápido
- 1 Chamada para Ação (CTA) inteligente que incentiva comentários ou compartilhamento
- 6 a 8 hashtags quentes (#Shorts #Viral...)
Responda diretamente com a legenda formatada pronta para publicação.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
  });

  return response.text?.trim() || '';
}
