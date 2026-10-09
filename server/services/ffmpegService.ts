import path from 'path';
import fs from 'fs';
import { exec, execFile } from 'child_process';
import util from 'util';
import ffmpegStatic from 'ffmpeg-static';
import { TEMP_DIR, getSystemFont } from '../config.js';
import { parseTimeToSeconds } from './geminiService.js';

const execPromise = util.promisify(exec);
const execFilePromise = util.promisify(execFile);

/**
 * Get executable path for FFmpeg (preferring bundled ffmpeg-static)
 */
export function getFfmpegPath(): string {
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  return 'ffmpeg';
}

/**
 * Get executable path for yt-dlp
 */
export function getYtdlpPath(): string {
  const userYtdlp = path.join(
    process.env.APPDATA || '',
    'Python',
    'Python314',
    'Scripts',
    'yt-dlp.exe'
  );
  if (fs.existsSync(userYtdlp)) {
    return userYtdlp;
  }
  return 'yt-dlp';
}

/**
 * Escapes a string to be safely written into a temporary text file or filter for FFmpeg
 */
function sanitizeTextContent(text: string, maxLength: number = 70): string {
  return (text || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/["'\\]/g, '')
    .trim()
    .slice(0, maxLength);
}

function formatSecondsToMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return `${m.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
}

/**
 * Builds high-quality FFmpeg filter complexes based on viral clipping platform standards (Opus Clip / Klap)
 */
export function buildLayoutFilter(format: string = 'split_screen'): string {
  switch (format) {
    case 'split_screen':
      // Dual-camera stacked layout: Top = Guest (right side), Bottom = Host (left side) with subtle divider
      return `[0:v]crop=trunc(ih*9/16/2)*2:ih:trunc(iw*0.52/2)*2:0,scale=1080:960:flags=lanczos[top];[0:v]crop=trunc(ih*9/16/2)*2:ih:trunc(iw*0.08/2)*2:0,scale=1080:960:flags=lanczos[bottom];[top][bottom]vstack=inputs=2,drawbox=x=0:y=956:w=1080:h=8:color=white@0.5:t=fill,setsar=1[v]`;

    case 'speaker_left':
      // Focused on host / left seated person in podcasts
      return `[0:v]crop=trunc(ih*9/16/2)*2:ih:trunc(iw*0.08/2)*2:0,scale=1080:1920:flags=lanczos,setsar=1[v]`;

    case 'speaker_right':
      // Focused on guest / right seated person in podcasts
      return `[0:v]crop=trunc(ih*9/16/2)*2:ih:trunc(iw*0.52/2)*2:0,scale=1080:1920:flags=lanczos,setsar=1[v]`;

    case 'speaker_center':
    case 'vertical_crop':
      // Centered 9:16 crop for solo speakers or monologues
      return `[0:v]crop=trunc(ih*9/16/2)*2:ih:(in_w-out_w)/2:0,scale=1080:1920:flags=lanczos,setsar=1[v]`;

    case 'square':
      // 1:1 Social Feed
      return `[0:v]crop=min(iw\\,ih):min(iw\\,ih),scale=1080:1080:flags=lanczos,setsar=1[v]`;

    case 'original':
      // 16:9 Widescreen with sharp Lanczos scaling
      return `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v]`;

    case 'vertical_blur':
    default:
      // Cinematic blur fit: 16:9 in center, dark blurred background top and bottom
      return `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,drawbox=x=0:y=0:w=1080:h=1920:color=black@0.4:t=fill[bg];[0:v]scale=1080:-2:flags=lanczos[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]`;
  }
}

/**
 * Downloads a precise slice directly from a YouTube video in pristine 1080p Full HD
 */
export async function downloadYouTubeSlice({
  videoUrl,
  startTime,
  endTime,
}: {
  videoUrl: string;
  startTime: string;
  endTime: string;
}): Promise<string> {
  const randomSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const outBase = path.join(TEMP_DIR, `yt_raw_${randomSuffix}.mp4`);
  const ffmpegPath = getFfmpegPath();
  const ffmpegDir = path.dirname(ffmpegPath);
  const ytdlpBinary = getYtdlpPath();
  const nodePath = process.execPath;

  console.log(`[YouTube Downloader] Baixando trecho em alta definição 1080p (${startTime} -> ${endTime}) de ${videoUrl}`);

  const args = [
    '--no-playlist',
    '--no-check-certificates',
    '--user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    '--extractor-args',
    'youtube:player_client=android,web',
    '--js-runtimes',
    `node:${nodePath}`,
    '--ffmpeg-location',
    ffmpegDir,
    // Explicitly demand 1080p / highest available video and audio streams
    '-f',
    'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
    '--download-sections',
    `*${startTime}-${endTime}`,
    videoUrl,
    '-o',
    outBase,
  ];

  await execFilePromise(ytdlpBinary, args, { timeout: 150000 });

  if (fs.existsSync(outBase)) {
    return outBase;
  }

  // Look for any generated file with this prefix in TEMP_DIR
  const prefix = `yt_raw_${randomSuffix}`;
  const files = fs.readdirSync(TEMP_DIR).filter((f) => f.startsWith(prefix));
  if (files.length > 0) {
    const fullPath = path.join(TEMP_DIR, files[0]);
    if (fs.statSync(fullPath).size > 1000) {
      return fullPath;
    }
  }

  throw new Error('Falha ao baixar o trecho do vídeo com yt-dlp em alta qualidade. Verifique a URL do vídeo.');
}

/**
 * Downloads a YouTube video slice AND renders it to a vertical 9:16 Short with title overlay
 */
export async function downloadAndProcessYouTubeCut({
  videoUrl,
  startTime,
  endTime,
  format = 'split_screen',
  overlayTitle = '',
  hook = '',
}: {
  videoUrl: string;
  startTime: string;
  endTime: string;
  format?: string;
  overlayTitle?: string;
  hook?: string;
}): Promise<string> {
  let rawSlicePath: string | null = null;
  try {
    rawSlicePath = await downloadYouTubeSlice({ videoUrl, startTime, endTime });

    const startSec = parseTimeToSeconds(startTime || '00:00');
    const endSec = parseTimeToSeconds(endTime || '00:30');
    const duration = Math.max(1, endSec - startSec);

    const renderedPath = await renderRealCutVideo({
      inputFilePath: rawSlicePath,
      startTime: '00:00',
      endTime: formatSecondsToMMSS(duration),
      format,
      overlayTitle,
      hook,
    });

    return renderedPath;
  } finally {
    if (rawSlicePath && fs.existsSync(rawSlicePath)) {
      try {
        fs.unlinkSync(rawSlicePath);
      } catch {}
    }
  }
}

/**
 * Renders a video cut to vertical 9:16 Short format using FFmpeg with visually lossless settings
 */
export async function renderRealCutVideo({
  inputFilePath,
  startTime,
  endTime,
  format = 'split_screen',
  overlayTitle = '',
  hook = '',
}: {
  inputFilePath: string;
  startTime: string;
  endTime: string;
  format?: string;
  overlayTitle?: string;
  hook?: string;
}): Promise<string> {
  const startSec = parseTimeToSeconds(startTime || '00:00');
  const endSec = parseTimeToSeconds(endTime || '00:30');
  const duration = Math.max(1, endSec - startSec);

  const randomSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const outPath = path.join(TEMP_DIR, `cut_${randomSuffix}.mp4`);
  const fontPath = getSystemFont();
  const ffmpegCmd = getFfmpegPath();

  let filterComplex = buildLayoutFilter(format);

  // Hormozi / Submagic style headline hook and subtitles overlay
  if (overlayTitle) {
    const safeTitle = sanitizeTextContent(overlayTitle, 55).replace(/[':\\]/g, ' ').replace(/\s+/g, ' ').trim();
    let fontArg = '';
    if (fontPath) {
      const escapedFont = fontPath.replace(/\\/g, '/').replace(':', '\\\\:');
      fontArg = `fontfile='${escapedFont}':`;
    }

    // Top Headline Box (Safe zone: y=200 to y=380, high contrast black background + yellow text)
    filterComplex += `;[v]drawbox=x=50:y=210:w=980:h=180:color=black@0.85:t=fill,drawbox=x=50:y=210:w=980:h=180:color=yellow@0.8:t=4,drawtext=${fontArg}text='${safeTitle}':fontcolor=yellow:fontsize=48:borderw=3:bordercolor=black:x=(w-text_w)/2:y=270[vout]`;

    // Visually lossless high-bitrate encoding: CRF 18, 6.5 Mbps video, 192 kbps studio audio
    const cmd = `"${ffmpegCmd}" -y -ss ${startSec} -t ${duration} -i "${inputFilePath}" -filter_complex "${filterComplex}" -map "[vout]" -map 0:a? -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -b:v 6500k -maxrate 9000k -bufsize 14000k -c:a aac -b:a 192k -movflags +faststart "${outPath}"`;
    await execPromise(cmd, { timeout: 150000 });
  } else {
    const cmd = `"${ffmpegCmd}" -y -ss ${startSec} -t ${duration} -i "${inputFilePath}" -filter_complex "${filterComplex}" -map "[v]" -map 0:a? -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -b:v 6500k -maxrate 9000k -bufsize 14000k -c:a aac -b:a 192k -movflags +faststart "${outPath}"`;
    await execPromise(cmd, { timeout: 150000 });
  }

  if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
    throw new Error('O arquivo de vídeo renderizado não foi gerado pelo FFmpeg.');
  }

  return outPath;
}

/**
 * Generates an FFmpeg command for export or local user execution with Opus Clip / Klap layouts
 */
export function generateFfmpegCommand({
  videoUrl,
  startTime,
  endTime,
  format = 'split_screen',
  title,
}: {
  videoUrl: string;
  startTime: string;
  endTime: string;
  format?: string;
  title?: string;
}) {
  const startSec = parseTimeToSeconds(startTime || '00:00');
  const endSec = parseTimeToSeconds(endTime || '00:45');
  const duration = Math.max(1, endSec - startSec);

  const layoutFilter = buildLayoutFilter(format);
  const safeTitle = (title || 'corte_viral').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const outputFile = `${safeTitle}_${startSec}s-${endSec}s_1080p.mp4`;

  const isWindows = process.platform === 'win32';
  const rmCmd = isWindows ? 'del raw.mp4' : 'rm raw.mp4';

  const fullCommand = `yt-dlp -f "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best" --download-sections "*${startTime}-${endTime}" "${videoUrl}" -o "raw.mp4" && ffmpeg -i "raw.mp4" -filter_complex "${layoutFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -b:v 6500k -c:a aac -b:a 192k -movflags +faststart "${outputFile}" && ${rmCmd}`;

  return {
    command: fullCommand,
    outputFile,
    startSec,
    endSec,
    duration,
  };
}
