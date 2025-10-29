import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

const router = Router();

type GeminiPart = { text: string } | { inlineData: { data: string; mimeType: string } };

const FALLBACK_REPLY =
  "Je suis votre assistant Teranga Auto. Décrivez votre panne ou posez une question sur nos services, et un agent humain reprendra la conversation si besoin.";

const resolveGeminiKey = () =>
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;

const resolveModelId = () => {
  const configuredModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  return configuredModel.startsWith('models/') ? configuredModel : `models/${configuredModel}`;
};

const buildGenerationConfig = () => ({
  maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 768),
  temperature: Number(process.env.GEMINI_TEMPERATURE || 0.7),
  topP: Number(process.env.GEMINI_TOP_P || 0.9),
  topK: Number(process.env.GEMINI_TOP_K || 40),
});

const createModel = (systemInstruction?: string): { model: GenerativeModel; modelId: string } | null => {
  const key = resolveGeminiKey();
  if (!key) {
    return null;
  }

  const client = new GoogleGenerativeAI(key);
  const modelId = resolveModelId();
  const model = client.getGenerativeModel({ model: modelId, systemInstruction });

  return { model, modelId };
};

const extractText = (result: unknown): string | undefined => {
  const response = (result as { response?: { text?: () => string } | undefined })?.response;
  if (response && typeof response.text === 'function') {
    return response.text();
  }
  return undefined;
};

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

    const imageDataUrl = typeof req.body?.image === 'string' ? req.body.image : null;

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

    const configuredModel = createModel(
      process.env.GEMINI_SYSTEM_PROMPT ||
        "Tu es l’assistant intelligent de l’application Teranga Auto. Tu échanges uniquement avec les clients de la plateforme. Aide-les à comprendre les problèmes de leur voiture, donne des conseils simples d’entretien et oriente-les vers un mécanicien disponible si nécessaire. Réponds de façon courte, claire et bienveillante, avec des mots simples et des exemples concrets. Si la panne semble sérieuse, suggère de contacter un mécanicien via Teranga Auto.",
    );

    if (!configuredModel) {
      return res.json({ reply: FALLBACK_REPLY, provider: 'fallback' });
    }

    const conversation: Array<{ role: 'model' | 'user'; parts: GeminiPart[] }> = sanitizedHistory.map((entry) => ({
      role: entry.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: entry.content }],
    }));
    const userParts: GeminiPart[] = [{ text: message }];
    if (userImagePart) {
      userParts.push(userImagePart);
    }
    conversation.push({ role: 'user', parts: userParts });

    try {
      const result = await configuredModel.model.generateContent({
        contents: conversation,
        generationConfig: buildGenerationConfig(),
      });

      const reply = extractText(result)?.trim();

      if (reply) {
        return res.json({ reply, provider: 'gemini', model: configuredModel.modelId });
      }

      return res.json({ reply: FALLBACK_REPLY, provider: 'gemini-empty' });
    } catch (error) {
      console.error('Gemini chat error:', (error as Error).message);
      return res.json({ reply: FALLBACK_REPLY, provider: 'fallback-error' });
    }
  }),
);

router.post(
  '/diagnostic',
  asyncHandler(async (req, res) => {
    const description: unknown = req.body?.description;
    const context: unknown = req.body?.context;

    if (typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ message: 'Description de la panne requise' });
    }

    const configuredModel = createModel(
      "Tu es un chef d’atelier automobile certifié. Analyse les descriptions de pannes fournies et propose un diagnostic probable. Donne toujours : 1) un diagnostic principal, 2) trois causes possibles, 3) trois étapes de vérification simples que le client ou un mécanicien peut effectuer, et 4) un conseil de sécurité si nécessaire.",
    );

    if (!configuredModel) {
      return res.status(503).json({ message: 'Assistant IA indisponible (clé manquante)', provider: 'fallback' });
    }

    const prompt = [`Description fournie : ${description.trim()}`];
    if (typeof context === 'string' && context.trim().length > 0) {
      prompt.push(`Contexte supplémentaire : ${context.trim()}`);
    }
    prompt.push('Présente la réponse avec des titres clairs et des listes à puces.');

    try {
      const result = await configuredModel.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt.join('\n\n') }],
          },
        ],
        generationConfig: buildGenerationConfig(),
      });

      const analysis = extractText(result)?.trim() ?? null;
      return res.json({ analysis, model: configuredModel.modelId, provider: 'gemini' });
    } catch (error) {
      console.error('Gemini diagnostic error:', (error as Error).message);
      return res.status(502).json({ message: 'Echec du diagnostic IA' });
    }
  }),
);

