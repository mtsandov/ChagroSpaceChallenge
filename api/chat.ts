import { methodNotAllowed, type ApiRequest, type ApiResponse } from './_lib/http';

const GEMINI_TIMEOUT_MS = 20_000;

interface ChatBody {
  messages?: { role: 'user' | 'assistant'; content: string }[];
  system?: string;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const body = (req.body ?? {}) as ChatBody;
  const messages = (body.messages ?? []).slice(-10).filter((m) => typeof m.content === 'string' && m.content.trim());
  const system = typeof body.system === 'string' ? body.system.slice(0, 20_000) : '';
  if (messages.length === 0 || !system) return res.status(400).json({ error: 'messages y system son requeridos' });

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const reply = await callGroq(groqKey, system, messages);
      if (reply) return res.status(200).json({ reply });
    } catch (err) {
      console.warn('[chat] Groq falló:', (err as Error).message);
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const reply = await callGemini(apiKey, system, messages);
      if (reply) return res.status(200).json({ reply });
    } catch (err) {
      console.warn('[chat] Gemini falló:', (err as Error).message);
    }
  }

  res.status(503).json({ error: 'IA no disponible' });
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

async function callGroq(apiKey: string, system: string, messages: { role: string; content: string }[]) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        temperature: 0.3,
        max_tokens: 800,
        messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
      }),
    });
    if (!r.ok) throw new Error(`Groq HTTP ${r.status}`);
    const json = (await r.json()) as any;
    return String(json.choices?.[0]?.message?.content ?? '').trim();
  } finally {
    clearTimeout(timer);
  }
}
