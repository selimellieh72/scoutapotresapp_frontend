import type { PostInput } from '../api/types';
export function validatePost(input: PostInput): string | null {
  if (!input.text.trim() && !input.mediaIds.length) return 'Add some text or an image before publishing.';
  if (input.title.length > 200) return 'Titles can contain up to 200 characters.';
  if (input.text.length > 20_000) return 'Post text can contain up to 20,000 characters.';
  if (input.mediaIds.length > 1) return 'Choose only one post image.';
  if (new Set(input.mediaIds).size !== input.mediaIds.length) return 'Remove duplicate attachments.';
  return null;
}
export function validateFile(mime: string, size?: number | null): string | null {
  const image = ['image/jpeg', 'image/png', 'image/webp'].includes(mime);
  if (!image) return 'Choose a JPEG, PNG, or WebP image.';
  if (size && size > 10 * 1024 * 1024) return 'Choose an image smaller than 10 MB.';
  return null;
}
export function uniquePosts<T extends { id: string }>(pages: T[][]): T[] {
  return [...new Map(pages.flat().map(post => [post.id, post])).values()];
}
