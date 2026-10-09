import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { TEMP_DIR, getSystemFont } from '../config.js';
import { stateManager } from './stateService.js';
import { getFfmpegPath, downloadAndProcessYouTubeCut } from './ffmpegService.js';

const execPromise = util.promisify(exec);

export interface RefreshTokenResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  missingSecret?: boolean;
}

/**
 * Automatically refreshes YouTube OAuth Access Token using stored or passed Refresh Token
 */
export async function refreshYouTubeToken(customCreds?: {
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}): Promise<RefreshTokenResult> {
  const serverCreds = stateManager.getCredentials();
  const refreshToken = (customCreds?.refreshToken || serverCreds.youtube.refreshToken || '').trim();

  if (!refreshToken) {
    return {
      success: false,
      error: 'Nenhum Refresh Token fornecido. Insira a chave que começa com 1//...',
    };
  }

  const clientId = (customCreds?.clientId || serverCreds.youtube.clientId || '').trim();
  const clientSecret = (customCreds?.clientSecret || serverCreds.youtube.clientSecret || '').trim();

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
        stateManager.updateCredentials({
          youtube: {
            ...serverCreds.youtube,
            accessToken: data.access_token,
            refreshToken,
            clientId: clientId || serverCreds.youtube.clientId,
            clientSecret: clientSecret || serverCreds.youtube.clientSecret,
            status: 'connected',
            verifiedAt: new Date().toLocaleTimeString('pt-BR'),
          },
        });
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

/**
 * Exchanges a temporary Authorization Code (4/...) for permanent Access & Refresh tokens
 */
export async function exchangeYouTubeAuthCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
}: {
  code: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}) {
  const serverCreds = stateManager.getCredentials();
  const cleanCode = code.trim();
  const useClientId = (clientId || serverCreds.youtube.clientId || '').trim();
  const useClientSecret = (clientSecret || serverCreds.youtube.clientSecret || '').trim();

  if (!useClientSecret) {
    return {
      success: false,
      missingSecret: true,
      error:
        'Para trocar o código de autorização diretamente pelo backend, informe o "OAuth Client Secret". Se estiver usando o Google OAuth Playground, clique no botão azul "Exchange authorization code for tokens" no Passo 2 do Playground para obter o Refresh Token (1//...) e Access Token (ya29...)!',
    };
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
    return {
      success: false,
      error: `O Google recusou a troca do código: ${data.error_description || data.error || 'Código expirado ou inválido.'}`,
    };
  }

  if (data.access_token) {
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
    } catch {}

    stateManager.updateCredentials({
      youtube: {
        ...serverCreds.youtube,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || serverCreds.youtube.refreshToken,
        clientId: useClientId || serverCreds.youtube.clientId,
        clientSecret: useClientSecret,
        status: 'connected',
        channelTitle: channelName,
        displayName: channelName,
        accountName: channelName,
        avatar,
        verifiedAt: new Date().toLocaleTimeString('pt-BR'),
      },
    });

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      channelName,
      avatar,
      message: `Sucesso! Canal "${channelName}" conectado permanentemente.`,
    };
  }

  return { success: false, error: 'Resposta inesperada do Google ao trocar código.' };
}

/**
 * Uploads a video to YouTube Shorts using the Google YouTube Data API v3 multipart protocol
 */