router.post(
  '/text-generator',
  asyncHandler(async (req, res) => {
    const topic: unknown = req.body?.topic;
    const tone: unknown = req.body?.tone;

    if (typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({ message: 'Sujet ou consigne requis' });
    }

    const configuredModel = createModel(
      "Tu rédiges des messages pour un garage Teranga Auto. Le ton doit rester professionnel, clair et utile. Fournis un texte final prêt à être envoyé, sans engager de promesses impossibles.",
    );

    if (!configuredModel) {
      return res.status(503).json({ message: 'Assistant IA indisponible (clé manquante)', provider: 'fallback' });
    }

    const prompt = [`Sujet ou consigne : ${topic.trim()}`];
    if (typeof tone === 'string' && tone.trim().length > 0) {
      prompt.push(`Ton souhaité : ${tone.trim()}`);
    }
    prompt.push('Réponds avec un texte final, structuré en paragraphes courts.');

    try {
      const result = await configuredModel.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt.join('\n\n') }],
          },
        ],
        generationConfig: buildGenerationConfig(),
      });

      const content = extractText(result)?.trim() ?? null;
      return res.json({ content, model: configuredModel.modelId, provider: 'gemini' });
    } catch (error) {
      console.error('Gemini text generation error:', (error as Error).message);
      return res.status(502).json({ message: 'Echec de la génération de texte' });
    }
  }),
);

router.post(
  '/image-analysis',
  asyncHandler(async (req, res) => {
    const image: unknown = req.body?.image;
    const context: unknown = req.body?.context;

    if (typeof image !== 'string' || !image.startsWith('data:')) {
      return res.status(400).json({ message: 'Image encodée en base64 requise' });
    }

    const match = image.match(/^data:(?<mime>[^;]+);base64,(?<data>[A-Za-z0-9+/=]+)$/);
    if (!match?.groups?.mime || !match.groups.data) {
      return res.status(400).json({ message: 'Format d’image invalide' });
    }

    const configuredModel = createModel(
      "Tu es un expert carrosserie et mécanique. Analyse la photo fournie et décris les dégâts visibles. Propose ensuite deux pistes de réparation avec une estimation de complexité et rappelle si une inspection humaine est nécessaire.",
    );

    if (!configuredModel) {
      return res.status(503).json({ message: 'Assistant IA indisponible (clé manquante)', provider: 'fallback' });
    }

    const userParts: GeminiPart[] = [];
    if (typeof context === 'string' && context.trim().length > 0) {
      userParts.push({ text: `Contexte : ${context.trim()}` });
    }
    userParts.push({ text: 'Analyse la photo et décris : 1) Observation, 2) Hypothèses de dégâts, 3) Étapes recommandées.' });
    userParts.push({
      inlineData: {
        mimeType: match.groups.mime,
        data: match.groups.data,
      },
    });

    try {
      const result = await configuredModel.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: userParts,
          },
        ],
        generationConfig: buildGenerationConfig(),
      });

      const analysis = extractText(result)?.trim() ?? null;
      return res.json({ analysis, model: configuredModel.modelId, provider: 'gemini' });
    } catch (error) {
      console.error('Gemini image analysis error:', (error as Error).message);
      return res.status(502).json({ message: 'Echec de l’analyse d’image' });
    }
  }),
);

router.post(
  '/translate',
  asyncHandler(async (req, res) => {
    const text: unknown = req.body?.text;
    const targetLanguage: unknown = req.body?.targetLanguage;

    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ message: 'Texte à traduire requis' });
    }

    const language = typeof targetLanguage === 'string' && targetLanguage.trim().length > 0 ? targetLanguage.trim() : 'anglais';

    const configuredModel = createModel(
      "Tu es traducteur automobile. Traduits le texte fourni dans la langue demandée en conservant le vocabulaire technique et le sens des instructions. Retourne uniquement la traduction finale.",
    );

    if (!configuredModel) {
      return res.status(503).json({ message: 'Assistant IA indisponible (clé manquante)', provider: 'fallback' });
    }

    const prompt = `Langue cible : ${language}\n\nTexte à traduire :\n${text.trim()}`;

    try {
      const result = await configuredModel.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: buildGenerationConfig(),
      });

      const translation = extractText(result)?.trim() ?? null;
      return res.json({ translation, model: configuredModel.modelId, provider: 'gemini' });
    } catch (error) {
      console.error('Gemini translation error:', (error as Error).message);
      return res.status(502).json({ message: 'Echec de la traduction' });
    }
  }),
);

export default router;
