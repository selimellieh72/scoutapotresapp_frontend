import { describe, expect, it, vi } from 'vitest';
import { HttpClient, ApiError, type Fetcher } from '../src/api/http';
import { ApiClient } from '../src/api/client';
import { SessionManager, type SecretStorage } from '../src/auth/session';
import type { SessionBundle } from '../src/api/types';
import { uniquePosts, validateFile, validatePost } from '../src/domain/validation';

const admin = { id: '123456789012345678901234', email: 'test@example.test', username: 'test', displayName: 'Test admin', role: 'admin' as const, status: 'active' as const };
const bundle = (suffix = 'one', expired = false): SessionBundle => ({ accessToken: `access-${suffix}`, refreshToken: `refresh-${suffix}`, admin,
  accessExpiresAt: new Date(Date.now() + (expired ? -1000 : 15 * 60_000)).toISOString(), sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString() });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const unauthorized = () => json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401);
function memory(initial: SessionBundle | null = null) {
  let value: string | null = initial ? JSON.stringify(initial) : null;
  return { get: vi.fn(async () => value), set: vi.fn(async (next: string) => { value = next; }), clear: vi.fn(async () => { value = null; }), value: () => value };
}
const setup = (fetcher: Fetcher, storage = memory()) => {
  const http = new HttpClient('https://api.example.test/api/v1', fetcher);
  const session = new SessionManager(http, storage);
  return { http, session, storage, api: new ApiClient(http, session) };
};
const path = (input: string) => new URL(String(input)).pathname;

describe('HTTP and public content', () => {
  it('calls the browser fetch implementation with its global receiver', async () => {
    vi.stubGlobal('fetch', function(this: unknown) { expect(this).toBe(globalThis); return Promise.resolve(json({ data: [] })); });
    try { await new HttpClient('https://api.example.test/api/v1').request('/posts'); }
    finally { vi.unstubAllGlobals(); }
  });
  it('resolves media URLs once and rejects credential forwarding to other origins', () => {
    const http = new HttpClient('https://api.example.test/api/v1');
    expect(http.mediaUrl('/api/v1/media/a/file')).toBe('https://api.example.test/api/v1/media/a/file');
    expect(() => http.mediaUrl('https://evil.example/api/v1/media/a/file')).toThrow('Untrusted media URL');
    expect(() => new HttpClient('https://user:password@api.example.test')).toThrow();
  });
  it('omits admin credentials from public reads even after login', async () => {
    const fetcher = vi.fn<Fetcher>(async (url, options) => path(url).endsWith('/login') ? json({ data: bundle() }) : json({ data: [], page: { nextCursor: null, hasMore: false } }));
    const { session, api } = setup(fetcher);
    await session.login('test', 'password');
    await api.posts({ category: 'atelier', contentType: 'image' }, 'opaque+cursor');
    const [url, options] = fetcher.mock.calls.at(-1)!;
    expect(String(url)).toContain('category=atelier');
    expect(String(url)).toContain('cursor=opaque%2Bcursor');
    expect(options?.headers).not.toHaveProperty('Authorization');
  });
  it('handles 204 responses and preserves structured validation errors', async () => {
    const fetcher = vi.fn<Fetcher>().mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid field.', fields: { title: 'Too long.' } } }, 400));
    const { http } = setup(fetcher);
    await expect(http.request('/posts/a', { method: 'DELETE' })).resolves.toBeUndefined();
    await expect(http.request('/posts', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 400, fields: { title: 'Too long.' } });
  });
  it('never automatically repeats an ambiguous publication', async () => {
    const fetcher = vi.fn<Fetcher>(async url => { if (path(url).endsWith('/login')) return json({ data: bundle() }); throw new TypeError('Connection lost'); });
    const { session, api } = setup(fetcher);
    await session.login('test', 'password');
    await expect(api.createPost({ category: 'article', title: '', text: 'A story', mediaIds: [] })).rejects.toMatchObject({ ambiguous: true, code: 'NETWORK_ERROR' });
    expect(fetcher.mock.calls.filter(([url]) => path(url).endsWith('/posts'))).toHaveLength(1);
  });
  it('treats an unexpected successful write response as an ambiguous result', async () => {
    const fetcher = vi.fn<Fetcher>(async url => path(url).endsWith('/login') ? json({ data: bundle() }) : json({ unexpected: 'shape' }));
    const { session, api } = setup(fetcher); await session.login('test', 'password');
    await expect(api.createPost({ category: 'article', title: '', text: 'A story', mediaIds: [] })).rejects.toMatchObject({ ambiguous: true, code: 'INVALID_RESPONSE' });
  });
  it('lets the runtime set multipart boundaries', async () => {
    const fetcher = vi.fn<Fetcher>(async () => json({ ok: true }));
    const { http } = setup(fetcher);
    const form = new FormData(); form.append('file', new Blob(['image']), 'photo.png');
    await http.request('/media', { method: 'POST', body: form });
    expect(fetcher.mock.calls[0]![1]?.headers).not.toHaveProperty('Content-Type');
    expect(fetcher.mock.calls[0]![1]?.body).toBe(form);
  });
});

