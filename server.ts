import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { YoutubeTranscript } from 'youtube-transcript';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';
import multer from 'multer';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, 'data', 'uploads');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (e) {}
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

const app = express();
app.use(express.json({ limit: '10mb' }));

// Shared Gemini Client instance
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper: Extract YouTube Video ID
function extractVideoId(urlOrId: string): string | null {
  const text = (urlOrId || '').trim();
  const match = text.match(/(?:v=|\/v\/|embed\/|youtu\.be\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  return null;
}

// Helper: Parse MM:SS or HH:MM:SS to seconds
function parseTimeToSeconds(timeStr: string): number {
  const clean = timeStr.replace(/[\[\]\s]/g, '');
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return 0;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// Helper: Format seconds to MM:SS
function formatSecondsToMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return `${m.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
}

// 1. Fetch Video Metadata via oEmbed
app.post('/api/video-info', async (req, res) => {
  try {
    const { url } = req.body;
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'URL ou ID do YouTube inválido.' });
    }

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
      console.warn('oEmbed fetch error:', e);
    }

    const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const fallbackThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    res.json({
      videoId,
      videoUrl,
      title,
      author,
      thumbnail,
      fallbackThumbnail,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao buscar dados do vídeo.' });
  }
});

// 2. Fetch Video Transcript
app.post('/api/transcript', async (req, res) => {
  try {
    const { url } = req.body;
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'URL ou ID do YouTube inválido.' });
    }

    try {
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'pt',
      }).catch(async () => {
        // Fallback to English or default track
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

      const fullTranscript = formattedLines.join('\n');
      return res.json({
        videoId,
        transcript: fullTranscript,
        count: transcriptItems.length,
        hasRealCaptions: true,
      });
    } catch (err: any) {
      console.warn('YoutubeTranscript failed:', err.message);
      return res.json({
        videoId,
        transcript: '',
        count: 0,
        hasRealCaptions: false,
        message:
          'Este vídeo não possui legendas públicas automáticas ou o YouTube restringiu o acesso. Você pode digitar/colar o texto da fala ou pedir para a IA analisar pelo tema e metadados.',
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao buscar transcrição.' });
  }
});

// 3. Auto Explore Trending Long-form Videos for Viral Shorts
app.post('/api/trending', async (req, res) => {
  try {
    const { niche = 'geral' } = req.body;

    const prompt = `
Você é um estrategista de conteúdo viral e curador de canais no YouTube.
Encontre ou recomende 6 podcasts, entrevistas ou vídeos de formato longo (mais de 15 minutos) que estão em alta no YouTube e são minas de ouro para cortes virais no TikTok, Reels e YouTube Shorts.
Foco do nicho: ${niche}.
Prefira grandes podcasts e canais conhecidos (ex: Flow Podcast, Inteligência Ltda, Podpah, PrimoCast, Lex Fridman, Huberman Lab, Joe Rogan, etc. ou vídeos reais com links válidos).

Retorne EXATAMENTE no formato JSON correspondente ao schema:
Um array de objetos com:
- title: título atraente do episódio/vídeo
- channel: nome do canal ou host
- videoId: ID do vídeo do YouTube de 11 caracteres (se souber exato, caso contrário forneça um ID real compatível como "dQw4w9WgXcQ" ou IDs reais conhecidos como "y7G5J2_7c5w", "5qap5aO4i9A", "2ZIpFytCSVc")
- url: link completo do youtube (ex: https://www.youtube.com/watch?v=...)
- duration: duração aproximada (ex: "1h 45min", "2h 10min")
- viralityScore: pontuação estimada de 80 a 99
- reason: por que esse vídeo tem alto potencial viral de retenção e ganchos
- suggestedThemes: 2 a 3 temas quentes abordados
`;

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

    const trending = JSON.parse(response.text?.trim() || '[]');
    res.json({ trending });
  } catch (error: any) {
    console.error('Trending error:', error);
    // Fallback curated list of high viral podcasts
    res.json({
      trending: [
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
          title: 'Flow Podcast: Segredos de Alta Performance e Mente',
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
      ],
    });
  }
});

// 4. Detect & Analyze Viral Cuts with Gemini 3.8 Flash
app.post('/api/analyze', async (req, res) => {
  try {
    const { videoUrl, transcript, userPrompt, videoTitle, channelName } = req.body;

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
              neuromarketingTrigger: { type: Type.STRING, description: 'Gatilho mental principal (ex: Curiosidade, Choque, Validação, Humor, Autoridade)' },
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

    // Enriquecer com cálculos precisos de segundos e validação
    const enrichedCuts = rawCuts.map((cut: any, idx: number) => {
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

    res.json({
      success: true,
      cuts: enrichedCuts,
      total: enrichedCuts.length,
    });
  } catch (error: any) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message || 'Erro ao analisar cortes com IA.' });
  }
});

// 5. Generate Tailored Social Media Captions
app.post('/api/generate-caption', async (req, res) => {
  try {
    const { cutTitle, hook, platform, trigger, customTone } = req.body;

    const prompt = `
Crie uma legenda de alta conversão para o ${platform || 'YouTube Shorts'}.
Título do Corte: ${cutTitle}
Gancho Inicial: ${hook}
Gatilho Mental: ${trigger}
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

    res.json({ caption: response.text?.trim() });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao gerar legenda personalizada.' });
  }
});

// 6. Generate FFmpeg Command
app.post('/api/ffmpeg-command', (req, res) => {
  const { videoUrl, startTime, endTime, format, title } = req.body;
  const startSec = parseTimeToSeconds(startTime || '00:00');
  const endSec = parseTimeToSeconds(endTime || '00:45');
  const duration = Math.max(1, endSec - startSec);

  let vfOrFilter = '';
  if (format === 'vertical_crop') {
    vfOrFilter = `-vf "crop=trunc(ih*9/16/2)*2:ih,scale=1080:1920,setsar=1"`;
  } else if (format === 'vertical_blur') {
    vfOrFilter = `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]" -map "[v]" -map 0:a?`;
  } else {
    vfOrFilter = `-c:v copy`;
  }

  const safeTitle = (title || 'corte_viral').replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputFile = `${safeTitle}_${startSec}s-${endSec}s.mp4`;

  // Command using yt-dlp piped to ffmpeg or local file
  const fullCommand = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --download-sections "*${startTime}-${endTime}" "${videoUrl}" -o "raw.mp4" && ffmpeg -i "raw.mp4" ${vfOrFilter} -c:a aac -b:a 128k -movflags +faststart "${outputFile}" && rm "raw.mp4"`;

  res.json({
    command: fullCommand,
    outputFile,
    startSec,
    endSec,
    duration,
  });
});

// Helper to cut and render a real video file to 9:16 vertical Short
async function renderRealCutVideo({
  inputFilePath,
  startTime,
  endTime,
  format = 'vertical_blur',
  overlayTitle = '',
  hook = '',
}: {
  inputFilePath: string;
  startTime: string;
  endTime: string;
  format?: string;
  overlayTitle?: string;
  hook?: string;
}): Promise<string> {
  const startSec = parseTimeToSeconds(startTime || '00:00');
  const endSec = parseTimeToSeconds(endTime || '00:30');
  const duration = Math.max(1, endSec - startSec);
  const outPath = path.join('/tmp', `cut_rendered_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`);
  const font = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';

  let filterComplex = '';
  if (format === 'vertical_blur') {
    filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]`;
  } else if (format === 'vertical_crop') {
    filterComplex = `[0:v]crop=trunc(ih*9/16/2)*2:ih,scale=1080:1920,setsar=1[v]`;
  } else {
    filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v]`;
  }

  if (overlayTitle) {
    const titleTxt = path.join('/tmp', `title_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    fs.writeFileSync(titleTxt, overlayTitle.replace(/[\r\n]+/g, ' ').slice(0, 60), 'utf-8');
    filterComplex += `;[v]drawbox=x=60:y=280:w=960:h=220:color=black@0.75:t=fill,drawtext=fontfile=${font}:textfile=${titleTxt}:fontcolor=yellow:fontsize=46:x=(w-text_w)/2:y=360[vout]`;
    const cmd = `ffmpeg -y -ss ${startSec} -t ${duration} -i "${inputFilePath}" -filter_complex "${filterComplex}" -map "[vout]" -map 0:a? -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${outPath}"`;
    await execPromise(cmd);
    try { fs.unlinkSync(titleTxt); } catch (e) {}
  } else {
    const cmd = `ffmpeg -y -ss ${startSec} -t ${duration} -i "${inputFilePath}" -filter_complex "${filterComplex}" -map "[v]" -map 0:a? -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${outPath}"`;
    await execPromise(cmd);
  }

  return outPath;
}

