import type { IncomingMessage } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import type { Role } from '../../src/types';

export interface RequestUser {
  id: string | null;
  role: Role;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Determina el rol de quien llama A PARTIR DEL TOKEN, nunca del body.
 * - Con Supabase configurado: valida el JWT y lee `profiles.role`.
 * - En modo demo (sin Supabase): acepta el token simulado `demo-farmer:<id>`.
 * Sin token válido → rol público.
 */
export async function resolveUser(req: IncomingMessage): Promise<RequestUser> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return { id: null, role: 'public' };

  if (SUPABASE_URL && SERVICE_KEY) {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return { id: null, role: 'public' };
    const { data: profile } = await admin.from('profiles').select('role').eq('id', data.user.id).single();
    return { id: data.user.id, role: profile?.role === 'farmer' ? 'farmer' : 'public' };
  }

  if (token.startsWith('demo-farmer:')) {
    return { id: token.slice('demo-farmer:'.length), role: 'farmer' };
  }
  return { id: null, role: 'public' };
}
