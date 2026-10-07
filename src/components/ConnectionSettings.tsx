import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  Youtube,
  Instagram,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  Lock,
  Sparkles,
  HelpCircle,
  Copy,
} from 'lucide-react';
import { PlatformCredentials } from '../types';
import { TikTokReviewGuideModal } from './TikTokReviewGuideModal';
import { LegalPagesModal } from './LegalPagesModal';
import { fetchJson } from '../utils/api';
import confetti from 'canvas-confetti';
import { PWAInstallButton } from './PWAInstallButton';
import { CloudCheck, Laptop } from 'lucide-react';

interface ConnectionSettingsProps {
  credentials: PlatformCredentials;
  onSaveCredentials: (newCreds: PlatformCredentials) => void;
  onNavigateToTab?: (tab: 'trending' | 'analyze' | 'editor' | 'publish') => void;
}

const DEFAULT_CREDS: PlatformCredentials = {
  youtube: {
    accessToken: '',
    clientId: '',
    clientSecret: '',
    status: 'disconnected',
  },
  instagram: {
    accessToken: '',
    businessAccountId: '',
    appId: '',
    appSecret: '',
    status: 'disconnected',
  },
  tiktok: {
    accessToken: '',
    clientKey: '',
    clientSecret: '',
    status: 'disconnected',
  },
};

