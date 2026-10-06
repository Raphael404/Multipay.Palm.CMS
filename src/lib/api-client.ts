/**
 * Admin API client. Every path is relative to VITE_API_BASE_URL
 * (default `/api/v1/admin`), e.g. `api.get('/merchants', { page: 1 })`.
 * Sends the session token as `Authorization: Bearer`, and on 401 clears the
 * session and returns to the login page.
 */

export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1/admin'
).replace(/\/$/, '');

export const TOKEN_KEY = 'palmpay.token';

/** Page size used by every paginated table. */
export const DEFAULT_PAGE_SIZE = 20;

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/** Standard paginated list returned by the backend. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** RFC 7807 problem details returned on errors. */
interface ProblemDetails {
  title?: string | null;
  detail?: string | null;
  status?: number | null;
  errors?: Record<string, string[]>;
}

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

/** Human-readable message for any thrown error (prefers the backend's ProblemDetails). */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ApiError) {
    const body = err.body as ProblemDetails | undefined;
    const validation = body?.errors ? Object.values(body.errors).flat()[0] : undefined;
    // The backend puts the human message in `title`; `detail` is often a generic
    // "Exception of type '…' was thrown".
    const detail = body?.detail?.startsWith('Exception of type') ? undefined : body?.detail;
    return validation || body?.title || detail || fallback;
  }
  return fallback;
}

let unauthorizedHandler: (() => void) | undefined;
/** Registers the 401 handler; returns an unsubscribe function. */
export function onUnauthorized(handler: () => void): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = undefined;
  };
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(API_BASE_URL + path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function send(
  method: Method,
  path: string,
  opts: { params?: QueryParams; body?: unknown } = {},
): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(buildUrl(path, opts.params), {
    method,
    headers: {
      Accept: 'application/json',
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
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
    if (res.status === 401 && token) unauthorizedHandler?.();
    throw new ApiError(res.status, `${method} ${path} failed (${res.status})`, body);
  }
  return res;
}

async function request<T>(
  method: Method,
  path: string,
  opts: { params?: QueryParams; body?: unknown } = {},
): Promise<T> {
  const res = await send(method, path, opts);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Fetches a file response and triggers a browser download. */
async function download(
  method: Method,
  path: string,
  opts: { params?: QueryParams; body?: unknown; fallbackName: string },
): Promise<void> {
  const res = await send(method, path, opts);
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match =
    /filename\*=UTF-8''([^;]+)/i.exec(disposition) ?? /filename="?([^";]+)"?/i.exec(disposition);
  const fileName = match ? decodeURIComponent(match[1]) : opts.fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string, params?: QueryParams) => request<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, { body }),
  download: (
    method: 'GET' | 'POST',
    path: string,
    opts: { body?: unknown; params?: QueryParams; fallbackName: string },
  ) => download(method, path, opts),
};

