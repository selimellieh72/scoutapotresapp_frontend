import React, { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionManager, type SecretStorage } from './auth/session';
import { ApiClient } from './api/client';
import { http } from './config';
import { DialogProvider } from './ui/dialog';

let webSession: string | null = null;
const storage: SecretStorage = Platform.OS === 'web' ? {
  get: async () => webSession, set: async value => { webSession = value; }, clear: async () => { webSession = null; },
} : { get: () => SecureStore.getItemAsync('scout.admin.session'),
  set: value => SecureStore.setItemAsync('scout.admin.session', value), clear: () => SecureStore.deleteItemAsync('scout.admin.session') };
export const session = new SessionManager(http, storage);
export const api = new ApiClient(http, session);
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } } });
export const invalidateContent = () => queryClient.invalidateQueries({ predicate: query => ['posts', 'post', 'group', 'groups', 'search', 'discover'].includes(String(query.queryKey[0])) });
export function useSession() { return useSyncExternalStore(session.subscribe, session.snapshot, session.snapshot); }
const Preferences = createContext({ autoplay: false, setAutoplay: (_value: boolean) => {} });
const Playback = createContext({ active: null as string | null, claim: (_id: string) => {} });
export const usePreferences = () => useContext(Preferences);
export const usePlayback = () => useContext(Playback);

export function Providers({ children }: { children: React.ReactNode }) {
  const [autoplay, updateAutoplay] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const claim = useCallback((id: string) => setActive(id), []);
  useEffect(() => { void session.restore(); void AsyncStorage.getItem('scout.autoplay').then(value => updateAutoplay(value === 'true')).catch(() => {}); }, []);
  const setAutoplay = (value: boolean) => { updateAutoplay(value); void AsyncStorage.setItem('scout.autoplay', String(value)).catch(() => {}); };
  return <SafeAreaProvider><QueryClientProvider client={queryClient}>
    <Preferences.Provider value={{ autoplay, setAutoplay }}><Playback.Provider value={{ active, claim }}>
      <DialogProvider>{children}</DialogProvider>
    </Playback.Provider></Preferences.Provider>
  </QueryClientProvider></SafeAreaProvider>;
}
