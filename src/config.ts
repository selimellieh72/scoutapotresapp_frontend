import { fetch as expoFetch } from 'expo/fetch';
import { HttpClient, type Fetcher } from './api/http';

export const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://loaded-pediatric-und-scanners.trycloudflare.com/api/v1';
const nativeFetcher: Fetcher = (input, init) => expoFetch(input, init);
export const http = new HttpClient(apiUrl, nativeFetcher);
const configuredShare = process.env.EXPO_PUBLIC_SHARE_URL;
export const shareBase = configuredShare && /^https?:\/\//.test(configuredShare) ? configuredShare.replace(/\/$/, '') : undefined;
export const privacyPolicyUrl = 'https://selimellieh72.github.io/chikirlik-privacy/';
