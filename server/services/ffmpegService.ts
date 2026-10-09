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
 * Escapes a string to be safely written into a temporary text file for FFmpeg drawtext
 */
function sanitizeTextContent(text: string, maxLength: number = 80): string {
  return (text || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/["'\\]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Downloads a precise slice directly from a YouTube video
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

  console.log(`[YouTube Downloader] Baixando trecho (${startTime} -> ${endTime}) de ${videoUrl}`);

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
    '--download-sections',
    `*${startTime}-${endTime}`,
    videoUrl,
    '-o',
    outBase,
  ];

  await execFilePromise(ytdlpBinary, args, { timeout: 120000 });

  // yt-dlp may output .mp4, .mp4.webm, or .webm
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

  throw new Error('Falha ao baixar o trecho do vídeo com yt-dlp. Verifique a URL do vídeo.');
}

/**
 * Downloads a YouTube video slice AND renders it to a vertical 9:16 Short with title overlay
 */
export async function downloadAndProcessYouTubeCut({
  videoUrl,
  startTime,
  endTime,
  format = 'vertical_blur',
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

    // The downloaded slice is already timed from 00:00 to duration
    const startSec = parseTimeToSeconds(startTime || '00:00');
    const endSec = parseTimeToSeconds(endTime || '00:30');
    const duration = Math.max(1, endSec - startSec);

    // Now render the slice using local FFmpeg
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

function formatSecondsToMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return `${m.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
}

/**
 * Renders a video cut to vertical 9:16 Short format using FFmpeg
 */
export async function renderRealCutVideo({
  inputFilePath,
  startTime,
  endTime,
  format = 'vertical_blur',
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

  let filterComplex = '';
  if (format === 'vertical_blur') {
    filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]`;
  } else if (format === 'vertical_crop') {
    filterComplex = `[0:v]crop=trunc(ih*9/16/2)*2:ih,scale=1080:1920,setsar=1[v]`;
  } else {
    // Pad original to 9:16
    filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v]`;
  }

  if (overlayTitle) {
    const safeTitle = sanitizeTextContent(overlayTitle, 60).replace(/[':\\]/g, ' ').replace(/\s+/g, ' ').trim();
    let fontArg = '';
    if (fontPath) {
      const escapedFont = fontPath.replace(/\\/g, '/').replace(':', '\\\\:');
      fontArg = `fontfile='${escapedFont}':`;
    }

    filterComplex += `;[v]drawbox=x=60:y=280:w=960:h=220:color=black@0.75:t=fill,drawtext=${fontArg}text='${safeTitle}':fontcolor=yellow:fontsize=46:x=(w-text_w)/2:y=360[vout]`;

    const cmd = `"${ffmpegCmd}" -y -ss ${startSec} -t ${duration} -i "${inputFilePath}" -filter_complex "${filterComplex}" -map "[vout]" -map 0:a? -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${outPath}"`;
    await execPromise(cmd, { timeout: 120000 });
  } else {
    const cmd = `"${ffmpegCmd}" -y -ss ${startSec} -t ${duration} -i "${inputFilePath}" -filter_complex "${filterComplex}" -map "[v]" -map 0:a? -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${outPath}"`;
    await execPromise(cmd, { timeout: 120000 });
  }

  if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
    throw new Error('O arquivo de vídeo renderizado não foi gerado pelo FFmpeg.');
  }

  return outPath;
}

/**
 * Generates an FFmpeg command for export or local user execution
 */
export function generateFfmpegCommand({
  videoUrl,
  startTime,
  endTime,
  format,
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

  let vfOrFilter = '';
  if (format === 'vertical_crop') {
    vfOrFilter = `-vf "crop=trunc(ih*9/16/2)*2:ih,scale=1080:1920,setsar=1"`;
  } else if (format === 'vertical_blur') {
    vfOrFilter = `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]" -map "[v]" -map 0:a?`;
  } else {
    vfOrFilter = `-c:v copy`;
  }

  const safeTitle = (title || 'corte_viral').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const outputFile = `${safeTitle}_${startSec}s-${endSec}s.mp4`;

  const isWindows = process.platform === 'win32';
  const rmCmd = isWindows ? 'del raw.mp4' : 'rm raw.mp4';

  const fullCommand = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --download-sections "*${startTime}-${endTime}" "${videoUrl}" -o "raw.mp4" && ffmpeg -i "raw.mp4" ${vfOrFilter} -c:a aac -b:a 128k -movflags +faststart "${outputFile}" && ${rmCmd}`;

  return {
    command: fullCommand,
    outputFile,
    startSec,
    endSec,
    duration,
  };
}