describe('admin session lifecycle', () => {
  it('restores active sessions through /me and stores the complete bundle', async () => {
    const storage = memory(bundle());
    const fetcher = vi.fn<Fetcher>(async () => json({ data: admin }));
    const { session } = setup(fetcher, storage);
    expect(session.snapshot().status).toBe('restoring');
    await session.restore();
    expect(session.snapshot()).toMatchObject({ status: 'admin', admin });
    expect(JSON.parse(storage.value()!)).toHaveProperty('refreshToken', 'refresh-one');
  });
  it('allows guest browsing immediately and clears corrupt stored sessions', async () => {
    const fetcher = vi.fn<Fetcher>(async () => json({}));
    const empty = setup(fetcher); await empty.session.restore(); expect(empty.session.snapshot().status).toBe('guest');
    const bad: SecretStorage = { get: async () => 'not-json', set: async () => {}, clear: vi.fn(async () => {}) };
    const session = new SessionManager(empty.http, bad); await session.restore();
    expect(session.snapshot().status).toBe('guest'); expect(bad.clear).toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('retains unverified credentials when restoration loses its connection', async () => {
    const storage = memory(bundle());
    const { session } = setup(vi.fn<Fetcher>(async () => { throw new TypeError('offline'); }), storage);
    await session.restore(); expect(session.snapshot().status).toBe('unverified'); expect(storage.value()).not.toBeNull();
    await expect(session.authenticated('/posts', { method: 'POST' })).rejects.toBeInstanceOf(ApiError);
  });
  it('shares one refresh for concurrent failures and persists tokens before retrying', async () => {
    const storage = memory(); let refreshes = 0;
    const fetcher = vi.fn<Fetcher>(async (url, options) => {
      if (path(url).endsWith('/login')) return json({ data: bundle() });
      if (path(url).endsWith('/refresh')) { refreshes++; expect(options?.headers).not.toHaveProperty('Authorization'); await new Promise(resolve => setTimeout(resolve, 10)); return json({ data: bundle('two') }); }
      const token = (options?.headers as Record<string, string>).Authorization;
      if (token === 'Bearer access-one') return unauthorized();
      expect(JSON.parse(storage.value()!).refreshToken).toBe('refresh-two'); return json({ data: admin });
    });
    const { session } = setup(fetcher, storage); await session.login('test', 'password');
    await Promise.all([1, 2, 3].map(() => session.authenticated('/me')));
    expect(refreshes).toBe(1); expect(session.snapshot().status).toBe('admin');
  });
  it('refreshes expiring access once before sending parallel protected requests', async () => {
    let refreshes = 0;
    const fetcher = vi.fn<Fetcher>(async url => {
      if (path(url).endsWith('/login')) return json({ data: bundle('one', true) });
      if (path(url).endsWith('/refresh')) { refreshes++; return json({ data: bundle('two') }); }
      return json({ data: admin });
    });
    const { session } = setup(fetcher); await session.login('test', 'password');
    await Promise.all([session.authenticated('/me'), session.authenticated('/me')]); expect(refreshes).toBe(1);
  });
  it('clears revoked sessions instead of looping refresh', async () => {
    let refreshes = 0;
    const fetcher = vi.fn<Fetcher>(async url => {
      if (path(url).endsWith('/login')) return json({ data: bundle() });
      if (path(url).endsWith('/refresh')) refreshes++;
      return unauthorized();
    });
    const { session, storage } = setup(fetcher); await session.login('test', 'password');
    await expect(session.authenticated('/me')).rejects.toMatchObject({ status: 401 });
    expect(refreshes).toBe(1); expect(session.snapshot().status).toBe('guest'); expect(storage.value()).toBeNull();
  });
  it('does not replay a refresh after an ambiguous network response', async () => {
    const fetcher = vi.fn<Fetcher>(async url => {
      if (path(url).endsWith('/login')) return json({ data: bundle('one', true) });
      throw new TypeError('offline');
    });
    const { session } = setup(fetcher); await session.login('test', 'password');
    await expect(session.authenticated('/me')).rejects.toMatchObject({ ambiguous: true });
    expect(fetcher.mock.calls.filter(([url]) => path(url).endsWith('/refresh'))).toHaveLength(1);
    expect(session.snapshot().status).toBe('guest');
  });
  it('ignores login results that arrive after logout', async () => {
    let resolve!: (value: Response) => void;
    const gate = new Promise<Response>(done => { resolve = done; });
    const { session, storage } = setup(vi.fn<Fetcher>(() => gate));
    const pending = session.login('test', 'password'); await session.logout(); resolve(json({ data: bundle() }));
    await expect(pending).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(session.snapshot().status).toBe('guest'); expect(storage.value()).toBeNull();
  });
  it('serializes logout with refresh and never restores old admin state', async () => {
    let resolve!: (value: Response) => void;
    const gate = new Promise<Response>(done => { resolve = done; });
    const fetcher = vi.fn<Fetcher>(async url => {
      if (path(url).endsWith('/login')) return json({ data: bundle('one', true) });
      if (path(url).endsWith('/refresh')) return gate;
      return new Response(null, { status: 204 });
    });
    const { session, storage } = setup(fetcher); await session.login('test', 'password');
    const pending = session.authenticated('/me').catch(error => error);
    const logout = session.logout(); resolve(json({ data: bundle('two') })); await logout; await pending;
    expect(session.snapshot().status).toBe('guest'); expect(storage.value()).toBeNull();
    const last = fetcher.mock.calls.at(-1)!; expect(path(last[0])).toBe('/api/v1/auth/logout'); expect(last[1]?.headers).not.toHaveProperty('Authorization');
  });
});

describe('content validation', () => {
  it('accepts text/media posts and rejects empty, oversized, or duplicate content', () => {
    const empty = { category: 'article' as const, title: 'Title only', text: '', mediaIds: [] };
    expect(validatePost(empty)).toBeTruthy();
    expect(validatePost({ ...empty, text: 'A story' })).toBeNull();
    expect(validatePost({ ...empty, mediaIds: ['a'] })).toBeNull();
    expect(validatePost({ ...empty, mediaIds: ['a', 'a'] })).toBeTruthy();
    expect(validatePost({ ...empty, text: 'a'.repeat(20_001) })).toBeTruthy();
    expect(validatePost({ ...empty, text: 'story', title: 'a'.repeat(201) })).toBeTruthy();
  });
  it('enforces image/video input limits without accepting renamed unsupported formats', () => {
    expect(validateFile('image/jpeg', 1024)).toBeNull(); expect(validateFile('video/mp4', 1024)).toBeNull();
    expect(validateFile('image/png', 11 * 1024 * 1024)).toBeTruthy(); expect(validateFile('video/mp4', 101 * 1024 * 1024)).toBeTruthy();
    expect(validateFile('video/quicktime')).toBeTruthy(); expect(validateFile('text/plain')).toBeTruthy();
  });
  it('deduplicates cursor pages by ID while preserving their order', () => {
    expect(uniquePosts([[{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]]).map(post => post.id)).toEqual(['a', 'b', 'c']);
  });
});
