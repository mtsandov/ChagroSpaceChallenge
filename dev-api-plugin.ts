import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Sirve las funciones de `/api/*.ts` (formato Vercel) dentro de `npm run dev`,
 * para no necesitar `vercel dev` en local. En producción Vercel las ejecuta
 * directamente como serverless functions.
 */
export function devApiPlugin(): Plugin {
  return {
    name: 'chagro-dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const name = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
        const file = resolve(server.config.root, 'api', `${name}.ts`);
        if (!name || name.startsWith('_') || !existsSync(file)) return next();

        try {
          const body = await readBody(req);
          const mod = await server.ssrLoadModule(file);
          const vreq = Object.assign(req, {
            query: Object.fromEntries(url.searchParams),
            body,
          });
          await mod.default(vreq, wrapResponse(res));
        } catch (err) {
          server.config.logger.error(String((err as Error)?.stack ?? err));
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal error' }));
        }
      });
    },
  };
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function wrapResponse(res: ServerResponse) {
  const r = res as ServerResponse & {
    status: (code: number) => typeof r;
    json: (data: unknown) => void;
  };
  r.status = (code: number) => {
    res.statusCode = code;
    return r;
  };
  r.json = (data: unknown) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(data));
  };
  return r;
}
