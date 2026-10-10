import { Router, Request, Response } from 'express';
import { stateManager } from '../services/stateService.js';
import { refreshYouTubeToken } from '../services/youtubeService.js';
import { STATE_FILE } from '../config.js';

export const stateRouter = Router();

// 1. Get Full Persisted State (with automatic YouTube Refresh Token self-healing)
stateRouter.get('/storage/state', async (_req: Request, res: Response) => {
  let state = stateManager.getState();

  // Auto-heal YouTube connection if a permanent Refresh Token (1//...) is saved
  const yt = state.credentials?.youtube;
  if (yt?.refreshToken?.startsWith('1//') && (yt.status !== 'connected' || !yt.accessToken)) {
    try {
      const refreshed = await refreshYouTubeToken({ refreshToken: yt.refreshToken });
      if (refreshed.success) {
        state = stateManager.getState();
      }
    } catch {}
  }

  res.json({
    success: true,
    state,
    autoSaveActive: true,
    lastUpdated: state.lastUpdated,
  });
});

// 2. Save Full Persisted State
stateRouter.post('/storage/state', (req: Request, res: Response) => {
  try {
    const { savedCuts, queue, autoPostSettings, credentials } = req.body;
    stateManager.updateFullState({
      savedCuts,
      queue,
      autoPostSettings,
      credentials,
    });

    const state = stateManager.getState();
    res.json({
      success: true,
      message: 'Dados salvos automaticamente com sucesso no disco persistente.',
      lastUpdated: state.lastUpdated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao persistir dados.' });
  }
});

// 3. Storage Status
stateRouter.get('/storage/status', (_req: Request, res: Response) => {
  const state = stateManager.getState();
  res.json({
    autoSaveActive: true,
    persistentStorage: true,
    lastUpdated: state.lastUpdated,
    savedCutsCount: state.savedCuts.length,
    queueCount: state.queue.length,
    storagePath: STATE_FILE,
  });
});

// 4. Get Credentials (with masked secrets)
stateRouter.get('/settings/credentials', (_req: Request, res: Response) => {
  const creds = stateManager.getCredentials();
  const safeCreds = {
    youtube: {
      ...creds.youtube,
      accessToken: creds.youtube.accessToken ? `${creds.youtube.accessToken.slice(0, 8)}••••••••` : '',
      clientSecret: creds.youtube.clientSecret ? '••••••••' : '',
    },
    instagram: {
      ...creds.instagram,
      accessToken: creds.instagram.accessToken ? `${creds.instagram.accessToken.slice(0, 8)}••••••••` : '',
      appSecret: creds.instagram.appSecret ? '••••••••' : '',
    },
    tiktok: {
      ...creds.tiktok,
      accessToken: creds.tiktok.accessToken ? `${creds.tiktok.accessToken.slice(0, 8)}••••••••` : '',
      clientSecret: creds.tiktok.clientSecret ? '••••••••' : '',
    },
  };
  res.json({ credentials: safeCreds, rawAvailable: true, autoSaveActive: true });
});

// 5. Update Credentials
stateRouter.post('/settings/credentials', (req: Request, res: Response) => {
  const { credentials } = req.body;
  if (credentials) {
    stateManager.updateCredentials(credentials);
  }
  res.json({ success: true, message: 'Credenciais sincronizadas e gravadas com sucesso no disco persistente.' });
});

// 6. Clear Credentials
stateRouter.post('/settings/credentials/clear', (req: Request, res: Response) => {
  const { platform } = req.body;
  stateManager.clearCredentials(platform);
  res.json({ success: true, message: 'Credenciais redefinidas e removidas do disco persistente.' });
});
