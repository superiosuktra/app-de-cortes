import { Router, Request, Response } from 'express';
import {
  extractVideoId,
  fetchVideoMetadata,
  fetchTranscript,
  fetchTrendingVideos,
  analyzeViralCuts,
  analyzeVideoFraming,
  generateCaption,
} from '../services/geminiService.js';
import { generateFfmpegCommand } from '../services/ffmpegService.js';
import { createRateLimiter, normalizeSafeYouTubeUrl, sanitizeTimestamp } from '../middleware/security.js';

export const videoRouter = Router();

const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 25,
  scope: 'ai-analysis',
  message: 'Limite de análises de IA por minuto atingido. Aguarde alguns segundos.',
});

// 1. Fetch Video Metadata via oEmbed (Protected against SSRF)
videoRouter.post('/video-info', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const safeYt = normalizeSafeYouTubeUrl(url);
    const videoId = safeYt?.videoId || extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'URL ou ID do YouTube inválido.' });
    }

    const metadata = await fetchVideoMetadata(videoId);
    res.json(metadata);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao buscar dados do vídeo.' });
  }
});

// 2. Fetch Video Transcript
videoRouter.post('/transcript', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const safeYt = normalizeSafeYouTubeUrl(url);
    const videoId = safeYt?.videoId || extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'URL ou ID do YouTube inválido.' });
    }

    const result = await fetchTranscript(videoId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao buscar transcrição.' });
  }
});

// 3. Auto Explore Trending Long-form Videos for Viral Shorts
async function handleTrending(req: Request, res: Response) {
  try {
    const niche = String(req.body?.niche || req.query?.niche || 'geral').slice(0, 40);
    const trending = await fetchTrendingVideos(niche);
    res.json({ trending, videos: trending });
  } catch (error: any) {
    console.error('[VideoRoutes] Trending error:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar vídeos em alta.' });
  }
}
videoRouter.get('/trending', handleTrending);
videoRouter.post('/trending', handleTrending);

// 4. Detect & Analyze Viral Cuts with Gemini + Multimodal Framing
videoRouter.post('/analyze', aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { videoUrl, transcript, userPrompt, videoTitle, channelName, cutsCount } = req.body;
    const safeYt = normalizeSafeYouTubeUrl(videoUrl);
    const cleanUrl = safeYt?.canonicalUrl || videoUrl;

    const cuts = await analyzeViralCuts({
      videoUrl: cleanUrl,
      transcript,
      userPrompt,
      videoTitle,
      channelName,
      cutsCount: cutsCount ? Number(cutsCount) : 8,
    });

    res.json({
      success: true,
      cuts,
      total: cuts.length,
    });
  } catch (error: any) {
    console.error('[VideoRoutes] Analyze error:', error);
    res.status(500).json({ error: error.message || 'Erro ao analisar cortes com IA.' });
  }
});

// 4b. Multimodal Gemini Vision Framing Detection (Scene Frames 1, 2, 3)
videoRouter.post('/analyze-framing', aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { videoUrl, videoId, videoTitle } = req.body;
    const safeYt = normalizeSafeYouTubeUrl(videoUrl || videoId);
    const framing = await analyzeVideoFraming({
      videoUrl: safeYt?.canonicalUrl || videoUrl,
      videoId: safeYt?.videoId || extractVideoId(videoId || videoUrl || '') || 'B57eOqeLVfc',
      videoTitle,
    });
    res.json(framing);
  } catch (error: any) {
    console.error('[VideoRoutes] Analyze framing error:', error);
    res.status(500).json({ error: error.message || 'Erro ao detectar enquadramento com IA Vision.' });
  }
});

// 5. Generate Tailored Social Media Captions
videoRouter.post('/generate-caption', aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { cutTitle, hook, platform, trigger, customTone } = req.body;
    const caption = await generateCaption({
      cutTitle,
      hook,
      platform,
      trigger,
      customTone,
    });

    res.json({ caption });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao gerar legenda personalizada.' });
  }
});

// 6. Generate FFmpeg Command
videoRouter.post('/ffmpeg-command', (req: Request, res: Response) => {
  try {
    const { videoUrl, startTime, endTime, format, title, framing } = req.body;
    const safeYt = normalizeSafeYouTubeUrl(videoUrl);
    const result = generateFfmpegCommand({
      videoUrl: safeYt?.canonicalUrl || 'https://www.youtube.com/watch?v=B57eOqeLVfc',
      startTime: sanitizeTimestamp(startTime, '00:00'),
      endTime: sanitizeTimestamp(endTime, '00:45'),
      format,
      title,
      framing,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao gerar comando FFmpeg.' });
  }
});
