import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import { STATE_FILE, GEMINI_API_KEY } from '../config.js';
import db from '../db.js';

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
  const gm = { ...(creds?.gemini || {}) };

  yt.accessToken = decryptSecret(yt.accessToken);
  yt.refreshToken = decryptSecret(yt.refreshToken);
  yt.clientSecret = decryptSecret(yt.clientSecret);

  ig.accessToken = decryptSecret(ig.accessToken);
  ig.appSecret = decryptSecret(ig.appSecret);

  tt.accessToken = decryptSecret(tt.accessToken);
  tt.clientSecret = decryptSecret(tt.clientSecret);

  if (gm.apiKey) {
    gm.apiKey = decryptSecret(gm.apiKey);
  }

  return { youtube: yt, instagram: ig, tiktok: tt, gemini: gm };
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
    gemini: creds.gemini
      ? {
          ...creds.gemini,
          apiKey: encryptSecret(creds.gemini.apiKey),
        }
      : undefined,
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
  gemini?: {
    apiKey?: string;
    status?: 'connected' | 'disconnected' | 'error';
    model?: string;
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
    gemini: {
      apiKey: '',
      status: 'disconnected',
      model: 'gemini-3.8-flash',
      verifiedAt: '',
    },
  },
  savedCuts: [],
  queue: [],
  autoPostSettings: null,
  lastUpdated: new Date().toISOString(),
};

class StateManager {
  private userStates = new Map<string, PersistedState>();
  private saveTimeouts = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.getState('default');
  }

  private loadUserState(userId: string): PersistedState {
    // 1. Try SQLite user_states first
    try {
      const row = db.prepare('SELECT * FROM user_states WHERE user_id = ?').get(userId) as any;
      if (row) {
        const creds = row.credentials_json
          ? decryptCredentialsObject(JSON.parse(row.credentials_json))
          : JSON.parse(JSON.stringify(DEFAULT_STATE.credentials));
        const savedCuts = row.saved_cuts_json ? JSON.parse(row.saved_cuts_json) : [];
        const queue = row.queue_json ? JSON.parse(row.queue_json) : [];
        const autoPostSettings = row.settings_json ? JSON.parse(row.settings_json) : null;
        return {
          credentials: creds,
          savedCuts,
          queue,
          autoPostSettings,
          lastUpdated: row.updated_at || new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn(`[StateService] Aviso ao carregar SQLite para usuário ${userId}:`, e);
    }

    // 2. If 'default' user, fall back to STATE_FILE
    if (userId === 'default') {
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
        console.warn('[StateService] Falha ao carregar estado do arquivo JSON:', err);
      }
    }

    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  public getState(userId: string = 'default'): PersistedState {
    const key = userId || 'default';
    if (!this.userStates.has(key)) {
      const state = this.loadUserState(key);
      this.userStates.set(key, state);
    }
    return this.userStates.get(key)!;
  }

  public getCredentials(userId: string = 'default'): PersistedCredentials {
    return this.getState(userId).credentials;
  }

  public updateCredentials(creds: Partial<PersistedCredentials>, userId: string = 'default'): void {
    const key = userId || 'default';
    const state = this.getState(key);
    if (creds.youtube) {
      state.credentials.youtube = { ...state.credentials.youtube, ...creds.youtube };
    }
    if (creds.instagram) {
      state.credentials.instagram = { ...state.credentials.instagram, ...creds.instagram };
    }
    if (creds.tiktok) {
      state.credentials.tiktok = { ...state.credentials.tiktok, ...creds.tiktok };
    }
    if (creds.gemini) {
      state.credentials.gemini = { ...(state.credentials.gemini || DEFAULT_STATE.credentials.gemini), ...creds.gemini };
    }
    this.scheduleSave(key);
  }

  public clearCredentials(platform?: 'youtube' | 'instagram' | 'tiktok' | 'gemini', userId: string = 'default'): void {
    const key = userId || 'default';
    const state = this.getState(key);
    if (platform && state.credentials[platform]) {
      state.credentials[platform] = { ...DEFAULT_STATE.credentials[platform] } as any;
    } else {
      state.credentials = JSON.parse(JSON.stringify(DEFAULT_STATE.credentials));
    }
    this.scheduleSave(key);
  }

  public updateFullState(partial: Partial<PersistedState>, userId: string = 'default'): void {
    const key = userId || 'default';
    const state = this.getState(key);
    if (Array.isArray(partial.savedCuts)) {
      state.savedCuts = partial.savedCuts;
    }
    if (Array.isArray(partial.queue)) {
      state.queue = partial.queue;
    }
    if (partial.autoPostSettings !== undefined) {
      state.autoPostSettings = partial.autoPostSettings;
    }
    if (partial.credentials) {
      this.updateCredentials(partial.credentials, key);
    }
    this.scheduleSave(key);
  }

  private scheduleSave(userId: string = 'default'): void {
    const key = userId || 'default';
    const state = this.getState(key);
    state.lastUpdated = new Date().toISOString();

    const existingTimeout = this.saveTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      this.saveToDisk(key);
      this.saveTimeouts.delete(key);
    }, 300);

    this.saveTimeouts.set(key, timeout);
  }

  public saveToDisk(userId: string = 'default'): void {
    const key = userId || 'default';
    const state = this.getState(key);
    const encryptedCreds = encryptCredentialsObject(state.credentials);

    // 1. Save to SQLite user_states
    try {
      db.prepare(`
        INSERT INTO user_states (user_id, credentials_json, saved_cuts_json, queue_json, settings_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          credentials_json = excluded.credentials_json,
          saved_cuts_json = excluded.saved_cuts_json,
          queue_json = excluded.queue_json,
          settings_json = excluded.settings_json,
          updated_at = excluded.updated_at
      `).run(
        key,
        JSON.stringify(encryptedCreds),
        JSON.stringify(state.savedCuts),
        JSON.stringify(state.queue),
        JSON.stringify(state.autoPostSettings),
        state.lastUpdated
      );
    } catch (err) {
      console.error(`[StateService] Erro ao gravar estado do usuário ${key} no SQLite:`, err);
    }

    // 2. If 'default', also write to STATE_FILE for backwards compatibility
    if (key === 'default') {
      try {
        const stateToPersist: PersistedState = {
          ...state,
          credentials: encryptedCreds,
        };
        const tempPath = `${STATE_FILE}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(stateToPersist, null, 2), 'utf-8');
        fs.renameSync(tempPath, STATE_FILE);
      } catch (err) {
        console.error('[StateService] Erro ao gravar arquivo de estado no disco:', err);
      }
    }
  }
}

export const stateManager = new StateManager();
