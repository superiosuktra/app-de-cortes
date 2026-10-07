export type VideoFormat = 'vertical_crop' | 'vertical_blur' | 'original' | 'square';

export interface VideoInfo {
  videoId: string;
  videoUrl: string;
  title: string;
  author: string;
  thumbnail: string;
  fallbackThumbnail?: string;
}

export interface ViralCut {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  viralityScore: number;
  hook: string;
  payoff: string;
  neuromarketingTrigger: string;
  viralityAnalysis: string;
  recommendedFormat: VideoFormat;
  caption: {
    youtube: string;
    instagram: string;
    tiktok: string;
  };
  hashtags: string[];
  overlaySubtitlesSample?: string[];
}

export interface TrendingVideo {
  title: string;
  channel: string;
  videoId: string;
  url: string;
  duration?: string;
  viralityScore: number;
  reason: string;
  suggestedThemes?: string[];
}

export interface SavedCut {
  id: string;
  videoTitle: string;
  videoUrl: string;
  cutTitle: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  format: VideoFormat;
  viralityScore: number;
  caption: string;
  hashtags: string[];
  createdAt: string;
}

export interface PlatformCredentials {
  youtube: {
    accessToken: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    channelTitle?: string;
    customUrl?: string;
    avatar?: string;
    verifiedAt?: string;
    status: 'connected' | 'disconnected' | 'error';
  };
  instagram: {
    accessToken: string;
    businessAccountId?: string;
    appId?: string;
    appSecret?: string;
    accountName?: string;
    avatar?: string;
    verifiedAt?: string;
    status: 'connected' | 'disconnected' | 'error';
  };
  tiktok: {
    accessToken: string;
    clientKey?: string;
    clientSecret?: string;
    displayName?: string;
    avatar?: string;
    verifiedAt?: string;
    status: 'connected' | 'disconnected' | 'error';
  };
}

export type QueueItemStatus = 'pending' | 'posting' | 'published' | 'failed' | 'paused';
export type SocialPlatform = 'youtube' | 'instagram' | 'tiktok';

export interface QueueItem {
  id: string;
  cutId: string;
  videoTitle: string;
  videoUrl: string;
  cutTitle: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  format: VideoFormat;
  viralityScore: number;
  hook: string;
  payoff?: string;
  caption: {
    youtube: string;
    instagram: string;
    tiktok: string;
  };
  hashtags: string[];
  platforms: SocialPlatform[];
  scheduledFor: string; // ISO date string or formatted
  status: QueueItemStatus;
  publishedAt?: string;
  publishedAccounts?: { platform: SocialPlatform; account: string }[];
  error?: string;
  logs?: string[];
  createdAt: string;
}

export interface AutoPostSettings {
  autoEnqueueOnGenerate: boolean; // Automate queueing upon video generation
  isActive: boolean; // Running / Paused
  intervalMinutes: number; // Interval between consecutive posts (e.g., 30)
  targetPlatforms: {
    youtube: boolean;
    instagram: boolean;
    tiktok: boolean;
  };
  defaultPrivacy: 'public' | 'unlisted' | 'private';
}

