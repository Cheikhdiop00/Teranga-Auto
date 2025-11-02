import type { Request } from 'express';
import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuid } from 'uuid';

const router = Router();
const uploadsDir = path.join(process.cwd(), 'uploads');
const DATA_URI_REGEX = /^data:(?<mime>[^;]+);base64,(?<data>.+)$/;
const MAX_GENERIC_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_AUDIO_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB audio cap
const AUDIO_MIME_WHITELIST = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
]);

async function ensureUploadsDir() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Unable to create uploads dir:', err);
    throw err;
  }
}

async function readJsonBody(req: Request) {
  const bodyChunks: Uint8Array[] = [];
  return new Promise<any>((resolve, reject) => {
    req.on('data', (chunk) => bodyChunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      try {
        const rawBody = Buffer.concat(bodyChunks).toString();
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function resolveRequestBody(req: Request) {
  const parsed = (req as Request & { body?: unknown }).body;
  if (parsed && typeof parsed === 'object' && Object.keys(parsed as Record<string, unknown>).length > 0) {
    return parsed as Record<string, unknown>;
  }
  return readJsonBody(req);
}

function buildPublicUrl(req: Request, fileName: string) {
  const envBaseUrlRaw = process.env.API_PUBLIC_URL || process.env.API_URL || '';
  const sanitizedEnvUrl = envBaseUrlRaw
    .replace(/\s+/g, '')
    .replace(/\/$/, '')
    .replace(/\/api$/i, '');
  const normalizedEnvUrl = sanitizedEnvUrl && !/localhost/i.test(sanitizedEnvUrl)
    ? sanitizedEnvUrl
    : '';
  const requestBase = `${req.protocol}://${req.get('host')}`
    .replace(/\/$/, '')
    .replace(/\/api$/i, '');
  const baseUrl = normalizedEnvUrl || requestBase || 'http://localhost:3000';
  return `${baseUrl}/uploads/${fileName}`;
}

async function handleBase64Upload(
  req: Request,
  opts: {
    allowedMimeTypes?: Set<string>;
    maxBytes?: number;
    defaultExtension?: string;
  } = {}
) {
  const data = await resolveRequestBody(req);

  const base64 = data?.base64;
  if (typeof base64 !== 'string') {
    return { error: { status: 400, message: 'base64 is required' } };
  }

  const matches = DATA_URI_REGEX.exec(base64);
  if (!matches?.groups?.data || !matches?.groups?.mime) {
    return { error: { status: 400, message: 'Invalid base64 string' } };
  }

  const mime = matches.groups.mime.toLowerCase();
  if (opts.allowedMimeTypes && !opts.allowedMimeTypes.has(mime)) {
    return { error: { status: 415, message: 'Unsupported media type' } };
  }

  const fileBuffer = Buffer.from(matches.groups.data, 'base64');
  if (opts.maxBytes && fileBuffer.byteLength > opts.maxBytes) {
    return { error: { status: 413, message: 'File too large' } };
  }

  const extension = mime.split('/')?.[1] || opts.defaultExtension || 'bin';
  const fileName = `${uuid()}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, fileBuffer);

  return {
    fileName,
    mime,
    size: fileBuffer.byteLength,
    data,
  };
}

router.post('/api/upload', async (req, res) => {
  try {
    await ensureUploadsDir();
    const result = await handleBase64Upload(req, {
      maxBytes: MAX_GENERIC_UPLOAD_BYTES,
    });

    if ('error' in result) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    const publicUrl = buildPublicUrl(req, result.fileName);
    res.json({ url: publicUrl, mime: result.mime, size: result.size });
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

router.post('/api/upload/audio', async (req, res) => {
  try {
    await ensureUploadsDir();
    const result = await handleBase64Upload(req, {
      allowedMimeTypes: AUDIO_MIME_WHITELIST,
      maxBytes: MAX_AUDIO_UPLOAD_BYTES,
      defaultExtension: 'm4a',
    });

    if ('error' in result) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    const durationMs = Number(result.data?.audioDurationMs);
    const coercedDuration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : undefined;

    const publicUrl = buildPublicUrl(req, result.fileName);
    res.json({
      url: publicUrl,
      mime: result.mime,
      size: result.size,
      audioDurationMs: coercedDuration,
    });
  } catch (error) {
    console.error('Audio upload failed:', error);
    res.status(500).json({ message: 'Upload audio failed' });
  }
});

export default router;
