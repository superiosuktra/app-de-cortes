import fs from 'fs';
import path from 'path';
import { STATE_FILE } from '../config.js';

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
          credentials: {
            youtube: { ...DEFAULT_STATE.credentials.youtube, ...(parsed.credentials?.youtube || {}) },
            instagram: { ...DEFAULT_STATE.credentials.instagram, ...(parsed.credentials?.instagram || {}) },
            tiktok: { ...DEFAULT_STATE.credentials.tiktok, ...(parsed.credentials?.tiktok || {}) },
          },
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
      const tempPath = `${STATE_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tempPath, STATE_FILE);
    } catch (err) {
      console.error('[StateService] Erro ao gravar arquivo de estado no disco:', err);
    }
  }
}

export const stateManager = new StateManager();
