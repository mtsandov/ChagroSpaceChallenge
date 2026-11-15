export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((json as { error?: string }).error ?? `Error ${r.status}`);
  return json as T;
}

export async function loadData<T>(file: string): Promise<T> {
  const r = await fetch(assetUrl(`data/${file}`));
  if (!r.ok) throw new Error(`No se pudo cargar ${file}`);
  return (await r.json()) as T;
}
