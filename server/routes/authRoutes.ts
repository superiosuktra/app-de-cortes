import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { stateManager } from '../services/stateService.js';
import { exchangeYouTubeAuthCode, fetchYouTubeChannelProfile } from '../services/youtubeService.js';

export const authRouter = Router();

// 1. Get current logged in user session
authRouter.get('/auth/me', (req: Request, res: Response) => {
  if (req.user && req.userId !== 'default') {
    return res.json({
      authenticated: true,
      user: req.user,
    });
  }

  return res.json({
    authenticated: false,
    user: null,
  });
});

// 2. 1-Click Instant Demo Login (for local testing without OAuth keys)
authRouter.post('/auth/demo-login', (req: Request, res: Response) => {
  try {
    const demoId = 'usr_demo_creator';
    const demoEmail = 'criador@viralshorts.ai';
    const demoName = 'Criador Viral (Demonstração)';
    const demoAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop';

    // Ensure demo user exists in SQLite
    db.prepare(`
      INSERT INTO users (id, google_id, email, name, picture, last_login)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        last_login = CURRENT_TIMESTAMP
    `).run(demoId, 'google_demo_123', demoEmail, demoName, demoAvatar);

    // Create session token
    const sessionToken = `demo_tok_${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO user_sessions (session_token, user_id, expires_at)
      VALUES (?, ?, datetime('now', '+30 days'))
    `).run(sessionToken, demoId);

    const userObj = {
      id: demoId,
      email: demoEmail,
      name: demoName,
      picture: demoAvatar,
    };

    return res.json({
      success: true,
      token: sessionToken,
      user: userObj,
      message: 'Conectado com sucesso no Modo Demonstração!',
    });
  } catch (err: any) {
    console.error('[AuthRoutes] Erro no login demo:', err);
    return res.status(500).json({ error: 'Erro ao iniciar sessão demo.' });
  }
});

// 3. Initiate Google Sign-In with OAuth
authRouter.get('/auth/google/login', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const callbackUri = `${protocol}://${host}/api/auth/google/callback`;

  const customClientId = (
    (req.query.clientId as string) ||
    process.env.GOOGLE_CLIENT_ID ||
    '407408718192.apps.googleusercontent.com'
  ).trim();

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', customClientId);
  authUrl.searchParams.set('redirect_uri', callbackUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set(
    'scope',
    'openid email profile https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly'
  );
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent select_account');

  res.redirect(authUrl.toString());
});

