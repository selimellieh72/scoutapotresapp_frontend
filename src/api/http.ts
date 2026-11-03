import { z } from 'zod';

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string,
    readonly fields?: Record<string, string>, readonly ambiguous = false) { super(message); }
}
export type RequestOptions = { method?: string; body?: unknown; token?: string; signal?: AbortSignal; timeout?: number };
export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
export const cancelled = () => new ApiError(401, 'SESSION_CHANGED', 'Your session changed. Please sign in again.');

export class HttpClient {
  readonly base: string;
  readonly origin: string;
  constructor(base: string, private readonly fetcher: Fetcher = (input, init) => globalThis.fetch(input, init)) {
    const url = new URL(base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid API URL.');
    this.base = url.toString().replace(/\/$/, ''); this.origin = url.origin;
  }
  mediaUrl(path: string) {
    const url = new URL(path, this.origin);
    if (url.origin !== this.origin || !url.pathname.startsWith('/api/v1/media/')) throw new Error('Untrusted media URL.');
    return url.toString();
  }
  async request(path: string, options: RequestOptions = {}): Promise<unknown> {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) throw new Error('Invalid API path.');
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(abort, options.timeout ?? 20_000);
    const method = options.method ?? 'GET';
    const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    try {
      const response = await this.fetcher(`${this.base}${path}`, { method, headers, signal: controller.signal,
        body: options.body === undefined ? undefined : isForm ? options.body as FormData : JSON.stringify(options.body) });
      if (response.status === 204) return undefined;
      const json = await response.json().catch(() => undefined);
      if (!response.ok) {
        const parsed = z.object({ error: z.object({ code: z.string(), message: z.string(), fields: z.record(z.string(), z.string()).optional() }) }).safeParse(json);
        throw new ApiError(response.status, parsed.success ? parsed.data.error.code : 'REQUEST_FAILED',
          parsed.success ? parsed.data.error.message : 'We could not complete this request.', parsed.success ? parsed.data.error.fields : undefined);
      }
      if (json === undefined) throw new ApiError(502, 'INVALID_RESPONSE', 'We could not confirm the server response.', undefined, method !== 'GET');
      return json;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (options.signal?.aborted) throw error;
      throw new ApiError(0, 'NETWORK_ERROR', 'Connection interrupted. Please check your connection.', undefined, method !== 'GET');
    } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
  }
}

export function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError(502, 'INVALID_RESPONSE', 'We could not read the server response.');
  return result.data;
}
export function userMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Please sign in again to continue.';
    if (error.status === 429) return 'Too many requests. Please wait a little and try again.';
    if (error.status >= 500) return 'This is temporarily unavailable. Please try again.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