export const ConnectionSettings: React.FC<ConnectionSettingsProps> = ({
  credentials,
  onSaveCredentials,
  onNavigateToTab,
}) => {
  const [creds, setCreds] = useState<PlatformCredentials>(credentials || DEFAULT_CREDS);
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({
    youtube: false,
    instagram: false,
    tiktok: false,
  });
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{
    [key: string]: {
      success: boolean;
      message: string;
      details?: any;
      isAuthCode?: boolean;
      hint?: string;
    };
  }>({});
  const [copiedScope, setCopiedScope] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string>('');
  const [isTikTokGuideOpen, setIsTikTokGuideOpen] = useState<boolean>(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms' | 'hosting'>('privacy');

  useEffect(() => {
    if (credentials) {
      setCreds(credentials);
    }
  }, [credentials]);

  const toggleShowToken = (platform: string) => {
    setShowTokens((prev) => ({ ...prev, [platform]: !prev[platform] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScope(id);
    setTimeout(() => setCopiedScope(null), 2000);
  };

  // Test individual platform token
  const handleTestPlatform = async (platform: 'youtube' | 'instagram' | 'tiktok') => {
    const token = creds[platform].accessToken;
    if (!token?.trim()) {
      setTestResults((prev) => ({
        ...prev,
        [platform]: {
          success: false,
          message: 'Insira o Access Token antes de realizar o teste de conexão.',
        },
      }));
      return;
    }

    setTestingPlatform(platform);
    try {
      const res = await fetchJson<any>(`/api/verify-token/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          refreshToken: (creds[platform] as any).refreshToken,
          clientId: (creds[platform] as any).clientId,
          clientSecret: (creds[platform] as any).clientSecret || (creds[platform] as any).appSecret,
        }),
      });

      const data = res.data || {};

      if (res.ok && data.valid) {
        let platformUpdate: any = {
          ...creds[platform],
          status: 'connected' as const,
          avatar: data.avatar || (creds[platform] as any).avatar,
          verifiedAt: new Date().toLocaleTimeString('pt-BR'),
        };

        if (platform === 'youtube') {
          platformUpdate.channelTitle = data.accountName || creds.youtube.channelTitle;
        } else if (platform === 'instagram') {
          platformUpdate.accountName = data.accountName || creds.instagram.accountName;
        } else if (platform === 'tiktok') {
          platformUpdate.displayName = data.accountName || creds.tiktok.displayName;
        }

        const updated = {
          ...creds,
          [platform]: platformUpdate,
        };
        setCreds(updated);
        onSaveCredentials(updated);

        setTestResults((prev) => ({
          ...prev,
          [platform]: {
            success: true,
            message: `Conectado com sucesso: ${data.accountName || 'Conta Ativa'}!`,
            details: data.details,
          },
        }));
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      } else {
        const updated = {
          ...creds,
          [platform]: {
            ...creds[platform],
            status: 'error' as const,
          },
        };
        setCreds(updated);
        onSaveCredentials(updated);

        setTestResults((prev) => ({
          ...prev,
          [platform]: {
            success: false,
            message: data.error || res.error || 'Token inválido ou expirado.',
            isAuthCode: Boolean(data.isAuthCode),
            hint: data.hint,
          },
        }));
      }
    } catch (e: any) {
      setTestResults((prev) => ({
        ...prev,
        [platform]: {
          success: false,
          message: `Erro na requisição: ${e.message}`,
        },
      }));
    } finally {
      setTestingPlatform(null);
    }
  };

  // Test all platforms simultaneously
  const handleTestAll = async () => {
    await Promise.all([
      creds.youtube.accessToken ? handleTestPlatform('youtube') : null,
      creds.instagram.accessToken ? handleTestPlatform('instagram') : null,
      creds.tiktok.accessToken ? handleTestPlatform('tiktok') : null,
    ]);
  };

  // Disconnect/clear platform
  const handleDisconnect = (platform: 'youtube' | 'instagram' | 'tiktok') => {
    const updated = {
      ...creds,
      [platform]: {
        accessToken: '',
        clientId: '',
        clientSecret: '',
        status: 'disconnected' as const,
        channelTitle: '',
        accountName: '',
        displayName: '',
        avatar: '',
        verifiedAt: '',
      },
    };
    setCreds(updated);
    onSaveCredentials(updated);
    setTestResults((prev) => ({
      ...prev,
      [platform]: {
        success: false,
        message: 'Credencial desconectada e limpa.',
      },
    }));
  };

  const handleActivateDemoYouTube = () => {
    const demoToken = 'demo_youtube_shorts_verified_token';
    const updated = {
      ...creds,
      youtube: {
        accessToken: demoToken,
        clientId: 'demo-client-id.apps.googleusercontent.com',
        clientSecret: 'demo-client-secret',
        status: 'connected' as const,
        channelTitle: 'Canal YouTube (Modo Demonstração)',
        accountName: '@canal.demonstracao',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
        verifiedAt: new Date().toLocaleTimeString('pt-BR'),
      },
    };
    setCreds(updated);
    onSaveCredentials(updated);
    setTestResults((prev) => ({
      ...prev,
      youtube: {
        success: true,
        message: 'Modo Demonstração do YouTube ativado com sucesso!',
        details: 'Você já pode testar toda a fila de postagem e os fluxos de Shorts sem configurar chaves no Google Cloud.',
      },
    }));
    setSaveFeedback('✅ Modo Demonstração do YouTube ativado!');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    setTimeout(() => setSaveFeedback(''), 3500);
  };

  const handleSaveAll = () => {
    onSaveCredentials(creds);
    setSaveFeedback('✅ Todas as credenciais foram salvas e sincronizadas com sucesso!');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    setTimeout(() => setSaveFeedback(''), 3500);
  };

  // Export JSON backup
  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(creds, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `viral_shorts_credentials_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.youtube || imported.instagram || imported.tiktok) {
          const merged = { ...creds, ...imported };
          setCreds(merged);
          onSaveCredentials(merged);
          setSaveFeedback('✅ Backup de credenciais restaurado com sucesso!');
          setTimeout(() => setSaveFeedback(''), 3500);
        }
      } catch (err) {
        setSaveFeedback('❌ Arquivo de backup JSON inválido.');
        setTimeout(() => setSaveFeedback(''), 3500);
      }
    };
    reader.readAsText(file);
  };

  const connectedCount = [
    creds.youtube?.status === 'connected',
    creds.instagram?.status === 'connected',
    creds.tiktok?.status === 'connected',
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#141226] via-[#1a142e] to-[#251433] border border-purple-900/40 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-fuchsia-500/10 border border-fuchsia-500/30 text-pink-300 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
              Central de Credenciais & APIs Oficiais
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Configurações de Conexão das Plataformas
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl">
              Insira e gerencie as credenciais OAuth e Access Tokens oficiais do YouTube, Instagram e TikTok. Os tokens são salvos com segurança no seu navegador e sincronizados com o backend para publicações automáticas de Shorts e Reels.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${connectedCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="text-xs font-bold text-white font-mono">
                {connectedCount} de 3 Conectadas
              </span>
            </div>

            <button
              onClick={handleTestAll}
              disabled={!!testingPlatform}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-xs font-bold transition shadow-md shadow-pink-900/30"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingPlatform ? 'animate-spin' : ''}`} />
              <span>Testar Todas</span>
            </button>
          </div>
        </div>
      </div>

      {/* PWA Desktop Install Banner */}
      <PWAInstallButton variant="banner" />

      {/* Auto-Save & Zero-Backup Reassurance Box */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CloudCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              Salvamento Automático Permanente Ativo
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Backup Manual Desnecessário
              </span>
            </h4>
            <p className="text-[11px] text-zinc-300 mt-0.5">
              Todas as suas credenciais, chaves de API, cortes favoritados e fila de postagem são gravados de forma redundante e contínua no navegador e no disco do servidor. Você não precisa se preocupar em salvar cópias de backup manualmente.
            </p>
          </div>
        </div>
      </div>

      {/* Global Actions Bar: Save, Export, Import */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#141520] border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7000ff] to-[#ff0055] text-white text-xs font-extrabold shadow-lg shadow-purple-900/30 hover:scale-[1.01] active:scale-[0.99] transition"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Todas as Configurações</span>
          </button>

          {saveFeedback && (
            <span className="text-xs text-emerald-400 font-semibold animate-fadeIn">
              {saveFeedback}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-white text-xs font-semibold transition"
            title="Exportar arquivo JSON com as credenciais salvas"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Exportar Backup</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-pink-400" />
            <span>Importar Backup</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>
      </div>

      {/* Platform Cards Grid */}
      <div className="space-y-6">

        {/* ============================================================ */}
        {/* 1. YOUTUBE DATA API V3 CARD */}
        {/* ============================================================ */}
        <div className="bg-[#141520] border border-zinc-800 hover:border-red-500/40 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-md">
                <Youtube className="w-6 h-6 fill-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">YouTube Shorts</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                    YouTube Data API v3
                  </span>
                </div>
                <p className="text-xs text-zinc-400">OAuth 2.0 com escopo de upload direto para o canal</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                  creds.youtube.status === 'connected'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                    : creds.youtube.status === 'error'
                    ? 'bg-red-950/60 text-red-300 border border-red-500/40'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {creds.youtube.status === 'connected' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Conectado</span>
                  </>
                ) : creds.youtube.status === 'error' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Token Inválido</span>
                  </>
                ) : (
                  <span>Desconectado</span>
                )}
              </span>

              <button
                onClick={() => handleDisconnect('youtube')}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition"
                title="Limpar Token do YouTube"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Connected Profile Preview if available */}
          {creds.youtube.channelTitle && creds.youtube.status === 'connected' && (
            <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                {creds.youtube.avatar ? (
                  <img src={creds.youtube.avatar} alt="Canal" className="w-10 h-10 rounded-full border border-zinc-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
                    YT
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-white">{creds.youtube.channelTitle}</h4>
                  <p className="text-[11px] text-zinc-400">
                    {creds.youtube.customUrl || 'Canal Autenticado'} • Verificado às {creds.youtube.verifiedAt || 'agora'}
                  </p>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Pronto para Postar
              </span>
            </div>
          )}

          {/* Inputs Row */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>Access Token (Bearer OAuth 2.0)</span>
                <span className="text-[10px] text-pink-400 font-mono">Duração: ~60 min (Temporário)</span>
              </label>
              <div className="relative">
                <input
                  type={showTokens.youtube ? 'text' : 'password'}
                  value={creds.youtube.accessToken}
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    const val = rawVal.trim();
                    let access = rawVal;
                    let refresh = creds.youtube.refreshToken || '';

                    // Check if user pasted a string containing ya29 or 1//
                    const yaMatch = val.match(/(ya29\.[a-zA-Z0-9_\-\.]+)/);
                    const refreshMatch = val.match(/(1\/\/[a-zA-Z0-9_\-]+)/);

                    if (yaMatch) {
                      access = yaMatch[1];
                      if (refreshMatch) {
                        refresh = refreshMatch[1];
                        setSaveFeedback('✨ Access Token (ya29...) e Refresh Token (1//...) extraídos com sucesso!');
                      } else {
                        setSaveFeedback('✨ Access Token do YouTube (ya29...) reconhecido!');
                      }
                    } else if (val.startsWith('1//') || (refreshMatch && !yaMatch)) {
                      refresh = refreshMatch ? refreshMatch[1] : val;
                      access = '';
                      setSaveFeedback('⚠️ Esse código é o Refresh Token (1//...). Guardamos no campo verde abaixo! Para este campo, copie o "Access token" (ya29...) no OAuth Playground.');
                    } else if (val.startsWith('4/') || val.startsWith('4%2F')) {
                      setSaveFeedback('⚠️ Você colou um Código de Autorização temporário (4/0...). No OAuth Playground, clique no botão azul "Exchange authorization code for tokens" no Passo 2!');
                    } else if (val.startsWith('{')) {
                      try {
                        const parsed = JSON.parse(val);
                        if (parsed.access_token) access = parsed.access_token;
                        if (parsed.refresh_token) refresh = parsed.refresh_token;
                        setSaveFeedback('✨ JSON do OAuth Playground reconhecido! Tokens preenchidos com sucesso.');
                      } catch (err) {}
                    }

                    setCreds({
                      ...creds,
                      youtube: { ...creds.youtube, accessToken: access, refreshToken: refresh },
                    });
                  }}
                  placeholder="ya29.a0AfH6SM... (ou cole o JSON do Playground)"
                  className="w-full pl-3.5 pr-20 py-2.5 bg-[#0e0f17] border border-zinc-700/80 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleShowToken('youtube')}
                    className="p-1.5 text-zinc-400 hover:text-white transition"
                    title={showTokens.youtube ? 'Ocultar' : 'Exibir'}
                  >
                    {showTokens.youtube ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestPlatform('youtube')}
                    disabled={testingPlatform === 'youtube'}
                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition flex items-center gap-1"
                  >
                    {testingPlatform === 'youtube' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    <span>Testar</span>
                  </button>
                </div>
              </div>

              {/* Guidance when user has Refresh Token (1//) but missing or invalid ya29 Access Token */}
              {Boolean(
                creds.youtube.refreshToken?.startsWith('1//') &&
                (!creds.youtube.accessToken ||
                  creds.youtube.accessToken.startsWith('1//') ||
                  (!creds.youtube.accessToken.startsWith('ya29') && !creds.youtube.accessToken.startsWith('demo')))
              ) && (
                <div className="p-3.5 bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-purple-950/50 border border-blue-500/50 rounded-xl space-y-2 text-xs text-blue-200 animate-fadeIn">
                  <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Seu Refresh Token permanente (1//...) já está salvo com sucesso!</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Para o YouTube autorizar o envio dos vídeos, falta apenas você copiar o <strong>Access Token (começa com ya29...)</strong>:
                  </p>
                  <div className="p-2.5 bg-black/60 rounded-lg border border-blue-500/20 text-[11px] text-blue-100 space-y-1">
                    <p>1. No seu <strong>Google OAuth Playground (Passo 2)</strong>, localize o campo <strong>"Access token"</strong> (logo acima do Refresh Token).</p>
                    <p>2. Copie o valor (começa com <code className="text-pink-300 font-mono">ya29...</code>) e cole no campo de <strong>Access Token</strong> acima.</p>
                    <p>3. Clique em <strong>Testar</strong> para confirmar a conexão com seu canal!</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="https://developers.google.com/oauthplayground"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] inline-flex items-center gap-1 transition"
                    >
                      Abrir OAuth Playground <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={handleActivateDemoYouTube}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1 transition shadow"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      Ativar Modo Demonstração (Testar Agora)
                    </button>
                  </div>
                </div>
              )}

              {/* Real-time Guidance if user pasted an Authorization Code (4/0...) */}
              {Boolean(
                creds.youtube.accessToken?.trim().startsWith('4/') ||
                creds.youtube.accessToken?.trim().startsWith('4%2F') ||
                creds.youtube.accessToken?.includes('code=')
              ) && (
                <div className="p-3.5 bg-gradient-to-r from-amber-950/60 to-yellow-950/40 border border-amber-500/50 rounded-xl space-y-2 text-xs text-amber-200 animate-fadeIn">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Você colou o Código de Autorização provisório (começa com 4/)</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Esse código é a etapa 1 do Google. Para transformá-lo nas chaves reais, falta <strong>apenas 1 clique</strong> no Google OAuth Playground:
                  </p>
                  <div className="p-2.5 bg-black/60 rounded-lg border border-amber-500/20 text-[11px] text-amber-100 space-y-1">
                    <p>1. Volte na aba do <strong>Google OAuth Playground (Passo 2)</strong>.</p>
                    <p>2. Clique no botão azul: <strong className="text-white underline">[Exchange authorization code for tokens]</strong>.</p>
                    <p>3. O Google preencherá o <strong>Access token (ya29...)</strong> e o <strong>Refresh token (1//...)</strong>. Basta copiar um deles e colar aqui!</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="https://developers.google.com/oauthplayground"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] inline-flex items-center gap-1 transition"
                    >
                      Abrir OAuth Playground <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={handleActivateDemoYouTube}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] inline-flex items-center gap-1 transition shadow"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      Conectar Canal de Teste (1 Clique)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Permanent Refresh Token Input */}
            <div className="space-y-1.5 p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Refresh Token (Permanente - Nunca Expira)
                </span>
                <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                  Solução Definitiva
                </span>
              </label>
              <div className="relative">
                <input
                  type={showTokens.youtube ? 'text' : 'password'}
                  value={creds.youtube.refreshToken || ''}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      youtube: { ...creds.youtube, refreshToken: e.target.value },
                    })
                  }
                  placeholder="1//04..."
                  className="w-full pl-3.5 pr-28 py-2.5 bg-[#0e0f17] border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-400"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!creds.youtube.refreshToken?.trim()) {
                        setSaveFeedback('⚠️ Insira o Refresh Token (1//...) primeiro.');
                        setTimeout(() => setSaveFeedback(''), 4000);
                        return;
                      }

                      // Helpful reminder if user wants auto server renewal
                      if (!creds.youtube.clientSecret?.trim()) {
                        setSaveFeedback(
                          'ℹ️ Dica: Para renovação automática direta via servidor, configure o Client Secret. Ou use o Access Token gerado no OAuth Playground.'
                        );
                        setTimeout(() => setSaveFeedback(''), 5000);
                      }

                      setSaveFeedback('🔄 Renovando token com o Google...');
                      try {
                        const res = await fetchJson<any>('/api/refresh-token/youtube', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            refreshToken: creds.youtube.refreshToken,
                            clientId: creds.youtube.clientId,
                            clientSecret: creds.youtube.clientSecret,
                          }),
                        });
                        if (res.ok && res.data.success) {
                          const updated = {
                            ...creds,
                            youtube: {
                              ...creds.youtube,
                              accessToken: res.data.accessToken,
                              status: 'connected' as const,
                              verifiedAt: res.data.verifiedAt,
                            },
                          };
                          setCreds(updated);
                          onSaveCredentials(updated);
                          setSaveFeedback('✅ Token renovado com sucesso pelo Refresh Token!');
                          confetti({ particleCount: 30, spread: 50 });
                        } else {
                          setSaveFeedback(`❌ ${res.data?.error || 'Erro ao renovar token.'}`);
                          setTimeout(() => setSaveFeedback(''), 6000);
                        }
                      } catch (e) {
                        setSaveFeedback('❌ Falha na renovação do token.');
                        setTimeout(() => setSaveFeedback(''), 4000);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition flex items-center gap-1 shadow"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Renovar Agora</span>
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-zinc-300">
                🔒 <strong>Como não precisar renovar mais:</strong> No Passo 2 do Google OAuth Playground, copie o campo <strong>Refresh token</strong> (começa com <code>1//</code>) e cole aqui. Nosso servidor salva tudo no disco do seu computador e não perde nunca!
              </p>
            </div>

            {/* Clear explanation of "O código expira depois de um tempo" */}
            <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>O Google avisou que o código expira em pouco tempo?</span>
              </div>
              <div className="text-[11px] text-zinc-300 space-y-1.5 leading-relaxed">
                <p>
                  No Google OAuth Playground, o campo <strong>Authorization code</strong> (começa com <code>4/0...</code>) é apenas um código temporário de autorização.
                </p>
                <div className="p-2.5 bg-black/40 rounded-xl border border-purple-500/20 text-xs text-purple-200">
                  👉 <strong>Como obter a chave que NUNCA expira:</strong> No Passo 2 do Playground, clique no botão azul <strong>[Exchange authorization code for tokens]</strong>. O Google exibirá o <strong>Refresh token (1//...)</strong> e o <strong>Access token (ya29...)</strong>. Basta copiar um deles e colar aqui!
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">OAuth Client ID (Google Cloud Console)</label>
                <input
                  type="text"
                  value={creds.youtube.clientId || ''}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      youtube: { ...creds.youtube, clientId: e.target.value },
                    })
                  }
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="w-full px-3 py-2 bg-[#0e0f17] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
                  <span>OAuth Client Secret (Chave Secreta)</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Necessário p/ renovação</span>
                </label>
                <input
                  type="password"
                  value={creds.youtube.clientSecret || ''}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      youtube: { ...creds.youtube, clientSecret: e.target.value },
                    })
                  }
                  placeholder="GOCSPX-..."
                  className="w-full px-3 py-2 bg-[#0e0f17] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* One-Click Demo Mode Banner */}
          <div className="p-4 bg-gradient-to-r from-red-950/40 via-purple-950/30 to-[#161726] border border-red-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-bold text-white">Não quer configurar o Google Cloud agora?</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  1 Clique
                </span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Ative o <strong>Modo Demonstração do YouTube</strong> para testar a geração de cortes, agendamento e fila automática imediatamente sem precisar criar projetos no Google.
              </p>
            </div>
            <button
              type="button"
              onClick={handleActivateDemoYouTube}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white text-xs font-bold transition shadow-lg shadow-red-900/30 active:scale-95 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Conectar Canal de Teste (1 Clique)</span>
            </button>
          </div>

          {/* Quick Guide & Scopes Accordion */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl text-xs text-zinc-400 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-300 border-b border-zinc-800 pb-2">
              <span className="flex items-center gap-1.5 text-white">
                <HelpCircle className="w-4 h-4 text-red-400" />
                Como conectar seu canal real do YouTube (3 Passos):
              </span>
              <a
                href="https://developers.google.com/oauthplayground/#step1&scopes=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.upload"
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-1 font-semibold"
              >
                Abrir Google OAuth Playground <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="text-[11px] space-y-1.5 text-zinc-300">
              <p>
                <strong>Por que o Google exige sua autorização?</strong> Como os vídeos serão publicados no <em>seu</em> canal do YouTube, o Google exige por segurança que o dono da conta aprove o acesso.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-pink-400">Passo 1</span>
                  <p className="text-[11px] text-zinc-400">Clique no link acima do <em>OAuth Playground</em>.</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-pink-400">Passo 2</span>
                  <p className="text-[11px] text-zinc-400">Clique em <em>"Authorize APIs"</em> e entre na sua conta Google.</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-pink-400">Passo 3</span>
                  <p className="text-[11px] text-zinc-400">Clique em <em>"Exchange authorization code"</em> e cole o token aqui!</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-black/80 rounded-xl font-mono text-[11px] text-yellow-300 border border-zinc-800">
              <span>https://www.googleapis.com/auth/youtube.upload</span>
              <button
                onClick={() => handleCopy('https://www.googleapis.com/auth/youtube.upload', 'scope-yt')}
                className="text-zinc-400 hover:text-white p-1"
                title="Copiar Escopo"
              >
                {copiedScope === 'scope-yt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Diagnostic Status Feedback */}
          {testResults.youtube && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResults.youtube.success
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/50 text-red-200'
              }`}
            >
              {testResults.youtube.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <p className="font-bold leading-snug">{testResults.youtube.message}</p>
                {testResults.youtube.details && (
                  <p className="text-[11px] text-zinc-300 mt-0.5">{testResults.youtube.details}</p>
                )}

                {/* Specific Help If User Pasted Authorization Code */}
                {testResults.youtube.isAuthCode && (
                  <div className="mt-2.5 p-3 bg-black/60 rounded-xl border border-red-500/30 space-y-2 text-zinc-200">
                    <div className="font-semibold text-yellow-300 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      Como resolver em 10 segundos:
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-300">
                      <li>Volte na página do <strong>Google OAuth Playground (Passo 2)</strong>.</li>
                      <li>Clique no botão azul destacado: <strong>[ Exchange authorization code for tokens ]</strong>.</li>
                      <li>O Google vai gerar o <strong>Refresh token (1//...)</strong> e o <strong>Access token (ya29...)</strong>.</li>
                      <li>Copie o <strong>ya29...</strong> ou o <strong>1//...</strong> e cole aqui!</li>
                    </ol>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href="https://developers.google.com/oauthplayground"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] inline-flex items-center gap-1 transition"
                      >
                        Abrir OAuth Playground <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={handleActivateDemoYouTube}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] inline-flex items-center gap-1 transition shadow"
                      >
                        <Sparkles className="w-3 h-3 text-yellow-300" />
                        Conectar Canal de Teste (1 Clique)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>


        {/* ============================================================ */}
        {/* 2. INSTAGRAM REELS (META GRAPH API) CARD */}
        {/* ============================================================ */}
        <div className="bg-[#141520] border border-zinc-800 hover:border-pink-500/40 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-pink-600/10 border border-pink-500/30 flex items-center justify-center text-pink-500 shadow-md">
                <Instagram className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">Instagram Reels</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                    Meta Graph API (v19+)
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Instagram Content Publishing API para Contas Comerciais / Criadores</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                  creds.instagram.status === 'connected'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                    : creds.instagram.status === 'error'
                    ? 'bg-red-950/60 text-red-300 border border-red-500/40'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {creds.instagram.status === 'connected' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Conectado</span>
                  </>
                ) : creds.instagram.status === 'error' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Token Inválido</span>
                  </>
                ) : (
                  <span>Desconectado</span>
                )}
              </span>

              <button
                onClick={() => handleDisconnect('instagram')}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition"
                title="Limpar Token do Instagram"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Connected Profile Preview if available */}
          {creds.instagram.accountName && creds.instagram.status === 'connected' && (
            <div className="p-3 bg-pink-950/20 border border-pink-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                {creds.instagram.avatar ? (
                  <img src={creds.instagram.avatar} alt="Instagram" className="w-10 h-10 rounded-full border border-zinc-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 flex items-center justify-center text-white font-bold">
                    IG
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-white">{creds.instagram.accountName}</h4>
                  <p className="text-[11px] text-zinc-400">
                    Conta Comercial Autenticada • Verificado às {creds.instagram.verifiedAt || 'agora'}
                  </p>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Pronto para Reels
              </span>
            </div>
          )}

          {/* Inputs Row */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>Meta User / Page Access Token</span>
                <span className="text-[10px] text-pink-400 font-mono">Permissão instagram_content_publish</span>
              </label>
              <div className="relative">
                <input
                  type={showTokens.instagram ? 'text' : 'password'}
                  value={creds.instagram.accessToken}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      instagram: { ...creds.instagram, accessToken: e.target.value },
                    })
                  }
                  placeholder="EAA..."
                  className="w-full pl-3.5 pr-20 py-2.5 bg-[#0e0f17] border border-zinc-700/80 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleShowToken('instagram')}
                    className="p-1.5 text-zinc-400 hover:text-white transition"
                    title={showTokens.instagram ? 'Ocultar' : 'Exibir'}
                  >
                    {showTokens.instagram ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestPlatform('instagram')}
                    disabled={testingPlatform === 'instagram'}
                    className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-bold transition flex items-center gap-1"
                  >
                    {testingPlatform === 'instagram' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    <span>Testar</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Instagram Business Account ID (Opcional)</label>
                <input
                  type="text"
                  value={creds.instagram.businessAccountId || ''}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      instagram: { ...creds.instagram, businessAccountId: e.target.value },
                    })
                  }
                  placeholder="17841400..."
                  className="w-full px-3 py-2 bg-[#0e0f17] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Meta App ID (Opcional)</label>
                <input
                  type="text"
                  value={creds.instagram.appId || ''}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      instagram: { ...creds.instagram, appId: e.target.value },
                    })
                  }
                  placeholder="Ex: 849302910..."
                  className="w-full px-3 py-2 bg-[#0e0f17] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Guide & Scopes Accordion */}
          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl text-xs text-zinc-400 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-300">
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-pink-400" />
                Como gerar o token no Meta for Developers:
              </span>
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-1"
              >
                Graph API Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-[11px]">
              Vá no <strong>Graph API Explorer</strong> do Meta for Developers, selecione seu App Business e adicione as 3 permissões indispensáveis:
            </p>

            <div className="flex flex-wrap gap-2 p-2 bg-black/80 rounded-xl font-mono text-[11px] text-yellow-300 border border-zinc-800">
              <span className="px-1.5 py-0.5 bg-zinc-900 rounded">instagram_content_publish</span>
              <span className="px-1.5 py-0.5 bg-zinc-900 rounded">instagram_basic</span>
              <span className="px-1.5 py-0.5 bg-zinc-900 rounded">pages_show_list</span>
            </div>
          </div>

          {/* Diagnostic Status Feedback */}
          {testResults.instagram && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResults.instagram.success
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/50 text-red-200'
              }`}
            >
              {testResults.instagram.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{testResults.instagram.message}</p>
                {testResults.instagram.details && <p className="text-[11px] text-zinc-300 mt-0.5">{testResults.instagram.details}</p>}
              </div>
            </div>
          )}
        </div>


        {/* ============================================================ */}
        {/* 3. TIKTOK CONTENT POSTING API CARD */}
        {/* ============================================================ */}
        <div className="bg-[#141520] border border-zinc-800 hover:border-cyan-400/40 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-600/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md font-black text-lg">
                TT
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">TikTok</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                    Content Posting API v2
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Direct Post API para publicação direta no feed do TikTok</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                  creds.tiktok.status === 'connected'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                    : creds.tiktok.status === 'error'
                    ? 'bg-red-950/60 text-red-300 border border-red-500/40'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {creds.tiktok.status === 'connected' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Conectado</span>
                  </>
                ) : creds.tiktok.status === 'error' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Token Inválido</span>
                  </>
                ) : (
                  <span>Desconectado</span>
                )}
              </span>

              <button
                onClick={() => handleDisconnect('tiktok')}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition"
                title="Limpar Token do TikTok"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Connected Profile Preview if available */}
          {creds.tiktok.displayName && creds.tiktok.status === 'connected' && (
            <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                {creds.tiktok.avatar ? (
                  <img src={creds.tiktok.avatar} alt="TikTok" className="w-10 h-10 rounded-full border border-zinc-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold">
                    TT
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-white">{creds.tiktok.displayName}</h4>
                  <p className="text-[11px] text-zinc-400">
                    Conta TikTok Autenticada • Verificado às {creds.tiktok.verifiedAt || 'agora'}
                  </p>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Pronto para TikTok
              </span>
            </div>
          )}

          {/* Inputs Row */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>User Access Token (Bearer Token)</span>
                <span className="text-[10px] text-cyan-400 font-mono">Escopos video.upload & video.publish</span>
              </label>
              <div className="relative">
                <input
                  type={showTokens.tiktok ? 'text' : 'password'}
                  value={creds.tiktok.accessToken}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      tiktok: { ...creds.tiktok, accessToken: e.target.value },
                    })
                  }
                  placeholder="act.example123..."
                  className="w-full pl-3.5 pr-20 py-2.5 bg-[#0e0f17] border border-zinc-700/80 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleShowToken('tiktok')}
                    className="p-1.5 text-zinc-400 hover:text-white transition"
                    title={showTokens.tiktok ? 'Ocultar' : 'Exibir'}
                  >
                    {showTokens.tiktok ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestPlatform('tiktok')}
                    disabled={testingPlatform === 'tiktok'}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition flex items-center gap-1"
                  >
                    {testingPlatform === 'tiktok' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    <span>Testar</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Client Key (Opcional)</label>
                <input
                  type="text"
                  value={creds.tiktok.clientKey || ''}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      tiktok: { ...creds.tiktok, clientKey: e.target.value },
                    })
                  }
                  placeholder="aw..."
                  className="w-full px-3 py-2 bg-[#0e0f17] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Client Secret (Opcional)</label>
                <input
                  type="password"
                  value={creds.tiktok.clientSecret || ''}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      tiktok: { ...creds.tiktok, clientSecret: e.target.value },
                    })
                  }
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#0e0f17] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Guide & Scopes Accordion */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl text-xs text-zinc-400 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-bold text-zinc-300">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                Como registrar e aprovar o app no TikTok for Developers:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTikTokGuideOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 text-white text-[11px] font-bold flex items-center gap-1 shadow-md shadow-cyan-900/30 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>📋 Guia de Revisão: O que Preencher</span>
                </button>
                <a
                  href="https://developers.tiktok.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-1"
                >
                  developers.tiktok.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <p className="text-[11px]">
              No portal do TikTok, adicione a <strong>Content Posting API</strong> e autorize o escopo para publicação direta:
            </p>

            <div className="flex flex-wrap gap-2 p-2 bg-black/80 rounded-xl font-mono text-[11px] text-cyan-300 border border-zinc-800">
              <span className="px-1.5 py-0.5 bg-zinc-900 rounded">video.upload</span>
              <span className="px-1.5 py-0.5 bg-zinc-900 rounded">video.publish</span>
              <span className="px-1.5 py-0.5 bg-zinc-900 rounded">user.info.basic</span>
            </div>
          </div>

          {/* Diagnostic Status Feedback */}
          {testResults.tiktok && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResults.tiktok.success
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/50 text-red-200'
              }`}
            >
              {testResults.tiktok.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{testResults.tiktok.message}</p>
                {testResults.tiktok.details && <p className="text-[11px] text-zinc-300 mt-0.5">{testResults.tiktok.details}</p>}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Footer Navigation Back to Publishing */}
      {onNavigateToTab && (
        <div className="pt-4 flex justify-end">
          <button
            onClick={() => onNavigateToTab('publish')}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#7000ff] to-[#ff0055] text-white text-xs font-bold shadow-lg shadow-purple-900/30 hover:opacity-95 transition"
          >
            <span>Voltar para Central de Publicação</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Modais de Ajuda Legal e Revisão do TikTok */}
      <TikTokReviewGuideModal
        isOpen={isTikTokGuideOpen}
        onClose={() => setIsTikTokGuideOpen(false)}
        onOpenLegalModal={(tab) => {
          setLegalModalTab(tab);
          setIsLegalModalOpen(true);
        }}
      />

      <LegalPagesModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />
    </div>
  );
};
