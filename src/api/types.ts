import { z } from 'zod';

export const categories = ['article', 'atelier', 'installation', 'jeux'] as const;
export type Category = typeof categories[number];
export const categoryLabels: Record<Category, string> = { article: 'Article', atelier: 'Atelier', installation: 'Installation', jeux: 'Jeux' };
export const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);
export const mediaSchema = z.object({ id: idSchema, type: z.enum(['image', 'video']), mimeType: z.string(),
  sizeBytes: z.number(), width: z.number(), height: z.number(), durationSeconds: z.number().optional(),
  state: z.enum(['processing', 'ready', 'failed']), url: z.string() });
export const groupIdentitySchema = z.object({ id: idSchema, name: z.string(), logo: mediaSchema.nullable() });
export const groupSchema = groupIdentitySchema.extend({ description: z.string(), cover: mediaSchema.nullable(), updatedAt: z.string() });
export const postSchema = z.object({ id: idSchema, group: groupIdentitySchema, category: z.enum(categories),
  title: z.string(), text: z.string(), media: z.array(mediaSchema), publishedAt: z.string(), updatedAt: z.string() });
export const pageSchema = z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() });
export const postsSchema = z.object({ data: z.array(postSchema), page: pageSchema });
export const discoverSchema = z.object({ data: z.object({ group: groupSchema, posts: z.array(postSchema) }), page: pageSchema });
export const searchSchema = z.object({ data: z.object({ groups: z.array(groupSchema), posts: z.array(postSchema) }), page: pageSchema });
export const adminSchema = z.object({ id: idSchema, email: z.string(), username: z.string().nullable(),
  displayName: z.string(), role: z.literal('admin'), status: z.literal('active') });
export const sessionSchema = z.object({ accessToken: z.string(), refreshToken: z.string(),
  accessExpiresAt: z.iso.datetime(), sessionExpiresAt: z.iso.datetime(), admin: adminSchema });
export const infoSchema = z.object({ about: z.string(), contactEmail: z.string().nullable(),
  privacyPolicyUrl: z.string().nullable(), supportedLanguages: z.array(z.string()) });
export type Media = z.infer<typeof mediaSchema>;
export type Post = z.infer<typeof postSchema>;
export type Group = z.infer<typeof groupSchema>;
export type Admin = z.infer<typeof adminSchema>;
export type SessionBundle = z.infer<typeof sessionSchema>;
export type Filters = { category?: Category; contentType?: 'text' | 'image' | 'video'; q?: string };
export type Page = z.infer<typeof pageSchema>;
export type PostInput = { category: Category; title: string; text: string; mediaIds: string[] };
export type GroupInput = { name: string; description: string; logoMediaId?: string | null; coverMediaId?: string | null };
export const dataSchema = <T extends z.ZodType>(schema: T) => z.object({ data: schema });
