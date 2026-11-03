import { z } from 'zod';
import { ApiError, HttpClient, parseResponse, type RequestOptions } from './http';
import { dataSchema, discoverSchema, groupSchema, infoSchema, mediaSchema, postSchema, postsSchema, searchSchema, type Filters, type GroupInput, type PostInput } from './types';
import type { SessionManager } from '../auth/session';

export class ApiClient {
  constructor(readonly http: HttpClient, readonly session: SessionManager) {}
  private async public<T>(path: string, schema: z.ZodType<T>, options?: RequestOptions) {
    return parseResponse(schema, await this.http.request(path, options));
  }
  private async admin<T>(path: string, schema: z.ZodType<T>, options?: RequestOptions) {
    const response = await this.session.authenticated(path, options);
    try { return parseResponse(schema, response); }
    catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_RESPONSE' && options?.method && options.method !== 'GET')
        throw new ApiError(error.status, error.code, error.message, error.fields, true);
      throw error;
    }
  }
  private query(filters: Filters, cursor?: string) {
    const params = new URLSearchParams({ limit: '20' });
    for (const [key, value] of Object.entries({ ...filters, cursor })) if (value) params.set(key, value);
    return params.toString();
  }
  posts = (filters: Filters = {}, cursor?: string, signal?: AbortSignal) => this.public(`/posts?${this.query(filters, cursor)}`, postsSchema, { signal });
  post = (id: string, signal?: AbortSignal) => this.public(`/posts/${id}`, dataSchema(postSchema), { signal });
  group = (signal?: AbortSignal) => this.public('/group', dataSchema(groupSchema), { signal });
  discover = (filters: Filters = {}, cursor?: string, signal?: AbortSignal) => this.public(`/discover?${this.query(filters, cursor)}`, discoverSchema, { signal });
  search = (filters: Filters, cursor?: string, signal?: AbortSignal) => this.public(`/search?${this.query(filters, cursor)}`, searchSchema, { signal });
  info = () => this.public('/app-info', dataSchema(infoSchema));
  createPost = (body: PostInput) => this.admin('/posts', dataSchema(postSchema), { method: 'POST', body });
  editPost = (id: string, body: PostInput) => this.admin(`/posts/${id}`, dataSchema(postSchema), { method: 'PATCH', body });
  deletePost = (id: string) => this.session.authenticated(`/posts/${id}`, { method: 'DELETE' });
  editGroup = (body: GroupInput) => this.admin('/group', dataSchema(groupSchema), { method: 'PATCH', body });
  upload = (body: FormData) => this.admin('/media', dataSchema(mediaSchema), { method: 'POST', body, timeout: 180_000 });
  media = (id: string) => this.public(`/media/${id}`, dataSchema(mediaSchema));
  deleteMedia = (id: string) => this.session.authenticated(`/media/${id}`, { method: 'DELETE' });
  forgotPassword = (identifier: string) => this.public('/auth/forgot-password', dataSchema(z.object({ message: z.string() })), { method: 'POST', body: { identifier } });
  resetPassword = (token: string, password: string) => this.public('/auth/reset-password', dataSchema(z.object({ message: z.string() })), { method: 'POST', body: { token, password } });
}