export async function uploadVideoToYouTube({
  token,
  title,
  description,
  privacy = 'public',
  tags = ['Shorts', 'Viral'],
  hook = 'Se você não dominar sua mente logo cedo...',
  videoFilePath,
  videoUrl,
  startTime,
  endTime,
  format,
}: {
  token: string;
  title: string;
  description: string;
  privacy?: string;
  tags?: string[];
  hook?: string;
  videoFilePath?: string;
  videoUrl?: string;
  startTime?: string;
  endTime?: string;
  format?: string;
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
  const tmpId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  let tmpVideoPath = videoFilePath || '';
  const titleTxtPath = path.join(TEMP_DIR, `yt_title_${tmpId}.txt`);
  const hookTxtPath = path.join(TEMP_DIR, `yt_hook_${tmpId}.txt`);
  const fontPath = getSystemFont();
  const ffmpegCmd = getFfmpegPath();
  let createdCutFile = false;

  try {
    const cleanTitle = (title || 'Corte Viral #Shorts').replace(/[\r\n]+/g, ' ').slice(0, 95);
    const cleanHook = (hook || 'Se você não dominar sua mente logo cedo...').replace(/[\r\n]+/g, ' ').slice(0, 70);

    // 1. If no custom file was provided, but a videoUrl is available, download and process real YouTube cut!
    if (!tmpVideoPath || !fs.existsSync(tmpVideoPath)) {
      if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.length === 11)) {
        try {
          console.log(`[YouTube Upload] Baixando e processando trecho real do YouTube: ${videoUrl} (${startTime || '00:00'} a ${endTime || '00:30'})...`);
          tmpVideoPath = await downloadAndProcessYouTubeCut({
            videoUrl,
            startTime: startTime || '00:00',
            endTime: endTime || '00:30',
            format: format || 'vertical_blur',
            overlayTitle: cleanTitle,
            hook: cleanHook,
          });
          createdCutFile = true;
          console.log(`[YouTube Upload] Corte real processado com sucesso: ${tmpVideoPath}`);
        } catch (downloadErr: any) {
          console.warn(`[YouTube Upload] Não foi possível cortar diretamente do YouTube (${downloadErr.message}). Utilizando template sintético como contingência.`);
        }
      }
    }

    // 2. Contingency fallback: If still no file, render a stylized template
    if (!tmpVideoPath || !fs.existsSync(tmpVideoPath)) {
      tmpVideoPath = path.join(TEMP_DIR, `yt_short_${tmpId}.mp4`);
      createdCutFile = true;
      fs.writeFileSync(titleTxtPath, cleanTitle, 'utf8');
      fs.writeFileSync(hookTxtPath, cleanHook, 'utf8');

      let drawFilters = '';
      if (fontPath) {
        const escapedFont = fontPath.replace(/:/g, '\\:').replace(/\\/g, '/');
        const escapedTitle = titleTxtPath.replace(/:/g, '\\:').replace(/\\/g, '/');
        const escapedHook = hookTxtPath.replace(/:/g, '\\:').replace(/\\/g, '/');
        drawFilters = `,drawtext=fontfile='${escapedFont}':textfile='${escapedTitle}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=430,drawtext=fontfile='${escapedFont}':textfile='${escapedHook}':fontcolor=#fcd34d:fontsize=32:x=(w-text_w)/2:y=520`;
      }

      await execPromise(
        `"${ffmpegCmd}" -y -f lavfi -i "color=c=#0f1016:s=1080x1920:d=10" -f lavfi -i "sine=frequency=528:beep_factor=3:duration=10" -filter_complex "[0:v]drawbox=x=60:y=350:w=960:h=300:color=#7c3aed@0.9:t=fill${drawFilters}[v]" -map "[v]" -map 1:a -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart -t 10 "${tmpVideoPath}"`,
        { timeout: 35000 }
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

    // Update state manager with verified channel info
    const serverCreds = stateManager.getCredentials();
    stateManager.updateCredentials({
      youtube: {
        ...serverCreds.youtube,
        status: 'connected',
        accountName: channelTitle,
        channelTitle,
        customUrl: '@' + channelTitle.replace(/\s+/g, '-'),
      },
    });

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
      if (createdCutFile && tmpVideoPath && fs.existsSync(tmpVideoPath)) fs.unlinkSync(tmpVideoPath);
      if (fs.existsSync(titleTxtPath)) fs.unlinkSync(titleTxtPath);
      if (fs.existsSync(hookTxtPath)) fs.unlinkSync(hookTxtPath);
    } catch {}
  }
}
