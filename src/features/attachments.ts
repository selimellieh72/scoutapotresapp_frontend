import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import type { Media } from '../api/types';
import { validateFile } from '../domain/validation';
import { api } from '../providers';
import { http } from '../config';

export type Attachment = { key: string; uri: string; name: string; mime: string; size?: number; type: 'image' | 'video';
  width: number; height: number; file?: File; media?: Media; fresh: boolean; state: 'local' | 'uploading' | 'ready' | 'error' };
export const existingAttachment = (media: Media): Attachment => ({ key: media.id, uri: http.mediaUrl(media.url), name: media.id,
  mime: media.mimeType, size: media.sizeBytes, type: media.type, width: media.width, height: media.height, media, fresh: false, state: 'ready' });

export async function pickAttachments(limit: number, imagesOnly = false): Promise<Attachment[]> {
  if (limit <= 0) throw new Error('Choose up to 10 attachments.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: imagesOnly ? ['images'] : ['images', 'videos'],
    allowsMultipleSelection: !imagesOnly, selectionLimit: limit, quality: 1 });
  if (result.canceled) return [];
  const files: Attachment[] = [];
  for (const asset of result.assets.slice(0, limit)) {
    let uri = asset.uri;
    let mime = asset.mimeType ?? (asset.fileName?.match(/\.mp4$/i) ? 'video/mp4' : asset.fileName?.match(/\.png$/i) ? 'image/png' : asset.fileName?.match(/\.webp$/i) ? 'image/webp' : asset.fileName?.match(/\.jpe?g$/i) ? 'image/jpeg' : '');
    let name = asset.fileName ?? `attachment-${Date.now()}.${mime === 'video/mp4' ? 'mp4' : 'jpg'}`;
    let file = asset.file;
    let size = asset.fileSize;
    if (['image/heic', 'image/heif'].includes(mime) || /\.hei[cf]$/i.test(name)) {
      const converted = await ImageManipulator.manipulateAsync(uri, [], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      uri = converted.uri; mime = 'image/jpeg'; name = name.replace(/\.[^.]+$/, '') + '.jpg'; file = undefined; size = undefined;
    }
    const invalid = validateFile(mime, size);
    if (invalid) throw new Error(invalid);
    files.push({ key: `local-${Date.now()}-${files.length}`, uri, name, mime, size, type: mime === 'video/mp4' ? 'video' : 'image',
      width: asset.width, height: asset.height, file, fresh: true, state: 'local' });
  }
  return files;
}
export async function uploadAttachment(attachment: Attachment): Promise<Attachment> {
  if (attachment.media?.state === 'ready') return attachment;
  const form = new FormData();
  if (Platform.OS === 'web') {
    const file = attachment.file ?? await (await fetch(attachment.uri)).blob();
    form.append('file', file, attachment.name);
  } else form.append('file', { uri: attachment.uri, name: attachment.name, type: attachment.mime } as unknown as Blob);
  const { data } = await api.upload(form);
  if (data.state !== 'ready') throw new Error('This attachment is not ready yet. Please try again shortly.');
  return { ...attachment, media: data, state: 'ready' };
}
export async function cleanupAttachments(attachments: Attachment[]) {
  for (const item of attachments) {
    if (!item.fresh || !item.media) continue;
    // Conflicts and offline cleanup failures leave files for explicit admin cleanup.
    await api.deleteMedia(item.media.id).catch(() => {});
  }
}
