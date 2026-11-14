/** fetch a /api con el token de sesión (si hay). */
export async function apiPost<T>(path: string, body: unknown, token: string | null): Promise<T> {
  const r = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((json as { error?: string }).error ?? `Error ${r.status}`);
  return json as T;
}

/** Carga un archivo estático de /public/data. */
export async function loadData<T>(file: string): Promise<T> {
  const r = await fetch(`/data/${file}`);
  if (!r.ok) throw new Error(`No se pudo cargar ${file}`);
  return (await r.json()) as T;
}
