import { adminSchema, dataSchema, sessionSchema, type Admin, type SessionBundle } from '../api/types';
import { ApiError, cancelled, HttpClient, parseResponse, type RequestOptions } from '../api/http';

export interface SecretStorage { get(): Promise<string | null>; set(value: string): Promise<void>; clear(): Promise<void> }
export type SessionState = { status: 'restoring' | 'guest' | 'admin' | 'unverified'; admin: Admin | null; generation: number };

export class SessionManager {
  private bundle: SessionBundle | null = null;
  private generation = 0;
  private state: SessionState = { status: 'restoring', admin: null, generation: 0 };
  private listeners = new Set<() => void>();
  private refreshFlight: Promise<SessionBundle> | null = null;
  private restoreFlight: Promise<void> | null = null;
  private storageQueue: Promise<unknown> = Promise.resolve();
  constructor(readonly http: HttpClient, private readonly storage: SecretStorage) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(status: SessionState['status']) {
    this.state = { status, admin: status === 'admin' ? this.bundle?.admin ?? null : null, generation: this.generation };
    this.listeners.forEach(listener => listener());
  }
  private store(operation: () => Promise<void>) {
    const next = this.storageQueue.then(operation, operation);
    this.storageQueue = next.catch(() => {}); return next;
  }
  private async accept(bundle: SessionBundle, generation: number) {
    await this.store(async () => {
      if (generation !== this.generation) throw cancelled();
      await this.storage.set(JSON.stringify(bundle));
      if (generation !== this.generation) throw cancelled();
      this.bundle = bundle; this.emit('admin');
    });
    return bundle;
  }
  async invalidate() {
    this.generation++; this.bundle = null; this.emit('guest');
    await this.store(() => this.storage.clear());
  }
  restore() {
    if (this.restoreFlight) return this.restoreFlight;
    this.restoreFlight = this.doRestore().finally(() => { this.restoreFlight = null; });
    return this.restoreFlight;
  }
  private async doRestore() {
    const generation = this.generation;
    this.emit('restoring');
    try {
      const saved = await this.storage.get();
      if (generation !== this.generation) return;
      if (!saved) { this.emit('guest'); return; }
      const parsed = sessionSchema.safeParse(JSON.parse(saved));
      if (!parsed.success || Date.parse(parsed.data.sessionExpiresAt) <= Date.now()) { await this.invalidate(); return; }
      this.bundle = parsed.data;
      if (Date.parse(parsed.data.accessExpiresAt) <= Date.now() + 30_000) { await this.refresh(); return; }
      const me = parseResponse(dataSchema(adminSchema), await this.http.request('/me', { token: parsed.data.accessToken })).data;
      await this.accept({ ...parsed.data, admin: me }, generation);
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof ApiError && error.status === 401 && this.bundle) {
        try { await this.refresh(); } catch { /* refresh handles invalidation */ }
      } else if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) this.emit('unverified');
      else await this.invalidate();
    }
  }
  async login(identifier: string, password: string) {
    const generation = ++this.generation;
    const bundle = parseResponse(dataSchema(sessionSchema), await this.http.request('/auth/login', { method: 'POST', body: { identifier, password } })).data;
    return this.accept(bundle, generation);
  }
  private refresh() {
    if (this.refreshFlight) return this.refreshFlight;
    const generation = this.generation;
    const old = this.bundle;
    if (!old) return Promise.reject(cancelled());
    this.refreshFlight = (async () => {
      try {
        const bundle = parseResponse(dataSchema(sessionSchema), await this.http.request('/auth/refresh', { method: 'POST', body: { refreshToken: old.refreshToken } })).data;
        return await this.accept(bundle, generation);
      } catch (error) {
        // A lost refresh response may already have rotated its token; do not replay it.
        if (generation === this.generation) await this.invalidate();
        throw error;
      }
    })().finally(() => { this.refreshFlight = null; });
    return this.refreshFlight;
  }
  async authenticated(path: string, options: RequestOptions = {}) {
    if (this.state.status !== 'admin' || !this.bundle) throw cancelled();
    const generation = this.generation;
    let token = this.bundle.accessToken;
    if (Date.parse(this.bundle.accessExpiresAt) <= Date.now() + 30_000) token = (await this.refresh()).accessToken;
    try {
      const result = await this.http.request(path, { ...options, token });
      if (generation !== this.generation) throw cancelled();
      return result;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || generation !== this.generation) throw error;
      const fresh = this.bundle?.accessToken !== token && this.bundle ? this.bundle : await this.refresh();
      if (generation !== this.generation) throw cancelled();
      try {
        const result = await this.http.request(path, { ...options, token: fresh.accessToken });
        if (generation !== this.generation) throw cancelled();
        return result;
      } catch (retryError) {
        if (retryError instanceof ApiError && retryError.status === 401 && generation === this.generation) await this.invalidate();
        throw retryError;
      }
    }
  }
  async logout() {
    const old = this.bundle;
    await this.invalidate();
    await this.refreshFlight?.catch(() => {});
    if (old) await this.http.request('/auth/logout', { method: 'POST', body: { refreshToken: old.refreshToken } });
  }
}