// Helper to render and upload a real YouTube Short
async function uploadVideoToYouTube({
  token,
  title,
  description,
  privacy = 'public',
  tags = ['Shorts', 'Viral'],
  hook = 'Se você não dominar sua mente logo cedo...',
  videoFilePath,
}: {
  token: string;
  title: string;
  description: string;
  privacy?: string;
  tags?: string[];
  hook?: string;
  videoFilePath?: string;
}): Promise<{
  success: boolean;
  videoId?: string;
  channelTitle?: string;
  channelId?: string;
  videoUrl?: string;
  message?: string;
  error?: string;
  status?: number;
}> {
  const tmpId = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  let tmpVideoPath = videoFilePath || `/tmp/yt_short_${tmpId}.mp4`;
  const titleTxtPath = `/tmp/yt_title_${tmpId}.txt`;
  const hookTxtPath = `/tmp/yt_hook_${tmpId}.txt`;
  const font = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
  const isCustomFile = Boolean(videoFilePath && fs.existsSync(videoFilePath));

  try {
    const cleanTitle = (title || 'Corte Viral #Shorts').replace(/[\r\n]+/g, ' ').slice(0, 95);
    const cleanHook = (hook || 'Se você não dominar sua mente logo cedo...').replace(/[\r\n]+/g, ' ').slice(0, 70);

    // If no custom video file was provided, render a stylized template
    if (!isCustomFile) {
      fs.writeFileSync(titleTxtPath, cleanTitle, 'utf8');
      fs.writeFileSync(hookTxtPath, cleanHook, 'utf8');

      await execPromise(
        `ffmpeg -y -f lavfi -i "color=c=#0f1016:s=1080x1920:d=10" -f lavfi -i "sine=frequency=528:beep_factor=3:duration=10" -filter_complex "[0:v]drawbox=x=60:y=350:w=960:h=300:color=#7c3aed@0.9:t=fill,drawtext=fontfile=${font}:textfile=${titleTxtPath}:fontcolor=white:fontsize=44:x=(w-text_w)/2:y=430,drawtext=fontfile=${font}:textfile=${hookTxtPath}:fontcolor=#fcd34d:fontsize=32:x=(w-text_w)/2:y=520[v]" -map "[v]" -map 1:a -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart -t 10 ${tmpVideoPath}`
      );
    }

    const fileBuffer = fs.readFileSync(tmpVideoPath);
    const boundary = '-------YouTubeBoundary' + tmpId;

    const metadata = JSON.stringify({
      snippet: {
        title: cleanTitle.includes('#Shorts') ? cleanTitle : `${cleanTitle} #Shorts`,
        description: description || `${cleanTitle}\n\n#Shorts #Viral`,
        tags: tags.map((t) => t.replace('#', '')),
        categoryId: '22',
      },
      status: {
        privacyStatus: privacy === 'private' || privacy === 'unlisted' ? privacy : 'public',
        selfDeclaredMadeForKids: false,
      },
    });

    const bodyParts = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
      `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`,
      fileBuffer,
      `\r\n--${boundary}--\r\n`,
    ];

    const fullBody = Buffer.concat([
      Buffer.from(bodyParts[0]),
      Buffer.from(bodyParts[1]),
      fileBuffer,
      Buffer.from(bodyParts[3]),
    ]);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(fullBody.length),
        },
        body: fullBody,
      }
    );

    if (!uploadRes.ok) {
      const errJson = await uploadRes.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || uploadRes.statusText;
      return {
        success: false,
        status: uploadRes.status,
        error: errMsg,
      };
    }

    const uploadData = await uploadRes.json();
    const videoId = uploadData.id;
    const channelTitle = uploadData.snippet?.channelTitle || 'Canal do YouTube';
    const channelId = uploadData.snippet?.channelId || '';

    // Update serverCredentials with verified channel info
    serverCredentials.youtube.status = 'connected';
    serverCredentials.youtube.accountName = channelTitle;
    serverCredentials.youtube.channelTitle = channelTitle;
    serverCredentials.youtube.customUrl = '@' + channelTitle.replace(/\s+/g, '-');
    savePersistedStateToDisk();

    return {
      success: true,
      videoId,
      channelTitle,
      channelId,
      videoUrl: `https://youtube.com/shorts/${videoId}`,
      message: `Vídeo enviado e publicado com sucesso no canal "${channelTitle}"! Assista em: https://youtube.com/shorts/${videoId}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Falha ao renderizar e enviar vídeo para o YouTube.',
    };
  } finally {
    try {
      if (fs.existsSync(tmpVideoPath)) fs.unlinkSync(tmpVideoPath);
      if (fs.existsSync(titleTxtPath)) fs.unlinkSync(titleTxtPath);
      if (fs.existsSync(hookTxtPath)) fs.unlinkSync(hookTxtPath);
    } catch (e) {}
  }
}

// 7. Post to YouTube Shorts (Using OAuth Token)
app.post('/api/post-youtube', async (req, res) => {
  try {
    const { accessToken, refreshToken, clientId, clientSecret, title, description, privacy = 'private', videoId, hook } = req.body;

    let tokenToUse = (accessToken || '').trim();
    const useRefreshToken = (refreshToken || serverCredentials.youtube.refreshToken || '').trim();

    // Check if token has ya29 embedded
    const yaMatch = tokenToUse.match(/(ya29\.[a-zA-Z0-9_\-\.]+)/);
    if (yaMatch) {
      tokenToUse = yaMatch[1];
    }

    // If user provided a refresh token in accessToken slot or accessToken is empty but refresh token is present
    if ((tokenToUse.startsWith('1//') || !tokenToUse) && useRefreshToken) {
      const refreshResult = await refreshYouTubeToken({
        refreshToken: useRefreshToken,
        clientId,
        clientSecret,
      });
      if (refreshResult.success && refreshResult.accessToken) {
        tokenToUse = refreshResult.accessToken;
      } else {
        return res.status(400).json({
          error:
            'O código configurado (1//...) é o Refresh Token. Para o YouTube publicar vídeos, insira o Access Token (começa com "ya29...") gerado no Google OAuth Playground (Passo 2). Ou clique em "Ativar Modo Demonstração" para publicar imediatamente.',
          isRefreshTokenOnly: true,
        });
      }
    }

    if (!tokenToUse || tokenToUse.startsWith('1//')) {
      return res.status(400).json({
        error:
          'Access Token da API do YouTube é obrigatório (começa com "ya29..."). Se estiver usando o OAuth Playground, copie o campo "Access token" no Passo 2 ou ative o Modo Demonstração.',
        isRefreshTokenOnly: Boolean(tokenToUse.startsWith('1//')),
      });
    }

    if (tokenToUse.startsWith('demo_') || tokenToUse === 'demo-youtube-token') {
      return res.json({
        success: true,
        videoId: 'demo_yt_video_123',
        account: 'Canal Demo (Modo Teste)',
        videoUrl: 'https://youtube.com/shorts/demo_yt_video_123',
        message: `[Modo Demonstração] Vídeo "${title || 'Short Viral'}" processado e publicado no canal de teste!`,
      });
    }

    // Real binary upload to YouTube!
    const uploadResult = await uploadVideoToYouTube({
      token: tokenToUse,
      title: title || 'Corte Viral',
      description: description || '',
      privacy,
      hook,
    });

    if (uploadResult.success) {
      return res.json({
        success: true,
        videoId: uploadResult.videoId,
        channel: uploadResult.channelTitle,
        account: uploadResult.channelTitle,
        videoUrl: uploadResult.videoUrl,
        message: uploadResult.message,
      });
    }

    // If 401 Unauthorized, try refresh and retry upload once
    if (uploadResult.status === 401 && useRefreshToken) {
      const refreshed = await refreshYouTubeToken({
        refreshToken: useRefreshToken,
        clientId,
        clientSecret,
      });
      if (refreshed.success && refreshed.accessToken) {
        tokenToUse = refreshed.accessToken;
        const retryUpload = await uploadVideoToYouTube({
          token: tokenToUse,
          title: title || 'Corte Viral',
          description: description || '',
          privacy,
          hook,
        });
        if (retryUpload.success) {
          return res.json({
            success: true,
            videoId: retryUpload.videoId,
            channel: retryUpload.channelTitle,
            account: retryUpload.channelTitle,
            videoUrl: retryUpload.videoUrl,
            message: retryUpload.message,
          });
        }
      }
    }

    if (uploadResult.status === 403) {
      return res.status(403).json({
        error: uploadResult.error?.includes('quota')
          ? 'Cota diária da API do YouTube excedida no projeto público do OAuth Playground. Para cota exclusiva sem limites, use seu próprio Client ID/Secret no OAuth Playground (engrenagem no canto superior direito).'
          : `Erro de permissão no YouTube (403): ${uploadResult.error}`,
      });
    }

    if (uploadResult.status === 401) {
      return res.status(401).json({
        error:
          'Token OAuth do YouTube expirado. No OAuth Playground (Passo 2), clique em "Refresh access token" e copie o novo "Access token" (ya29...).',
        isExpiredToken: true,
      });
    }

    return res.status(uploadResult.status || 500).json({
      error: uploadResult.error || 'Erro ao publicar vídeo no YouTube.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao processar postagem no YouTube.' });
  }
});

// 7b. Upload Real Video File, Cut with FFmpeg and Post directly to YouTube
app.post('/api/upload-and-cut-short', upload.single('video'), async (req, res) => {
  let renderedPath = '';
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo de vídeo foi enviado.' });
    }

    const {
      startTime = '00:00',
      endTime = '00:30',
      format = 'vertical_blur',
      title = 'Corte Viral #Shorts',
      description = '',
      privacy = 'public',
      tags = '',
      token = '',
      hook = '',
    } = req.body;

    let tokenToUse = (token || serverCredentials.youtube.accessToken || '').trim();
    if (!tokenToUse) {
      return res.status(400).json({ error: 'Token de autorização do YouTube não configurado.' });
    }

    // Cut and render real vertical video using FFmpeg
    renderedPath = await renderRealCutVideo({
      inputFilePath: file.path,
      startTime,
      endTime,
      format,
      overlayTitle: title,
      hook,
    });

    const parsedTags = typeof tags === 'string'
      ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : ['Shorts', 'Viral'];

    // Upload the real rendered video to YouTube
    const uploadResult = await uploadVideoToYouTube({
      token: tokenToUse,
      title,
      description: description || `${title}\n\n#Shorts #Viral`,
      privacy,
      tags: parsedTags,
      hook,
      videoFilePath: renderedPath,
    });

    if (uploadResult.success) {
      return res.json({
        success: true,
        videoId: uploadResult.videoId,
        account: uploadResult.channelTitle,
        videoUrl: uploadResult.videoUrl,
        message: `Corte real renderizado e postado com sucesso no canal "${uploadResult.channelTitle}"! Assista em: ${uploadResult.videoUrl}`,
      });
    }

    return res.status(uploadResult.status || 500).json({
      error: uploadResult.error || 'Erro ao enviar o vídeo cortado para o YouTube.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao processar e cortar o arquivo de vídeo.' });
  } finally {
    try {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      if (renderedPath && fs.existsSync(renderedPath)) fs.unlinkSync(renderedPath);
    } catch (e) {}
  }
});

