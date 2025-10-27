import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const history: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(req.body?.history)
      ? req.body.history
      : [];
    const message: string | undefined = req.body?.message;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message utilisateur requis' });
    }

    const sanitizedHistory = history
      .filter((item) => item && typeof item.content === 'string' && (item.role === 'user' || item.role === 'assistant'))
      .slice(-8);

    const fallbackReply =
      "Je suis votre assistant Teranga Auto. Décrivez votre panne ou posez une question sur nos services, et un agent humain reprendra la conversation si besoin.";

    const imageDataUrl = typeof req.body?.image === 'string' ? req.body.image : null;
    type GeminiPart = { text: string } | { inlineData: { data: string; mimeType: string } };

    let userImagePart: Extract<GeminiPart, { inlineData: { data: string; mimeType: string } }> | null = null;

    if (imageDataUrl) {
      const match = imageDataUrl.match(/^data:(?<mime>[^;]+);base64,(?<data>[A-Za-z0-9+/=]+)$/);
      if (match?.groups?.mime && match.groups.data) {
        userImagePart = {
          inlineData: {
            mimeType: match.groups.mime,
            data: match.groups.data,
          },
        };
      }
    }

    const geminiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!geminiKey) {
      return res.json({ reply: fallbackReply, provider: 'fallback' });
    }

    try {
      const geminiClient = new GoogleGenerativeAI(geminiKey);
      const configuredModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      const modelId = configuredModel.startsWith('models/') ? configuredModel : `models/${configuredModel}`;
      const systemInstruction =
        process.env.GEMINI_SYSTEM_PROMPT ||
        "Tu es l’assistant intelligent de l’application Teranga Auto. Tu échanges uniquement avec les clients de la plateforme. Aide-les à comprendre les problèmes de leur voiture, donne des conseils simples d’entretien et oriente-les vers un mécanicien disponible si nécessaire. Réponds de façon courte, claire et bienveillante, avec des mots simples et des exemples concrets. Si la panne semble sérieuse, suggère de contacter un mécanicien via Teranga Auto.";
      const model = geminiClient.getGenerativeModel({ model: modelId, systemInstruction });

      const conversation: Array<{ role: 'model' | 'user'; parts: GeminiPart[] }> = sanitizedHistory.map((entry) => ({
        role: entry.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: entry.content }],
      }));
      const userParts: GeminiPart[] = [{ text: message }];
      if (userImagePart) {
        userParts.push(userImagePart);
      }
      conversation.push({ role: 'user', parts: userParts });

      const generationConfig = {
        maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 512),
        temperature: Number(process.env.GEMINI_TEMPERATURE || 0.7),
        topP: Number(process.env.GEMINI_TOP_P || 0.9),
        topK: Number(process.env.GEMINI_TOP_K || 40),
      };

      const result = await model.generateContent({
        contents: conversation,
        generationConfig,
      });

      const reply = typeof result?.response?.text === 'function' ? result.response.text() : undefined;

      if (reply && reply.trim().length > 0) {
        return res.json({ reply, provider: 'gemini', model: modelId });
      }

      return res.json({ reply: fallbackReply, provider: 'gemini-empty' });
    } catch (error) {
      console.error('Gemini error:', (error as Error).message);
      return res.json({ reply: fallbackReply, provider: 'fallback-error' });
    }
  }),
);

export default router;
