import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { UPLOADS_DIR } from '../config.js';
import { renderRealCutVideo, downloadAndProcessYouTubeCut } from '../services/ffmpegService.js';
import { uploadVideoToYouTube } from '../services/youtubeService.js';
import { stateManager } from '../services/stateService.js';

export const cutRouter = Router();

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// 1. Download YouTube Video Slice & Render 9:16 Vertical Cut Directly
cutRouter.post('/download-youtube-cut', async (req: Request, res: Response) => {
  let renderedPath: string | null = null;
  try {
    const {
      videoUrl,
      startTime = '00:00',
      endTime = '00:30',
      format = 'vertical_blur',
      title = 'corte_viral',
      hook = '',
    } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'URL do vídeo do YouTube não informada.' });
    }

    console.log(`[CutRoutes] Iniciando corte real do YouTube: ${videoUrl} [${startTime} -> ${endTime}]`);

    renderedPath = await downloadAndProcessYouTubeCut({
      videoUrl,
      startTime,
      endTime,
      format,
      overlayTitle: title,
      hook,
    });

    const safeTitle = (title || 'corte_viral').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    res.download(renderedPath, `${safeTitle}.mp4`, () => {
      try {
        if (renderedPath && fs.existsSync(renderedPath)) fs.unlinkSync(renderedPath);
      } catch {}
    });
  } catch (err: any) {
    console.error('[CutRoutes] Erro ao cortar vídeo do YouTube:', err);
    if (renderedPath && fs.existsSync(renderedPath)) {
      try { fs.unlinkSync(renderedPath); } catch {}
    }
    res.status(500).json({ error: err.message || 'Erro ao processar e baixar corte do YouTube.' });
  }
});

// 2. Upload Real Local Video File, Cut with FFmpeg and Post directly to YouTube
cutRouter.post('/upload-and-cut-short', upload.single('video'), async (req: Request, res: Response) => {
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

    const serverCreds = stateManager.getCredentials();
    const tokenToUse = (token || serverCreds.youtube.accessToken || '').trim();
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
    } catch {}
  }
});

// 3. Render Local Video File Cut to MP4 and Download to Computer
cutRouter.post('/render-download-cut', upload.single('video'), async (req: Request, res: Response) => {
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
