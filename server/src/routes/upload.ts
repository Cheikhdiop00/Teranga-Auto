import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuid } from 'uuid';

const router = Router();
const uploadsDir = path.join(process.cwd(), 'uploads');

async function ensureUploadsDir() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Unable to create uploads dir:', err);
    throw err;
  }
}

router.post('/api/upload', async (req, res) => {
  try {
    await ensureUploadsDir();
    const bodyChunks: Uint8Array[] = [];

    req.on('data', (chunk) => bodyChunks.push(chunk));

    req.on('end', async () => {
      const rawBody = Buffer.concat(bodyChunks).toString();
      let data: any;
      try {
        data = JSON.parse(rawBody);
      } catch {
        return res.status(400).json({ message: 'Invalid JSON payload' });
      }

      const base64 = data?.base64;
      if (typeof base64 !== 'string') {
        return res.status(400).json({ message: 'base64 is required' });
      }

      const matches = /^data:(?<mime>[^;]+);base64,(?<data>.+)$/.exec(base64);
      if (!matches?.groups?.data) {
        return res.status(400).json({ message: 'Invalid base64 string' });
      }

      const fileBuffer = Buffer.from(matches.groups.data, 'base64');
      const mime = matches.groups.mime;
      const extension = mime?.split('/')?.[1] || 'jpg';
      const fileName = `${uuid()}.${extension}`;
      const filePath = path.join(uploadsDir, fileName);

      await fs.writeFile(filePath, fileBuffer);

      const baseUrl = process.env.API_URL?.replace(/\/$/, '') || 'http://localhost:3000';
      const publicUrl = `${baseUrl}/uploads/${fileName}`;
      res.json({ url: publicUrl });
    });
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

export default router;