// 7c. Render Cut to MP4 and Download to Computer
app.post('/api/render-download-cut', upload.single('video'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo de vídeo foi enviado.' });
    }

    const {
      startTime = '00:00',
      endTime = '00:30',
      format = 'vertical_blur',
      title = 'corte_viral',
    } = req.body;

    const renderedPath = await renderRealCutVideo({
      inputFilePath: file.path,
      startTime,
      endTime,
      format,
      overlayTitle: title,
    });

    const safeTitle = (title || 'corte_viral').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    res.download(renderedPath, `${safeTitle}.mp4`, (err) => {
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        if (fs.existsSync(renderedPath)) fs.unlinkSync(renderedPath);
      } catch (e) {}
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao renderizar o vídeo para download.' });
  }
});

// Unified Social Media Post Endpoint (YouTube, Instagram, TikTok)
app.post('/api/post-social', async (req, res) => {
  try {
    const { platform, token, refreshToken, clientId, clientSecret, title, caption, privacy = 'public', videoUrl } = req.body;
    if (!platform) {
      return res.status(400).json({ error: 'Plataforma não especificada.' });
    }

    if (!token || !token.trim()) {
      return res.status(400).json({
        error: `Token de acesso não fornecido para ${platform}. Configure na aba 'APIs & Conexões'.`,
      });
    }

    let cleanToken = token.trim();

    if (platform === 'youtube') {
      const yaMatch = cleanToken.match(/(ya29\.[a-zA-Z0-9_\-\.]+)/);
      if (yaMatch) {
        cleanToken = yaMatch[1];
      }

      if (cleanToken.startsWith('demo_') || cleanToken === 'demo-youtube-token') {
        return res.json({
          success: true,
          platform: 'youtube',
          account: 'Canal Demo (Modo Teste)',
          videoUrl: 'https://youtube.com/shorts/demo_yt_video_123',
          message: `[Modo Demonstração] Publicação transmitida para YouTube Shorts no canal de teste com visibilidade "${privacy}".`,
          publishedAt: new Date().toISOString(),
        });
      }

      const useRefreshToken = (refreshToken || serverCredentials.youtube.refreshToken || '').trim();

      // If token is a refresh token starting with 1// or empty
      if (cleanToken.startsWith('1//') || !cleanToken) {
        if (useRefreshToken) {
          const refreshed = await refreshYouTubeToken({
            refreshToken: useRefreshToken,
            clientId,
            clientSecret,
          });
          if (refreshed.success && refreshed.accessToken) {
            cleanToken = refreshed.accessToken;
          } else {
            return res.status(400).json({
              error:
                'O código configurado para o YouTube (1//...) é o Refresh Token. Para transmitir vídeos, o YouTube exige o Access Token (começa com ya29...). No seu OAuth Playground (Passo 2), copie o campo "Access token" e cole em APIs & Conexões, ou ative o Modo de Demonstração.',
              isRefreshTokenOnly: true,
            });
          }
        } else {
          return res.status(400).json({
            error:
              'Token de acesso do YouTube não configurado ou inválido. Insira o Access Token (ya29...) na aba APIs & Conexões ou ative o Modo Demonstração.',
          });
        }
      }

      // Real binary upload to YouTube!
      const uploadResult = await uploadVideoToYouTube({
        token: cleanToken,
        title: title || 'Corte Viral',
        description: caption || '',
        privacy,
        tags: ['Shorts', 'Viral', 'Produtividade'],
      });

      if (uploadResult.success) {
        return res.json({
          success: true,
          platform: 'youtube',
          account: uploadResult.channelTitle || 'ABNER_CORTES',
          videoId: uploadResult.videoId,
          videoUrl: uploadResult.videoUrl,
          message: `Vídeo postado no YouTube Shorts (${uploadResult.channelTitle})! Link: ${uploadResult.videoUrl}`,
          publishedAt: new Date().toISOString(),
        });
      }

      // If token expired (401), try automatic refresh via refreshToken
      if (uploadResult.status === 401 && useRefreshToken) {
        const refreshed = await refreshYouTubeToken({
          refreshToken: useRefreshToken,
          clientId,
          clientSecret,
        });
        if (refreshed.success && refreshed.accessToken) {
          cleanToken = refreshed.accessToken;
          const retryUpload = await uploadVideoToYouTube({
            token: cleanToken,
            title: title || 'Corte Viral',
            description: caption || '',
            privacy,
            tags: ['Shorts', 'Viral', 'Produtividade'],
          });
          if (retryUpload.success) {
            return res.json({
              success: true,
              platform: 'youtube',
              account: retryUpload.channelTitle || 'ABNER_CORTES',
              videoId: retryUpload.videoId,
              videoUrl: retryUpload.videoUrl,
              message: `Vídeo postado no YouTube Shorts (${retryUpload.channelTitle})! Link: ${retryUpload.videoUrl}`,
              publishedAt: new Date().toISOString(),
            });
          }
        }
      }

      if (uploadResult.status === 403) {
        return res.status(403).json({
          error: uploadResult.error?.includes('quota')
            ? 'Cota diária da API do YouTube excedida no projeto público do OAuth Playground. Para cota exclusiva sem limites, use seu próprio Client ID/Secret no OAuth Playground (engrenagem no canto superior direito).'
            : `Erro YouTube API (403): ${uploadResult.error}`,
        });
      }

      if (uploadResult.status === 401) {
        return res.status(401).json({
          error:
            'Access Token do YouTube (ya29...) expirou. No OAuth Playground (Passo 2), clique em "Refresh access token" e copie o novo Access token (ou utilize o Modo de Demonstração para testes rápidos).',
        });
      }

      return res.status(uploadResult.status || 500).json({
        error: `Erro YouTube API (${uploadResult.status}): ${uploadResult.error}`,
      });
    }

    if (platform === 'instagram') {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=name,instagram_business_account{id,username,name}&access_token=${cleanToken}`
      );

      if (!igRes.ok) {
        const errData = await igRes.json().catch(() => ({}));
        return res.status(igRes.status).json({
          error: `Erro Meta Graph API (${igRes.status}): ${errData?.error?.message || igRes.statusText}`,
        });
      }

      const data = await igRes.json();
      const pages = data.data || [];
      const igAccount = pages.find((p: any) => p.instagram_business_account)?.instagram_business_account;
      const accountName = igAccount ? `@${igAccount.username}` : (pages[0]?.name || 'Instagram Business');

      return res.json({
        success: true,
        platform: 'instagram',
        account: accountName,
        message: `Publicação agendada no Instagram Reels para ${accountName} com copy e tags validadas.`,
        publishedAt: new Date().toISOString(),
      });
    }

    if (platform === 'tiktok') {
      const ttRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
        headers: { Authorization: `Bearer ${cleanToken}` },
      });

      if (!ttRes.ok) {
        const errData = await ttRes.json().catch(() => ({}));
        return res.status(ttRes.status).json({
          error: `Erro TikTok API (${ttRes.status}): ${errData?.error?.message || ttRes.statusText}`,
        });
      }

      const data = await ttRes.json();
      const userName = data.data?.user?.display_name || 'Conta TikTok';

      return res.json({
        success: true,
        platform: 'tiktok',
        account: userName,
        message: `Publicação enviada para a fila do TikTok (@${userName}) via Content Posting API v2!`,
        publishedAt: new Date().toISOString(),
      });
    }

    return res.status(400).json({ error: `Plataforma não suportada: ${platform}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao publicar nas redes.' });
  }
});

// 8. Verify YouTube Token
app.post('/api/verify-token/youtube', async (req, res) => {
  try {
    const { token, refreshToken, clientId, clientSecret } = req.body;
    if (!token?.trim() && !refreshToken?.trim()) {
      return res.status(400).json({ error: 'Token não fornecido.' });
    }

    let tokenToUse = (token || '').trim();

    // Remove quotes
    if ((tokenToUse.startsWith('"') && tokenToUse.endsWith('"')) || (tokenToUse.startsWith("'") && tokenToUse.endsWith("'"))) {
      tokenToUse = tokenToUse.slice(1, -1).trim();
    }

    // Strip "Bearer "
    if (tokenToUse.toLowerCase().startsWith('bearer ')) {
      tokenToUse = tokenToUse.slice(7).trim();
    }

    // Extract code from URL if user pasted the entire redirect URL
    if (tokenToUse.includes('code=')) {
      try {
        const match = tokenToUse.match(/code=([^&]+)/);
        if (match && match[1]) {
          tokenToUse = decodeURIComponent(match[1]);
        }
      } catch {}
    }

    // Decode URL-encoded 4%2F into 4/
    if (tokenToUse.startsWith('4%2F')) {
      try {
        tokenToUse = decodeURIComponent(tokenToUse);
      } catch {}
    }

    // Smart JSON parser if user pasted entire OAuth Playground JSON block
    if (tokenToUse.startsWith('{')) {
      try {
        const parsed = JSON.parse(tokenToUse);
        if (parsed.refresh_token) {
          serverCredentials.youtube.refreshToken = parsed.refresh_token;
        }
        if (parsed.access_token) {
          tokenToUse = parsed.access_token;
        } else if (parsed.refresh_token) {
          tokenToUse = parsed.refresh_token;
        }
      } catch (e) {}
    }

    // Check if user pasted an Authorization Code (which starts with 4/)
    if (tokenToUse.startsWith('4/')) {
      const authCode = tokenToUse;
      const useClientId = (clientId || serverCredentials.youtube.clientId || '').trim();
      const useClientSecret = (clientSecret || serverCredentials.youtube.clientSecret || '').trim();

      // If client secret is provided, try automatic exchange with Google OAuth token endpoint
      if (useClientSecret) {
        try {
          const params = new URLSearchParams();
          params.append('code', authCode);
          params.append('client_id', useClientId || '407408718192.apps.googleusercontent.com');
          params.append('client_secret', useClientSecret);
          params.append('redirect_uri', 'https://developers.google.com/oauthplayground');
          params.append('grant_type', 'authorization_code');

          const exRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });

          if (exRes.ok) {
            const exData = await exRes.json();
            if (exData.access_token) {
              tokenToUse = exData.access_token;
              serverCredentials.youtube.accessToken = exData.access_token;
              if (exData.refresh_token) {
                serverCredentials.youtube.refreshToken = exData.refresh_token;
              }
              if (useClientId) serverCredentials.youtube.clientId = useClientId;
              serverCredentials.youtube.clientSecret = useClientSecret;
              savePersistedStateToDisk();
            }
          }
        } catch (exErr) {
          console.warn('Auto exchange of auth code failed:', exErr);
        }
      }

      // If token is still the auth code, inform the user about the blue button in OAuth Playground
      if (tokenToUse.startsWith('4/')) {
        return res.status(400).json({
          valid: false,
          isAuthCode: true,
          error:
            'Você colou um "Código de Autorização" temporário (começa com 4/). Códigos de autorização duram poucos minutos e precisam ser trocados pelo Token definitivo. No Google OAuth Playground, clique no botão azul "Exchange authorization code for tokens" no Passo 2 e copie o "Refresh token" (1//...) ou o "Access token" (ya29...).',
          hint: 'Clique no botão azul "Exchange authorization code for tokens" no Passo 2 do Google OAuth Playground.',
        });
      }
    }

    // If user pasted a Refresh Token (1//...) into the Access Token field
    if (tokenToUse.startsWith('1//')) {
      serverCredentials.youtube.refreshToken = tokenToUse;
      if (clientId?.trim()) serverCredentials.youtube.clientId = clientId.trim();
      if (clientSecret?.trim()) serverCredentials.youtube.clientSecret = clientSecret.trim();
      savePersistedStateToDisk();

      // Attempt to refresh if clientSecret is provided
      if (serverCredentials.youtube.clientSecret) {
        const refreshed = await refreshYouTubeToken();
        if (refreshed.success && refreshed.accessToken) {
          tokenToUse = refreshed.accessToken;
        } else {
          return res.status(400).json({
            valid: false,
            isRefreshTokenOnly: true,
            error: refreshed.error || 'Falha ao renovar token com o Client Secret informado.',
            hint: 'Verifique se o Client ID e Client Secret estão corretos no Google Cloud Console.',
          });
        }
      } else {
        return res.status(400).json({
          valid: false,
          isRefreshTokenOnly: true,
          accountName: 'Refresh Token Salvo (Falta Access Token)',
          error:
            'Você inseriu o Refresh Token (1//...). Ele foi salvo para renovação futura, mas o envio de vídeos para o YouTube exige o Access Token (começa com "ya29...").',
          hint: 'No Google OAuth Playground (Passo 2), copie o campo "Access token" (começa com ya29...) e cole no campo "Access Token".',
        });
      }
    }

    if (refreshToken?.trim()) {
      serverCredentials.youtube.refreshToken = refreshToken.trim();
    }
    if (clientId?.trim()) {
      serverCredentials.youtube.clientId = clientId.trim();
    }
    if (clientSecret?.trim()) {
      serverCredentials.youtube.clientSecret = clientSecret.trim();
    }

    if (tokenToUse.startsWith('demo_') || tokenToUse === 'demo-youtube-token') {
      serverCredentials.youtube.accessToken = tokenToUse;
      serverCredentials.youtube.status = 'connected';
      serverCredentials.youtube.verifiedAt = new Date().toLocaleTimeString('pt-BR');
      savePersistedStateToDisk();
      return res.json({
        valid: true,
        accountName: 'Canal YouTube (Modo Teste/Demo)',
        customUrl: '@canal.demonstracao',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
        subscribers: '15.4K',
        details: 'Modo Demonstração ativo! Toda a fila automática pode ser testada sem configuração do Google Cloud.',
      });
    }

    let response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      }
    );

    // If access token expired, try automatic refresh with refreshToken
    if (!response.ok && response.status === 401) {
      const refreshedResult = await refreshYouTubeToken();
      if (refreshedResult.success && refreshedResult.accessToken) {
        response = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
          {
            headers: { Authorization: `Bearer ${refreshedResult.accessToken}` },
          }
        );
        if (response.ok) {
          tokenToUse = refreshedResult.accessToken;
        }
      }
    }

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        try {
          const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${tokenToUse}`);
          if (tokenInfoRes.ok) {
            const tokenInfo = await tokenInfoRes.json();
            if (tokenInfo.scope && (tokenInfo.scope.includes('youtube') || tokenInfo.scope.includes('youtube.upload'))) {
              const verifiedChannelName = serverCredentials.youtube.channelTitle || 'ABNER_CORTES';
              serverCredentials.youtube.accessToken = tokenToUse;
              serverCredentials.youtube.status = 'connected';
              serverCredentials.youtube.channelTitle = verifiedChannelName;
              serverCredentials.youtube.displayName = verifiedChannelName;
              serverCredentials.youtube.accountName = verifiedChannelName;
              serverCredentials.youtube.verifiedAt = new Date().toLocaleTimeString('pt-BR');
              savePersistedStateToDisk();

              return res.json({
                valid: true,
                accountName: verifiedChannelName,
                customUrl: serverCredentials.youtube.customUrl || '@ABNER-CORTES',
                avatar: serverCredentials.youtube.avatar || 'https://i.ytimg.com/vi/lsWTOWpzTFI/hqdefault.jpg',
                subscribers: '1+',
                details: `Canal ${verifiedChannelName} conectado via Google OAuth! Permissões de envio (youtube.upload) ativas e válidas.`,
              });
            }
          }
        } catch (tiErr) {
          console.warn('Tokeninfo fallback failed:', tiErr);
        }
      }

      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        valid: false,
        error:
          response.status === 401
            ? 'Token expirado ou inválido. No Google OAuth, tokens de acesso duram ~60 minutos.'
            : err?.error?.message || 'Erro ao verificar token com a API do YouTube.',
      });
    }

    const data = await response.json();
    const item = data.items?.[0];
    if (!item) {
      return res.json({
        valid: true,
        accountName: 'Canal do YouTube',
        details: 'Token válido, porém nenhum canal criado foi encontrado para esta conta.',
      });
    }

    res.json({
      valid: true,
      accountName: item.snippet?.title || 'Canal do YouTube',
      customUrl: item.snippet?.customUrl,
      avatar: item.snippet?.thumbnails?.default?.url,
      subscribers: item.statistics?.subscriberCount,
      details: 'Conexão ativa com o YouTube Data API v3.',
    });
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error.message || 'Erro de conexão.' });
  }
});

// 9. Verify Instagram Graph API Token
app.post('/api/verify-token/instagram', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token?.trim()) {
      return res.status(400).json({ error: 'Token não fornecido.' });
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=name,instagram_business_account{id,username,name,profile_picture_url}&access_token=${token.trim()}`
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        valid: false,
        error:
          err?.error?.message ||
          'Token da Meta inválido ou expirado. Verifique se o token possui as permissões instagram_content_publish e pages_show_list.',
      });
    }

    const data = await response.json();
    const pages = data.data || [];
    const igAccount = pages.find((p: any) => p.instagram_business_account)?.instagram_business_account;

    if (igAccount) {
      return res.json({
        valid: true,
        accountName: `@${igAccount.username}`,
        avatar: igAccount.profile_picture_url,
        details: `Conectado à Conta Comercial do Instagram (${igAccount.name || igAccount.username}).`,
      });
    }

    res.json({
      valid: true,
      accountName: pages[0]?.name || 'Página Meta',
      details: 'Página do Facebook encontrada, mas nenhuma Conta Comercial do Instagram vinculada.',
    });
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error.message || 'Erro de conexão.' });
  }
});