// 4. Google OAuth Callback (Exchanges code, gets user profile, saves tokens automatically)
authRouter.get('/auth/google/callback', async (req: Request, res: Response) => {
  const code = (req.query.code as string) || '';
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const callbackUri = `${protocol}://${host}/api/auth/google/callback`;

  if (!code) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <body style="background:#0f101a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;max-width:400px;padding:24px;background:#161827;border-radius:16px;border:1px solid #ef4444;">
            <h3 style="color:#f87171;">Autorização Cancelada</h3>
            <p style="font-size:13px;color:#a1a1aa;">Nenhum código de autorização foi recebido do Google.</p>
            <button onclick="window.close()" style="margin-top:12px;padding:8px 16px;background:#ef4444;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">Fechar Janela</button>
          </div>
        </body>
      </html>
    `);
  }

  try {
    // Exchange code for tokens
    const exchange = await exchangeYouTubeAuthCode({
      code,
      redirectUri: callbackUri,
    });

    if (!exchange.success || !exchange.accessToken) {
      throw new Error(exchange.error || 'Falha ao trocar código de autorização com o Google.');
    }

    // Fetch user profile from Google UserInfo
    let googleUser: any = {};
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${exchange.accessToken}` },
      });
      if (userRes.ok) {
        googleUser = await userRes.json();
      }
    } catch (e) {
      console.warn('[AuthRoutes] Aviso ao buscar userinfo do Google:', e);
    }

    const email = googleUser.email || `${exchange.channelName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;
    const name = googleUser.name || exchange.channelName || 'Usuário Google';
    const picture = googleUser.picture || exchange.avatar || '';
    const googleId = googleUser.sub || `yt_${exchange.channelName}`;
    const userId = `usr_${crypto.createHash('md5').update(email).digest('hex').slice(0, 16)}`;

    // Upsert into users table
    db.prepare(`
      INSERT INTO users (id, google_id, email, name, picture, last_login)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET
        google_id = excluded.google_id,
        name = excluded.name,
        picture = excluded.picture,
        last_login = CURRENT_TIMESTAMP
    `).run(userId, googleId, email, name, picture);

    // Save YouTube credentials isolated to this user's account!
    stateManager.updateCredentials(
      {
        youtube: {
          accessToken: exchange.accessToken,
          refreshToken: exchange.refreshToken,
          status: 'connected',
          channelTitle: exchange.channelName,
          displayName: exchange.channelName,
          accountName: exchange.channelName,
          customUrl: exchange.customUrl,
          avatar: exchange.avatar || picture,
          verifiedAt: new Date().toLocaleTimeString('pt-BR'),
        },
      },
      userId
    );

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    db.prepare(`
      INSERT INTO user_sessions (session_token, user_id, expires_at)
      VALUES (?, ?, datetime('now', '+30 days'))
    `).run(sessionToken, userId);

    const userPayload = {
      id: userId,
      email,
      name,
      picture,
    };

    const updatedYtCreds = stateManager.getCredentials(userId).youtube;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <body style="background:#0f101a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;max-width:420px;padding:28px;background:#161827;border-radius:20px;border:1px solid #10b981;">
            <img src="${picture || 'https://via.placeholder.com/80'}" style="width:72px;height:72px;border-radius:50%;border:2px solid #10b981;margin-bottom:12px;object-fit:cover;" />
            <h2 style="color:#34d399;margin:0 0 8px;">Bem-vindo(a), ${name}!</h2>
            <p style="font-size:14px;color:#d4d4d8;margin-bottom:6px;">
              Sua conta Google e canal <strong>${exchange.channelName}</strong> foram vinculados com sucesso.
            </p>
            <p style="font-size:12px;color:#71717a;">Seus tokens e cortes foram salvos automaticamente no seu perfil.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                success: true,
                token: ${JSON.stringify(sessionToken)},
                user: ${JSON.stringify(userPayload)},
                youtube: ${JSON.stringify(updatedYtCreds)},
                message: 'Conectado com sucesso!'
              }, '*');
              window.opener.postMessage({
                type: 'GOOGLE_OAUTH_SUCCESS',
                success: true,
                token: ${JSON.stringify(sessionToken)},
                user: ${JSON.stringify(userPayload)},
                youtube: ${JSON.stringify(updatedYtCreds)},
                message: 'Canal conectado com sucesso!'
              }, '*');
              setTimeout(() => window.close(), 1200);
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('[AuthRoutes] Erro no callback do Google OAuth:', err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <body style="background:#0f101a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;max-width:400px;padding:24px;background:#161827;border-radius:16px;border:1px solid #ef4444;">
            <h3 style="color:#f87171;">Erro na Autenticação</h3>
            <p style="font-size:13px;color:#d4d4d8;">${err.message || 'Falha ao autenticar com o Google.'}</p>
            <button onclick="window.close()" style="margin-top:12px;padding:8px 16px;background:#ef4444;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">Fechar Janela</button>
          </div>
        </body>
      </html>
    `);
  }
});

// 5. Logout session
authRouter.post('/auth/logout', (req: Request, res: Response) => {
  const token =
    (req.headers['x-session-token'] as string) ||
    (req.headers['authorization']?.startsWith('Bearer ')
      ? req.headers['authorization'].slice(7).trim()
      : null);

  if (token) {
    try {
      db.prepare('DELETE FROM user_sessions WHERE session_token = ?').run(token);
    } catch {}
  }

  res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
});
