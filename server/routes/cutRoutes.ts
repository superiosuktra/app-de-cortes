import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { UPLOADS_DIR, TEMP_DIR } from '../config.js';
import { renderRealCutVideo, downloadAndProcessYouTubeCut } from '../services/ffmpegService.js';
import { uploadVideoToYouTube } from '../services/youtubeService.js';
import { stateManager } from '../services/stateService.js';
import {
  createRateLimiter,
  normalizeSafeYouTubeUrl,
  sanitizeTimestamp,
  isPathInsideDir,
} from '../middleware/security.js';

export const cutRouter = Router();

const ALLOWED_VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v']);

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isVideoMime = (file.mimetype || '').startsWith('video/') || file.mimetype === 'application/octet-stream';
    if (!ALLOWED_VIDEO_EXTENSIONS.has(ext) && !isVideoMime) {
      return cb(new Error('Formato de arquivo não permitido. Envie apenas arquivos de vídeo (.mp4, .mov, .webm, .mkv).'));
    }
    cb(null, true);
  },
});

const renderRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  scope: 'ffmpeg-render',
  message: 'Limite de renderizações de vídeo por minuto atingido. Aguarde a conclusão do processamento atual.',
});

// 1. Download YouTube Video Slice & Render 9:16 Vertical Cut Directly
cutRouter.post('/download-youtube-cut', renderRateLimiter, async (req: Request, res: Response) => {
  let renderedPath: string | null = null;
  try {
    const {
      videoUrl,
      startTime = '00:00',
      endTime = '00:30',
      format = 'split_screen',
      title = 'corte_viral',
      hook = '',
      framing,
    } = req.body;

    const safeYt = normalizeSafeYouTubeUrl(videoUrl);
    if (!safeYt) {
      return res.status(400).json({ error: 'URL do YouTube inválida ou bloqueada por política de segurança.' });
    }

    const cleanStart = sanitizeTimestamp(startTime, '00:00');
    const cleanEnd = sanitizeTimestamp(endTime, '00:30');

    console.log(`[CutRoutes] Iniciando corte real do YouTube: ${safeYt.canonicalUrl} [${cleanStart} -> ${cleanEnd}]`);

    renderedPath = await downloadAndProcessYouTubeCut({
      videoUrl: safeYt.canonicalUrl,
      startTime: cleanStart,
      endTime: cleanEnd,
      format,
      overlayTitle: title,
      hook,
      framing,
    });

    if (!isPathInsideDir(renderedPath, TEMP_DIR)) {
      throw new Error('Caminho de arquivo de saída inválido.');
    }

    const safeTitle = (title || 'corte_viral').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    res.download(renderedPath, `${safeTitle}.mp4`, () => {
      try {
        if (renderedPath && fs.existsSync(renderedPath)) fs.unlinkSync(renderedPath);
      } catch {}
    });
  } catch (err: any) {
    console.error('[CutRoutes] Erro ao cortar vídeo do YouTube:', err);
    if (renderedPath && fs.existsSync(renderedPath)) {
      try {
        fs.unlinkSync(renderedPath);
      } catch {}
    }
    res.status(500).json({ error: err.message || 'Erro ao processar e baixar corte do YouTube.' });
  }
});

// 2. Upload Real Local Video File, Cut with FFmpeg and Post directly to YouTube
cutRouter.post('/upload-and-cut-short', renderRateLimiter, upload.single('video'), async (req: Request, res: Response) => {
  let renderedPath = '';
  try {
    const file = req.file;
    if (!file || !isPathInsideDir(file.path, UPLOADS_DIR)) {
      return res.status(400).json({ error: 'Nenhum arquivo de vídeo válido foi enviado.' });
    }

    const {
      startTime = '00:00',
      endTime = '00:30',
      format = 'split_screen',
      title = 'Corte Viral #Shorts',
      description = '',
      privacy = 'public',
      tags = '',
      token = '',
      hook = '',
      framing,
    } = req.body;

    const serverCreds = stateManager.getCredentials();
    const tokenToUse = (token || serverCreds.youtube.accessToken || '').trim();
    if (!tokenToUse) {
      return res.status(400).json({ error: 'Token de autorização do YouTube não configurado.' });
    }

    // Cut and render real vertical video using FFmpeg
    renderedPath = await renderRealCutVideo({
      inputFilePath: file.path,
      startTime: sanitizeTimestamp(startTime, '00:00'),
      endTime: sanitizeTimestamp(endTime, '00:30'),
      format,
      overlayTitle: title,
      hook,
      framing,
    });

    const parsedTags =
      typeof tags === 'string'
        ? tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
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
    } catch {}
  }
});

// 3. Render Local Video File Cut to MP4 and Download to Computer
cutRouter.post('/render-download-cut', renderRateLimiter, upload.single('video'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file || !isPathInsideDir(file.path, UPLOADS_DIR)) {
      return res.status(400).json({ error: 'Nenhum arquivo de vídeo válido foi enviado.' });
    }

    const {
      startTime = '00:00',
      endTime = '00:30',
      format = 'split_screen',
      title = 'corte_viral',
      framing,
    } = req.body;

    const renderedPath = await renderRealCutVideo({
      inputFilePath: file.path,
      startTime: sanitizeTimestamp(startTime, '00:00'),
      endTime: sanitizeTimestamp(endTime, '00:30'),
      format,
      overlayTitle: title,
      framing,
    });

    const safeTitle = (title || 'corte_viral').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    res.download(renderedPath, `${safeTitle}.mp4`, () => {
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        if (fs.existsSync(renderedPath)) fs.unlinkSync(renderedPath);
      } catch {}
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao renderizar o vídeo para download.' });
  }
});