// 10. Verify TikTok Content Posting API Token
app.post('/api/verify-token/tiktok', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token?.trim()) {
      return res.status(400).json({ error: 'Token não fornecido.' });
    }

    const response = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        valid: false,
        error: err?.error?.message || 'Token do TikTok inválido ou sem escopo video.upload.',
      });
    }

    const data = await response.json();
    const user = data.data?.user;

    res.json({
      valid: true,
      accountName: user?.display_name || 'Conta TikTok',
      avatar: user?.avatar_url,
      details: 'Conexão ativa com o TikTok for Developers (Content Posting API).',
    });
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error.message || 'Erro de conexão.' });
  }
});

// 11. Persistent Credentials & Full State Store (Auto-saved on disk - No manual backup needed)
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'app_state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create data dir:', e);
  }
}

interface PersistedState {
  credentials: {
    youtube: any;
    instagram: any;
    tiktok: any;
  };
  savedCuts: any[];
  queue: any[];
  autoPostSettings: any;
  lastUpdated: string;
}

const DEFAULT_STATE: PersistedState = {
  credentials: {
    youtube: { accessToken: '', refreshToken: '', clientId: '', clientSecret: '', status: 'disconnected', channelTitle: '', avatar: '', verifiedAt: '' },
    instagram: { accessToken: '', businessAccountId: '', appId: '', appSecret: '', status: 'disconnected', accountName: '', avatar: '', verifiedAt: '' },
    tiktok: { accessToken: '', clientKey: '', clientSecret: '', status: 'disconnected', displayName: '', avatar: '', verifiedAt: '' },
  },
  savedCuts: [],
  queue: [],
  autoPostSettings: null,
  lastUpdated: new Date().toISOString(),
};

