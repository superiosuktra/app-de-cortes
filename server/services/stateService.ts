import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import { STATE_FILE, GEMINI_API_KEY } from '../config.js';

// Derive 32-byte AES-256-GCM key for encrypting OAuth tokens at rest
const VAULT_SECRET =
  process.env.APP_ENCRYPTION_KEY ||
  GEMINI_API_KEY ||
  `${os.hostname()}_${os.userInfo().username}_cortes_vault_v1`;
const AES_KEY = crypto.scryptSync(VAULT_SECRET, 'cortes_viral_salt_v1', 32);
const ENC_PREFIX = 'enc:v1:';

function encryptSecret(plainText?: string): string {
  if (!plainText || typeof plainText !== 'string') return '';
  if (plainText.startsWith(ENC_PREFIX)) return plainText;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${ENC_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch {
    return plainText;
  }
}

function decryptSecret(cipherText?: string): string {
  if (!cipherText || typeof cipherText !== 'string') return '';
  if (!cipherText.startsWith(ENC_PREFIX)) return cipherText;
  try {
    const payload = cipherText.slice(ENC_PREFIX.length);
    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex) return '';
    const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

function decryptCredentialsObject(creds: any): PersistedCredentials {
  const yt = { ...DEFAULT_STATE.credentials.youtube, ...(creds?.youtube || {}) };
  const ig = { ...DEFAULT_STATE.credentials.instagram, ...(creds?.instagram || {}) };
  const tt = { ...DEFAULT_STATE.credentials.tiktok, ...(creds?.tiktok || {}) };

  yt.accessToken = decryptSecret(yt.accessToken);
  yt.refreshToken = decryptSecret(yt.refreshToken);
  yt.clientSecret = decryptSecret(yt.clientSecret);

  ig.accessToken = decryptSecret(ig.accessToken);
  ig.appSecret = decryptSecret(ig.appSecret);

  tt.accessToken = decryptSecret(tt.accessToken);
  tt.clientSecret = decryptSecret(tt.clientSecret);

  return { youtube: yt, instagram: ig, tiktok: tt };
}

function encryptCredentialsObject(creds: PersistedCredentials): PersistedCredentials {
  return {
    youtube: {
      ...creds.youtube,
      accessToken: encryptSecret(creds.youtube.accessToken),
      refreshToken: encryptSecret(creds.youtube.refreshToken),
      clientSecret: encryptSecret(creds.youtube.clientSecret),
    },
    instagram: {
      ...creds.instagram,
      accessToken: encryptSecret(creds.instagram.accessToken),
      appSecret: encryptSecret(creds.instagram.appSecret),
    },
    tiktok: {
      ...creds.tiktok,
      accessToken: encryptSecret(creds.tiktok.accessToken),
      clientSecret: encryptSecret(creds.tiktok.clientSecret),
    },
  };
}

export interface PersistedCredentials {
  youtube: {
    accessToken: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    status: 'connected' | 'disconnected' | 'error';
    channelTitle?: string;
    displayName?: string;
    accountName?: string;
    customUrl?: string;
    avatar?: string;
    verifiedAt?: string;
  };
  instagram: {
    accessToken: string;
    businessAccountId?: string;
    appId?: string;
    appSecret?: string;
    status: 'connected' | 'disconnected' | 'error';
    accountName?: string;
    avatar?: string;
    verifiedAt?: string;
  };
  tiktok: {
    accessToken: string;
    clientKey?: string;
    clientSecret?: string;
    status: 'connected' | 'disconnected' | 'error';
    displayName?: string;
    avatar?: string;
    verifiedAt?: string;
  };
}

export interface PersistedState {
  credentials: PersistedCredentials;
  savedCuts: any[];
  queue: any[];
  autoPostSettings: any;
  lastUpdated: string;
}

const DEFAULT_STATE: PersistedState = {
  credentials: {
    youtube: {
      accessToken: '',
      refreshToken: '',
      clientId: '',
      clientSecret: '',
      status: 'disconnected',
      channelTitle: '',
      avatar: '',
      verifiedAt: '',
    },
    instagram: {
      accessToken: '',
      businessAccountId: '',
      appId: '',
      appSecret: '',
      status: 'disconnected',
      accountName: '',
      avatar: '',
      verifiedAt: '',
    },
    tiktok: {
      accessToken: '',
      clientKey: '',
      clientSecret: '',
      status: 'disconnected',
      displayName: '',
      avatar: '',
      verifiedAt: '',
    },
  },
  savedCuts: [],
  queue: [],
  autoPostSettings: null,
  lastUpdated: new Date().toISOString(),
};

class StateManager {
  private state: PersistedState;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): PersistedState {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const content = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        return {
          credentials: decryptCredentialsObject(parsed.credentials),
          savedCuts: Array.isArray(parsed.savedCuts) ? parsed.savedCuts : [],
          queue: Array.isArray(parsed.queue) ? parsed.queue : [],
          autoPostSettings: parsed.autoPostSettings || null,
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('[StateService] Falha ao carregar estado persistente, utilizando valores padrão:', err);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  public getState(): PersistedState {
    return this.state;
  }

  public getCredentials(): PersistedCredentials {
    return this.state.credentials;
  }

  public updateCredentials(creds: Partial<PersistedCredentials>): void {
    if (creds.youtube) {
      this.state.credentials.youtube = { ...this.state.credentials.youtube, ...creds.youtube };
    }
    if (creds.instagram) {
      this.state.credentials.instagram = { ...this.state.credentials.instagram, ...creds.instagram };
    }
    if (creds.tiktok) {
      this.state.credentials.tiktok = { ...this.state.credentials.tiktok, ...creds.tiktok };
    }
    this.scheduleSave();
  }

  public clearCredentials(platform?: 'youtube' | 'instagram' | 'tiktok'): void {
    if (platform && this.state.credentials[platform]) {
      this.state.credentials[platform] = { ...DEFAULT_STATE.credentials[platform] } as any;
    } else {
      this.state.credentials = JSON.parse(JSON.stringify(DEFAULT_STATE.credentials));
    }
    this.scheduleSave();
  }

  public updateFullState(partial: Partial<PersistedState>): void {
    if (Array.isArray(partial.savedCuts)) {
      this.state.savedCuts = partial.savedCuts;
    }
    if (Array.isArray(partial.queue)) {
      this.state.queue = partial.queue;
    }
    if (partial.autoPostSettings !== undefined) {
      this.state.autoPostSettings = partial.autoPostSettings;
    }
    if (partial.credentials) {
      this.updateCredentials(partial.credentials);
    }
    this.scheduleSave();
  }

  private scheduleSave(): void {
    this.state.lastUpdated = new Date().toISOString();
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToDisk();
    }, 300);
  }

  public saveToDisk(): void {
    try {
      const stateToPersist: PersistedState = {
        ...this.state,
        credentials: encryptCredentialsObject(this.state.credentials),
      };
      const tempPath = `${STATE_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(stateToPersist, null, 2), 'utf-8');
      fs.renameSync(tempPath, STATE_FILE);
    } catch (err) {
      console.error('[StateService] Erro ao gravar arquivo de estado no disco:', err);
    }
  }
}

export const stateManager = new StateManager();
