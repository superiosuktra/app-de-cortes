import { Router, Request, Response } from 'express';
import {
  extractVideoId,
  fetchVideoMetadata,
  fetchTranscript,
  fetchTrendingVideos,
  analyzeViralCuts,
  generateCaption,
} from '../services/geminiService.js';
import { generateFfmpegCommand } from '../services/ffmpegService.js';

export const videoRouter = Router();

// 1. Fetch Video Metadata via oEmbed
videoRouter.post('/video-info', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const videoId = extractVideoId(url);
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
    const videoId = extractVideoId(url);
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
    const niche = (req.body?.niche || req.query?.niche || 'geral') as string;
    const trending = await fetchTrendingVideos(niche);
    res.json({ trending, videos: trending });
  } catch (error: any) {
    console.error('[VideoRoutes] Trending error:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar vídeos em alta.' });
  }
}
videoRouter.get('/trending', handleTrending);
videoRouter.post('/trending', handleTrending);

// 4. Detect & Analyze Viral Cuts with Gemini
videoRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { videoUrl, transcript, userPrompt, videoTitle, channelName, cutsCount } = req.body;
    const cuts = await analyzeViralCuts({
      videoUrl,
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

// 5. Generate Tailored Social Media Captions
videoRouter.post('/generate-caption', async (req: Request, res: Response) => {
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
    const { videoUrl, startTime, endTime, format, title } = req.body;
    const result = generateFfmpegCommand({
      videoUrl,
      startTime,
      endTime,
      format,
      title,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao gerar comando FFmpeg.' });
  }
});