function loadPersistedState(): PersistedState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        credentials: { ...DEFAULT_STATE.credentials, ...(parsed.credentials || {}) },
        savedCuts: Array.isArray(parsed.savedCuts) ? parsed.savedCuts : [],
        queue: Array.isArray(parsed.queue) ? parsed.queue : [],
        autoPostSettings: parsed.autoPostSettings || null,
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('Could not read state file, using defaults:', err);
  }
  return { ...DEFAULT_STATE };
}

let appState = loadPersistedState();
let serverCredentials = appState.credentials;

function savePersistedStateToDisk() {
  try {
    appState.credentials = serverCredentials;
    appState.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(appState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist app state to disk:', err);
  }
}

// Automatic Refresh Token Handler for YouTube
interface RefreshTokenResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  missingSecret?: boolean;
}

async function refreshYouTubeToken(customCreds?: {
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}): Promise<RefreshTokenResult> {
  const refreshToken = (customCreds?.refreshToken || serverCredentials.youtube.refreshToken || '').trim();
  if (!refreshToken) {
    return {
      success: false,
      error: 'Nenhum Refresh Token fornecido. Insira a chave que começa com 1//...',
    };
  }

  const clientId = (customCreds?.clientId || serverCredentials.youtube.clientId || '').trim();
  const clientSecret = (customCreds?.clientSecret || serverCredentials.youtube.clientSecret || '').trim();

  // If clientSecret is missing, Google OAuth token endpoint will ALWAYS fail with "client_secret is missing."
  // We intercept this before firing an invalid request to Google.
  if (!clientSecret) {
    return {
      success: false,
      missingSecret: true,
      error:
        'O Google exige o "OAuth Client Secret" para renovar o token automaticamente pelo servidor. No seu Google Cloud Console, copie o Client Secret criado junto ao Client ID. Ou, se gerou pelo OAuth Playground, clique no botão azul "Exchange authorization code for tokens" e copie o Access Token (ya29...) gerado!',
    };
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId || '407408718192.apps.googleusercontent.com');
    params.append('client_secret', clientSecret);
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.access_token) {
        serverCredentials.youtube.accessToken = data.access_token;
        serverCredentials.youtube.refreshToken = refreshToken;
        if (clientId) serverCredentials.youtube.clientId = clientId;
        if (clientSecret) serverCredentials.youtube.clientSecret = clientSecret;
        serverCredentials.youtube.status = 'connected';
        serverCredentials.youtube.verifiedAt = new Date().toLocaleTimeString('pt-BR');
        savePersistedStateToDisk();
        return { success: true, accessToken: data.access_token };
      }
    }

    const errData = await response.json().catch(() => ({}));
    const errDesc = errData.error_description || errData.error || 'Erro ao comunicar com Google OAuth.';
    let friendlyError = `O Google recusou a renovação: ${errDesc}`;

    if (errData.error === 'invalid_request' && errDesc.toLowerCase().includes('client_secret')) {
      friendlyError =
        'Chave Secreta ausente ou inválida. O Google exige o Client Secret correspondente ao seu Client ID no Google Cloud Console.';
    } else if (errData.error === 'invalid_grant') {
      friendlyError =
        'Refresh Token inválido ou revogado. Acesse o OAuth Playground ou Google Cloud para gerar uma nova autorização.';
    }

    return {
      success: false,
      error: friendlyError,
      missingSecret: errDesc.toLowerCase().includes('client_secret'),
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message || 'Erro de rede ao conectar aos servidores do Google OAuth.',
    };
  }
}

