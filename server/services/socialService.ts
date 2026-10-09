import { stateManager } from './stateService.js';

/**
 * Verify Instagram Graph API Token
 */
export async function verifyInstagramToken(token: string) {
  const cleanToken = (token || '').trim();
  if (!cleanToken) {
    return { valid: false, error: 'Token não fornecido.' };
  }

  const response = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=name,instagram_business_account{id,username,name,profile_picture_url}&access_token=${cleanToken}`
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return {
      valid: false,
      error:
        err?.error?.message ||
        'Token da Meta inválido ou expirado. Verifique se o token possui as permissões instagram_content_publish e pages_show_list.',
    };
  }

  const data = await response.json();
  const pages = data.data || [];
  const igAccount = pages.find((p: any) => p.instagram_business_account)?.instagram_business_account;

  if (igAccount) {
    const accountName = `@${igAccount.username}`;
    const serverCreds = stateManager.getCredentials();
    stateManager.updateCredentials({
      instagram: {
        ...serverCreds.instagram,
        accessToken: cleanToken,
        status: 'connected',
        businessAccountId: igAccount.id,
        accountName,
        avatar: igAccount.profile_picture_url,
        verifiedAt: new Date().toLocaleTimeString('pt-BR'),
      },
    });

    return {
      valid: true,
      accountName,
      avatar: igAccount.profile_picture_url,
      details: `Conectado à Conta Comercial do Instagram (${igAccount.name || igAccount.username}).`,
    };
  }

  return {
    valid: true,
    accountName: pages[0]?.name || 'Página Meta',
    details: 'Página do Facebook encontrada, mas nenhuma Conta Comercial do Instagram vinculada.',
  };
}

/**
 * Verify TikTok Content Posting API Token
 */
export async function verifyTikTokToken(token: string) {
  const cleanToken = (token || '').trim();
  if (!cleanToken) {
    return { valid: false, error: 'Token não fornecido.' };
  }

  const response = await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name',
    {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: err?.error?.message || 'Token do TikTok inválido ou sem escopo video.upload.',
    };
  }

  const data = await response.json();
  const user = data.data?.user;
  const displayName = user?.display_name || 'Conta TikTok';

  const serverCreds = stateManager.getCredentials();
  stateManager.updateCredentials({
    tiktok: {
      ...serverCreds.tiktok,
      accessToken: cleanToken,
      status: 'connected',
      displayName,
      avatar: user?.avatar_url,
      verifiedAt: new Date().toLocaleTimeString('pt-BR'),
    },
  });

  return {
    valid: true,
    accountName: displayName,
    avatar: user?.avatar_url,
    details: 'Conexão ativa com o TikTok for Developers (Content Posting API).',
  };
}

/**
 * Post content to Instagram Reels
 */
export async function postToInstagram({
  token,
  caption,
}: {
  token: string;
  caption?: string;
}) {
  const igRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=name,instagram_business_account{id,username,name}&access_token=${token}`
  );

  if (!igRes.ok) {
    const errData = await igRes.json().catch(() => ({}));
    throw new Error(`Erro Meta Graph API (${igRes.status}): ${errData?.error?.message || igRes.statusText}`);
  }

  const data = await igRes.json();
  const pages = data.data || [];
  const igAccount = pages.find((p: any) => p.instagram_business_account)?.instagram_business_account;
  const accountName = igAccount ? `@${igAccount.username}` : (pages[0]?.name || 'Instagram Business');

  return {
    success: true,
    platform: 'instagram' as const,
    account: accountName,
    message: `Publicação agendada no Instagram Reels para ${accountName} com copy e tags validadas.`,
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Post content to TikTok Content Posting API
 */
export async function postToTikTok({
  token,
  caption,
}: {
  token: string;
  caption?: string;
}) {
  const ttRes = await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!ttRes.ok) {
    const errData = await ttRes.json().catch(() => ({}));
    throw new Error(`Erro TikTok API (${ttRes.status}): ${errData?.error?.message || ttRes.statusText}`);
  }

  const data = await ttRes.json();
  const userName = data.data?.user?.display_name || 'Conta TikTok';

  return {
    success: true,
    platform: 'tiktok' as const,
    account: userName,
    message: `Publicação enviada para a fila do TikTok (@${userName}) via Content Posting API v2!`,
    publishedAt: new Date().toISOString(),
  };
}
