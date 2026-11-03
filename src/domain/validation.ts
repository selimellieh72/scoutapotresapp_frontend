import type { PostInput } from '../api/types';
export function validatePost(input: PostInput): string | null {
  if (!input.text.trim() && !input.mediaIds.length) return 'Add some text or an image/video before publishing.';
  if (input.title.length > 200) return 'Titles can contain up to 200 characters.';
  if (input.text.length > 20_000) return 'Post text can contain up to 20,000 characters.';
  if (input.mediaIds.length > 10) return 'Choose up to 10 attachments.';
  if (new Set(input.mediaIds).size !== input.mediaIds.length) return 'Remove duplicate attachments.';
  return null;
}
export function validateFile(mime: string, size?: number | null): string | null {
  const image = ['image/jpeg', 'image/png', 'image/webp'].includes(mime);
  if (!image && mime !== 'video/mp4') return 'Choose a JPEG, PNG, WebP image or an MP4 video.';
  if (size && size > (image ? 10 : 100) * 1024 * 1024) return image ? 'Choose an image smaller than 10 MB.' : 'Choose a video smaller than 100 MB.';
  return null;
}
export function uniquePosts<T extends { id: string }>(pages: T[][]): T[] {
  return [...new Map(pages.flat().map(post => [post.id, post])).values()];
}
