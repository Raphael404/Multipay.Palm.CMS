/**
 * API client.
 *
 * All feature hooks call `api.get/post/patch/delete` with real REST paths
 * (e.g. GET /merchants?page=1&status=active). While the backend does not
 * exist, `VITE_USE_MOCK` (default: true) routes every call to the local
 * mock resolver which serves the JSON files in src/mocks/data/.
 *
 * To switch to the real backend:
 *   1. Set VITE_USE_MOCK=false in .env
 *   2. Set VITE_API_BASE_URL=https://your-backend/api
 * Nothing else changes — UI code is unaware of the data source.
 */

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

export type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined | null
>;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(API_BASE_URL + path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, v);
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function realRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  opts: { params?: QueryParams; body?: unknown } = {},
): Promise<T> {
  const token = localStorage.getItem('palmpay.token');
  const res = await fetch(buildUrl(path, opts.params), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    throw new ApiError(res.status, `${method} ${path} failed (${res.status})`, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  opts: { params?: QueryParams; body?: unknown } = {},
): Promise<T> {
  if (USE_MOCK) {
    const { mockRequest } = await import('@/mocks/resolver');
    return mockRequest<T>(method, path, opts);
  }
  return realRequest<T>(method, path, opts);
}

export const api = {
  get: <T>(path: string, params?: QueryParams) => request<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown, params?: QueryParams) =>
    request<T>('POST', path, { body, params }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
