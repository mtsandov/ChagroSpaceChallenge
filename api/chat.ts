import { resolveUser } from './_lib/auth';
import { buildContext, fallbackAnswer, systemPrompt } from './_lib/copilot';
import { methodNotAllowed, type ApiRequest, type ApiResponse } from './_lib/http';
import type { Selection } from '../src/types';

const GEMINI_TIMEOUT_MS = 20_000;

interface ChatBody {
  messages?: { role: 'user' | 'assistant'; content: string }[];
  basin_id?: string;
  selection?: Selection;
  farmer_parcel_id?: string;
  chip_id?: string;
}

/**
 * POST /api/chat
 * Arma el contexto según el rol (del token), llama a Gemini y, si no hay key
 * o falla o tarda demasiado, responde con fallback_copilot.json.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const body = (req.body ?? {}) as ChatBody;
  const messages = (body.messages ?? []).slice(-10).filter((m) => typeof m.content === 'string' && m.content.trim());
  if (messages.length === 0) return res.status(400).json({ error: 'messages es requerido' });

  const user = await resolveUser(req);
  const ctx = await buildContext({
    role: user.role,
    userId: user.id,
    basinId: body.basin_id ?? 'daule',
    selection: body.selection ?? null,
    farmerParcelId: body.farmer_parcel_id,
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const reply = await callGemini(apiKey, systemPrompt(ctx), messages);
      if (reply) return res.status(200).json({ reply, source: 'gemini', role: user.role });
    } catch (err) {
      console.warn('[chat] Gemini falló, usando fallback:', (err as Error).message);
    }
  }

  const reply = await fallbackAnswer(ctx, body.chip_id);
  res.status(200).json({ reply, source: 'fallback', role: user.role });
}

async function callGemini(apiKey: string, system: string, messages: { role: string; content: string }[]) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
      }),
    });
    if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
    const json = (await r.json()) as any;
    return (json.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('').trim();
  } finally {
    clearTimeout(timer);
  }
}