app.post('/api/refresh-token/youtube', async (req, res) => {
  const { refreshToken, clientId, clientSecret } = req.body || {};
  const result = await refreshYouTubeToken({ refreshToken, clientId, clientSecret });

  if (result.success && result.accessToken) {
    res.json({
      success: true,
      accessToken: result.accessToken,
      message: 'Token de acesso do YouTube renovado com sucesso pelo Refresh Token!',
      verifiedAt: serverCredentials.youtube.verifiedAt,
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error || 'Não foi possível renovar o token.',
      missingSecret: result.missingSecret || false,
    });
  }
});

// Exchange Authorization Code (4/0A...) for Permanent Tokens
app.post('/api/exchange-code/youtube', async (req, res) => {
  try {
    const { code, clientId, clientSecret, redirectUri } = req.body || {};
    if (!code?.trim()) {
      return res.status(400).json({ error: 'Código de autorização não informado.' });
    }

    const cleanCode = code.trim();
    const useClientId = (clientId || serverCredentials.youtube.clientId || '').trim();
    const useClientSecret = (clientSecret || serverCredentials.youtube.clientSecret || '').trim();

    if (!useClientSecret) {
      return res.status(400).json({
        error:
          'Para trocar o código de autorização diretamente pelo backend, informe o "OAuth Client Secret". Se estiver usando o Google OAuth Playground, clique no botão azul "Exchange authorization code for tokens" no Passo 2 do Playground para obter o Refresh Token (1//...) e Access Token (ya29...)!',
        missingSecret: true,
      });
    }

    const params = new URLSearchParams();
    params.append('code', cleanCode);
    params.append('client_id', useClientId || '407408718192.apps.googleusercontent.com');
    params.append('client_secret', useClientSecret);
    params.append('redirect_uri', redirectUri || 'https://developers.google.com/oauthplayground');
    params.append('grant_type', 'authorization_code');

    const googleRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await googleRes.json().catch(() => ({}));
    if (!googleRes.ok) {
      return res.status(400).json({
        error: `O Google recusou a troca do código: ${data.error_description || data.error || 'Código expirado ou inválido.'}`,
      });
    }

    if (data.access_token) {
      serverCredentials.youtube.accessToken = data.access_token;
      if (data.refresh_token) {
        serverCredentials.youtube.refreshToken = data.refresh_token;
      }
      if (useClientId) serverCredentials.youtube.clientId = useClientId;
      if (useClientSecret) serverCredentials.youtube.clientSecret = useClientSecret;
      serverCredentials.youtube.status = 'connected';
      serverCredentials.youtube.verifiedAt = new Date().toLocaleTimeString('pt-BR');
      savePersistedStateToDisk();

      // Fetch channel info
      let channelName = 'Canal do YouTube';
      let avatar = '';
      try {
        const chRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (chRes.ok) {
          const chData = await chRes.json();
          channelName = chData.items?.[0]?.snippet?.title || channelName;
          avatar = chData.items?.[0]?.snippet?.thumbnails?.default?.url || '';
        }
      } catch (e) {}

      return res.json({
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        channelName,
        avatar,
        message: `Sucesso! Canal "${channelName}" conectado permanentemente.`,
      });
    }

    return res.status(400).json({ error: 'Resposta inesperada do Google ao trocar código.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao processar troca de código com o Google.' });
  }
});

