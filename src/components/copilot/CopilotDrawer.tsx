import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Loader2, MapPin, Send, Zap } from 'lucide-react';
import type { ChatMessage, FarmerParcel, Role, Selection } from '../../types';
import { QUICK_CHIPS } from '../../lib/copilot/chips';
import { apiPost, loadData } from '../../lib/api/client';
import { buildContext, fallbackAnswer, systemPrompt, type CopilotData, type Fallbacks } from '../../lib/copilot/context';
import MessageText from './MessageText';
import { shortDate } from '../map/TimeSlider';

interface Props {
  mode: Role;
  basinId: string;
  basinName: string;
  selection: Selection;
  selectionLabel: string | null;
  passDate: string | null;
  data: CopilotData;
  farmerParcel: FarmerParcel | null;
}

const CHAT_URL = import.meta.env.VITE_CHAT_API_URL ?? (import.meta.env.DEV ? '/api/chat' : '');

const uid = () => Math.random().toString(36).slice(2);

export default function CopilotDrawer({ mode, basinId, basinName, selection, selectionLabel, passDate, data, farmerParcel }: Props) {
  const [fallbacks, setFallbacks] = useState<Fallbacks | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcome(mode)]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([welcome(mode)]);
  }, [mode]);

  useEffect(() => {
    loadData<Fallbacks>('fallback_copilot.json').then(setFallbacks).catch(() => setFallbacks(null));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text: string, chipId?: string) => {
    if (!text.trim() || sending) return;
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text.trim() };
    const history = [...messages.filter((m) => m.id !== 'welcome'), userMsg];
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);
    const ctx = buildContext(data, { role: mode, basinId, selection, farmerParcel, date: passDate });
    const offline = () =>
      fallbacks ? fallbackAnswer(ctx, fallbacks, chipId) : 'No pude cargar las respuestas del copiloto.';
    try {
      let reply: string | null = null;
      if (CHAT_URL) {
        reply = await apiPost<{ reply: string }>(CHAT_URL, {
          messages: history.map(({ role, content }) => ({ role, content })),
          system: systemPrompt(ctx),
        })
          .then((r) => r.reply)
          .catch(() => null);
      }
      setMessages((m) => [...m, { id: uid(), role: 'assistant', content: reply ?? offline(), source: reply ? 'gemini' : 'fallback' }]);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const chips = QUICK_CHIPS[mode];

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[#efeae2]">
      <div className="flex items-center gap-3 bg-brand-700 px-4 py-3 text-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <Bot size={20} />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-semibold">ChAgro Copilot</div>
          <div className="flex items-center gap-1 truncate text-[11px] text-brand-100">
            <MapPin size={11} />
            {selectionLabel ? `Analizando: ${selectionLabel}` : `Cuenca: ${basinName}`}
            {passDate && ` · pase ${shortDate(passDate)}`}
          </div>
        </div>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase">
          {mode === 'farmer' ? 'Agricultor' : 'Comunidad'}
        </span>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-snug shadow-sm ${
                m.role === 'user' ? 'rounded-tr-none bg-[#d9fdd3]' : 'rounded-tl-none bg-white'
              }`}
            >
              <MessageText text={m.content} />
              {m.source === 'fallback' && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                  <Zap size={10} /> respuesta automática con los datos del mapa
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg rounded-tl-none bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
              <Loader2 size={14} className="animate-spin" /> Analizando datos…
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-black/5 bg-[#f0f2f5] px-3 pb-3 pt-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.id}
              className="chip bg-white"
              disabled={sending || (c.needsFarmerParcel && !farmerParcel)}
              onClick={() => void send(c.prompt, c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            className="input rounded-full"
            placeholder="Escribe tu pregunta…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            aria-label="Mensaje para el copiloto"
          />
          <button type="submit" className="btn-primary h-10 w-10 shrink-0 rounded-full p-0" disabled={sending || !input.trim()} aria-label="Enviar">
            <Send size={16} />
          </button>
        </form>
      </div>
    </aside>
  );
}

function welcome(mode: Role): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content:
      mode === 'farmer'
        ? '¡Hola! Soy tu copiloto de riego. Selecciona una parcela en el mapa o usa un botón rápido para ver **cuánta agua necesita tu cultivo** y cuánto puedes ahorrar.'
        : '¡Hola! Te ayudo a entender el agua de tu cuenca con datos de radar de la NASA. Toca una zona del mapa, mueve el slider de fechas o usa un botón rápido.',
  };
}
