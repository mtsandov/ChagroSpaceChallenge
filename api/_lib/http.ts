import type { IncomingMessage, ServerResponse } from 'node:http';

/** Firma mínima compatible con Vercel Node functions y con dev-api-plugin. */
export type ApiRequest = IncomingMessage & { query: Record<string, string | string[]>; body?: any };
export type ApiResponse = ServerResponse & {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
};

export const queryParam = (req: ApiRequest, key: string): string | undefined => {
  const v = req.query?.[key];
  return Array.isArray(v) ? v[0] : v;
};

export function methodNotAllowed(res: ApiResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: `Method not allowed. Use ${allowed.join(', ')}` });
}
