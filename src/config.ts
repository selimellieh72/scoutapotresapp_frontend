import { HttpClient } from './api/http';

export const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
export const http = new HttpClient(apiUrl);
const configuredShare = process.env.EXPO_PUBLIC_SHARE_URL;
export const shareBase = configuredShare && /^https?:\/\//.test(configuredShare) ? configuredShare.replace(/\/$/, '') : undefined;