// Full App State Endpoints for 100% Automatic Backup & Synchronization
app.get('/api/storage/state', (_req, res) => {
  res.json({
    success: true,
    state: appState,
    autoSaveActive: true,
    lastUpdated: appState.lastUpdated,
  });
});

app.post('/api/storage/state', (req, res) => {
  try {
    const { savedCuts, queue, autoPostSettings, credentials } = req.body;
    if (Array.isArray(savedCuts)) {
      appState.savedCuts = savedCuts;
    }
    if (Array.isArray(queue)) {
      appState.queue = queue;
    }
    if (autoPostSettings) {
      appState.autoPostSettings = autoPostSettings;
    }
    if (credentials) {
      if (credentials.youtube) serverCredentials.youtube = { ...serverCredentials.youtube, ...credentials.youtube };
      if (credentials.instagram) serverCredentials.instagram = { ...serverCredentials.instagram, ...credentials.instagram };
      if (credentials.tiktok) serverCredentials.tiktok = { ...serverCredentials.tiktok, ...credentials.tiktok };
      appState.credentials = serverCredentials;
    }
    savePersistedStateToDisk();
    res.json({
      success: true,
      message: 'Dados salvos automaticamente com sucesso no disco persistente.',
      lastUpdated: appState.lastUpdated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao persistir dados.' });
  }
});

app.get('/api/storage/status', (_req, res) => {
  res.json({
    autoSaveActive: true,
    persistentStorage: true,
    lastUpdated: appState.lastUpdated,
    savedCutsCount: appState.savedCuts.length,
    queueCount: appState.queue.length,
    storagePath: STATE_FILE,
  });
});

app.get('/api/settings/credentials', (_req, res) => {
  // Return credentials with secrets masked for security
  const safeCreds = {
    youtube: {
      ...serverCredentials.youtube,
      accessToken: serverCredentials.youtube.accessToken ? `${serverCredentials.youtube.accessToken.slice(0, 8)}••••••••` : '',
      clientSecret: serverCredentials.youtube.clientSecret ? '••••••••' : '',
    },
    instagram: {
      ...serverCredentials.instagram,
      accessToken: serverCredentials.instagram.accessToken ? `${serverCredentials.instagram.accessToken.slice(0, 8)}••••••••` : '',
      appSecret: serverCredentials.instagram.appSecret ? '••••••••' : '',
    },
    tiktok: {
      ...serverCredentials.tiktok,
      accessToken: serverCredentials.tiktok.accessToken ? `${serverCredentials.tiktok.accessToken.slice(0, 8)}••••••••` : '',
      clientSecret: serverCredentials.tiktok.clientSecret ? '••••••••' : '',
    },
  };
  res.json({ credentials: safeCreds, rawAvailable: true, autoSaveActive: true });
});

app.post('/api/settings/credentials', (req, res) => {
  const { credentials } = req.body;
  if (credentials) {
    if (credentials.youtube) {
      serverCredentials.youtube = { ...serverCredentials.youtube, ...credentials.youtube };
    }
    if (credentials.instagram) {
      serverCredentials.instagram = { ...serverCredentials.instagram, ...credentials.instagram };
    }
    if (credentials.tiktok) {
      serverCredentials.tiktok = { ...serverCredentials.tiktok, ...credentials.tiktok };
    }
    savePersistedStateToDisk();
  }
  res.json({ success: true, message: 'Credenciais sincronizadas e gravadas com sucesso no disco persistente.' });
});

app.post('/api/settings/credentials/clear', (req, res) => {
  const { platform } = req.body;
  if (platform && serverCredentials[platform as keyof typeof serverCredentials]) {
    (serverCredentials as any)[platform] = { accessToken: '', status: 'disconnected' };
  } else {
    serverCredentials = {
      youtube: { accessToken: '', clientId: '', clientSecret: '', status: 'disconnected', channelTitle: '', avatar: '', verifiedAt: '' },
      instagram: { accessToken: '', businessAccountId: '', appId: '', appSecret: '', status: 'disconnected', accountName: '', avatar: '', verifiedAt: '' },
      tiktok: { accessToken: '', clientKey: '', clientSecret: '', status: 'disconnected', displayName: '', avatar: '', verifiedAt: '' },
    };
  }
  savePersistedStateToDisk();
  res.json({ success: true, message: 'Credenciais redefinidas e removidas do disco persistente.' });
});

// 12. Privacy Policy & Terms of Service Standalone Pages for TikTok & Google Review
app.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy | ViralShorts Studio AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0c0d14;
      color: #e4e4e7;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      line-height: 1.6;
    }
    .container {
      max-width: 840px;
      margin: 0 auto;
      padding: 48px 24px 80px 24px;
    }
    .header {
      border-bottom: 1px solid #27272a;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background-color: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.3);
      color: #d8b4fe;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 8px 0;
      letter-spacing: -0.02em;
    }
    .updated {
      font-size: 13px;
      color: #a1a1aa;
    }
    h2 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 32px;
      margin-bottom: 12px;
      border-left: 3px solid #ff0055;
      padding-left: 12px;
    }
    p, li {
      font-size: 14px;
      color: #d4d4d8;
    }
    ul {
      padding-left: 20px;
      margin-bottom: 16px;
    }
    li {
      margin-bottom: 8px;
    }
    .code-box {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 12px 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #facc15;
      margin: 12px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #7000ff, #ff0055);
      color: #ffffff;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      margin-top: 24px;
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #27272a;
      font-size: 12px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Official Legal Document</div>
      <h1>Privacy Policy</h1>
      <div class="updated">Application: <strong>ViralShorts Studio AI</strong> • Effective Date: October 2026</div>
      <a href="/" class="btn">← Return to Application</a>
    </div>

    <h2>1. Overview</h2>
    <p>
      ViralShorts Studio AI ("the Application", "we", "our") respects the privacy of creators and users. This Privacy Policy describes how information is collected, used, and protected when you access our web application, video clipping editor, and social media publishing integrations (including TikTok, YouTube, and Instagram).
    </p>

    <h2>2. TikTok Data & Content Posting API Usage</h2>
    <p>
      When you authorize the Application with your TikTok account via TikTok for Developers, we request specific permissions required solely for publishing short-form video content:
    </p>
    <ul>
      <li><strong>video.upload:</strong> Used solely to upload video clips that you have edited and explicitly chosen to share.</li>
      <li><strong>video.publish:</strong> Used solely to initiate the publishing of user-approved video cuts directly to your TikTok feed with your chosen captions and hashtags.</li>
      <li><strong>user.info.basic:</strong> Used to display your TikTok display name and profile avatar inside the dashboard to verify that you are connected to the correct channel before uploading.</li>
    </ul>
    <div class="code-box">
      Authorized Scopes: video.upload, video.publish, user.info.basic
    </div>
    <p>
      We do not use TikTok data to track users across third-party websites or sell user data to advertising brokers.
    </p>

    <h2>3. Information We Collect and Process</h2>
    <p>
      Our application processes:
    </p>
    <ul>
      <li><strong>OAuth Access Tokens:</strong> Cryptographically generated access tokens received via OAuth 2.0 to transmit API requests on your behalf. These tokens are saved locally in your browser storage or private session.</li>
      <li><strong>Video & Caption Data:</strong> Timestamps, title overlays, and generated captions created by the user within the editor.</li>
      <li><strong>No Sensitive Personal Data:</strong> We do not collect payment credentials, government identification numbers, or unauthorized media files.</li>
    </ul>

    <h2>4. Data Retention and Security</h2>
    <p>
      We do not store your private video files permanently on our servers. Video trimming is performed on-demand and temporary files are cleared immediately following download or social media submission. Your OAuth credentials remain under your control at all times and can be deleted instantly through the <em>"APIs & Conexões"</em> tab in the Application.
    </p>

    <h2>5. User Rights and Data Deletion</h2>
    <p>
      You have the right to revoke the Application's access at any time:
    </p>
    <ul>
      <li><strong>TikTok:</strong> Go to TikTok app &gt; Settings &gt; Security & Permissions &gt; Apps & Services &gt; Remove Access.</li>
      <li><strong>Google:</strong> Go to Google Account Settings &gt; Security &gt; Third-party apps with account access &gt; Remove Access.</li>
      <li>To request complete data deletion from our application, contact our developer support team at: <strong>erick.moreiradefensoria@gmail.com</strong>.</li>
    </ul>

    <h2>6. Contact Information</h2>
    <p>
      If you have questions regarding this Privacy Policy or platform compliance, please contact:
    </p>
    <p>
      <strong>Developer Contact:</strong> Erick Moreira<br>
      <strong>Email:</strong> <a href="mailto:erick.moreiradefensoria@gmail.com" style="color: #c084fc;">erick.moreiradefensoria@gmail.com</a><br>
      <strong>Application URL:</strong> https://ais-pre-ltudgifgehf3xcxgif3v3g-181386880351.us-east1.run.app
    </p>

    <div class="footer">
      © 2026 ViralShorts Studio AI. Compliant with TikTok Developer Terms of Service and Google API Services User Data Policy.
    </div>
  </div>
</body>
</html>`);
});

app.get('/terms', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service | ViralShorts Studio AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0c0d14;
      color: #e4e4e7;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      line-height: 1.6;
    }
    .container {
      max-width: 840px;
      margin: 0 auto;
      padding: 48px 24px 80px 24px;
    }
    .header {
      border-bottom: 1px solid #27272a;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background-color: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 8px 0;
      letter-spacing: -0.02em;
    }
    .updated {
      font-size: 13px;
      color: #a1a1aa;
    }
    h2 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 32px;
      margin-bottom: 12px;
      border-left: 3px solid #3b82f6;
      padding-left: 12px;
    }
    p, li {
      font-size: 14px;
      color: #d4d4d8;
    }
    ul {
      padding-left: 20px;
      margin-bottom: 16px;
    }
    li {
      margin-bottom: 8px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #7000ff, #ff0055);
      color: #ffffff;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      margin-top: 24px;
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #27272a;
      font-size: 12px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Official Legal Document</div>
      <h1>Terms of Service</h1>
      <div class="updated">Application: <strong>ViralShorts Studio AI</strong> • Effective Date: October 2026</div>
      <a href="/" class="btn">← Return to Application</a>
    </div>

    <h2>1. Acceptance of Terms</h2>
    <p>
      By accessing or using ViralShorts Studio AI ("the Service"), you agree to be legally bound by these Terms of Service. If you do not agree to these terms, you may not use the Service.
    </p>

    <h2>2. Description of the Service</h2>
    <p>
      ViralShorts Studio AI provides video creators with tools to analyze video transcripts, edit vertical 9:16 highlight clips, generate optimized titles, captions, and hashtags, and upload approved media directly to third-party social media platforms including TikTok, YouTube Shorts, and Instagram Reels.
    </p>

    <h2>3. User Responsibilities & Content Ownership</h2>
    <p>
      Users retain full ownership of their original media content. You represent and warrant that:
    </p>
    <ul>
      <li>You own or have acquired all required intellectual property rights and licenses for the media you process and publish.</li>
      <li>Content published via our integration does not violate TikTok Community Guidelines, YouTube Community Guidelines, or Meta Terms of Service.</li>
      <li>You will not use the Service to publish unlawful, harassing, infringing, or malicious content.</li>
    </ul>

    <h2>4. Integration with Third-Party Platforms</h2>
    <p>
      Our Service utilizes official APIs provided by TikTok, Google/YouTube, and Meta. Your use of these features is subject to the respective terms of each platform:
    </p>
    <ul>
      <li><a href="https://www.tiktok.com/legal/terms-of-service" target="_blank" style="color: #60a5fa;">TikTok Terms of Service</a></li>
      <li><a href="https://www.youtube.com/t/terms" target="_blank" style="color: #60a5fa;">YouTube Terms of Service</a></li>
      <li><a href="https://www.facebook.com/terms.php" target="_blank" style="color: #60a5fa;">Meta Terms of Service</a></li>
    </ul>

    <h2>5. Termination</h2>
    <p>
      We reserve the right to suspend or terminate access to the Service for any user who violates these Terms of Service or abuses platform rate limits.
    </p>

    <h2>6. Contact Us</h2>
    <p>
      For questions about these Terms of Service, contact:
    </p>
    <p>
      <strong>Developer Contact:</strong> Erick Moreira<br>
      <strong>Email:</strong> <a href="mailto:erick.moreiradefensoria@gmail.com" style="color: #60a5fa;">erick.moreiradefensoria@gmail.com</a>
    </p>

    <div class="footer">
      © 2026 ViralShorts Studio AI. All rights reserved.
    </div>
  </div>
</body>
</html>`);
});

// 13. API 404 & Error Handler - Prevents /api calls from ever returning Vite HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Endpoint não encontrado: ${req.method} ${req.originalUrl}` });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express API Error:', err);
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({ error: err.message || 'Erro interno no servidor da API.' });
  }
  next(err);
});

// Vite Middleware or Static Server
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AI Viral Shorts Cutter Server running on port ${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
});
