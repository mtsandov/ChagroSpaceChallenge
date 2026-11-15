import Anthropic from '@anthropic-ai/sdk';
import { resolveUser } from './_lib/auth';
import { buildContext, fallbackAnswer, systemPrompt } from './_lib/copilot';
import { methodNotAllowed, type ApiRequest, type ApiResponse } from './_lib/http';
import type { Selection } from '../src/types';

const CLAUDE_TIMEOUT_MS = 20_000;

interface ChatBody {
  messages?: { role: 'user' | 'assistant'; content: string }[];
  basin_id?: string;
  selection?: Selection;
  farmer_parcel_id?: string;
  chip_id?: string;
}

/**
 * POST /api/chat
 * Arma el contexto según el rol (del token), llama a Claude y, si no hay key
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

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const reply = await callClaude(systemPrompt(ctx), messages);
      if (reply) return res.status(200).json({ reply, source: 'claude', role: user.role });
    } catch (err) {
      console.warn('[chat] Claude falló, usando fallback:', (err as Error).message);
    }
  }

  const reply = await fallbackAnswer(ctx, body.chip_id);
  res.status(200).json({ reply, source: 'fallback', role: user.role });
}

async function callClaude(system: string, messages: { role: 'user' | 'assistant'; content: string }[]) {
  const client = new Anthropic({ timeout: CLAUDE_TIMEOUT_MS, maxRetries: 1 });
  const history: Anthropic.Beta.BetaMessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));
  while (history.length > 0 && history[0].role !== 'user') history.shift();

  const response = await client.beta.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system,
    messages: history,
  });
  if (response.stop_reason === 'refusal') return '';
  return response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}
