const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(init.json);
  }
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    let payload: unknown = await res.text();
    try {
      payload = JSON.parse(payload as string);
    } catch {}
    throw new ApiError(res.status, payload);
  }
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(
      typeof payload === 'object' && payload && 'error' in payload
        ? ((payload as { error: { message?: string } }).error.message ?? `API error ${status}`)
        : `API error ${status}`,
    );
  }
}
