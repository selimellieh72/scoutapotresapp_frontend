import React, { useEffect, useMemo, useState } from 'react';
import { AppState, FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { router, useIsFocused } from 'expo-router';
import { http } from '../config';
import { usePlayback, usePreferences } from '../providers';
import type { Media } from '../api/types';
import { colors, styles } from '../ui/theme';

export function Video({ media, visible = true, uri }: { media: Media; visible?: boolean; uri?: string }) {
  const source = useMemo(() => ({ uri: uri ?? http.mediaUrl(media.url) }), [media.url, uri]);
  const player = useVideoPlayer(source, instance => { instance.muted = true; });
  const focused = useIsFocused();
  const preferences = usePreferences();
  const playback = usePlayback();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [failed, setFailed] = useState(false);
  useEffect(() => { const sub = AppState.addEventListener('change', state => setForeground(state === 'active')); return () => sub.remove(); }, []);
  useEffect(() => {
    const play = player.addListener('playingChange', event => { if (event.isPlaying) playback.claim(media.id); });
    const status = player.addListener('statusChange', event => setFailed(event.status === 'error'));
    return () => { play.remove(); status.remove(); };
  }, [player, media.id, playback.claim]);
  useEffect(() => {
    if (preferences.autoplay && visible && focused && foreground) { playback.claim(media.id); player.play(); }
    else player.pause();
  }, [player, preferences.autoplay, visible, focused, foreground, media.id, playback.claim]);
  useEffect(() => { if (playback.active && playback.active !== media.id) player.pause(); }, [player, playback.active, media.id]);
  if (failed) return <Pressable accessibilityRole="button" onPress={() => { setFailed(false); void player.replaceAsync(source).catch(() => setFailed(true)); }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}><Text style={styles.muted}>Video unavailable · Tap to retry</Text></Pressable>;
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} accessibilityLabel="Post video" />;
}

function JournalImage({ uri, label, onOpen, cover = false }: { uri: string; label: string; onOpen?: () => void; cover?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <Pressable accessibilityRole="button" accessibilityLabel={failed ? 'Retry image' : label} disabled={!failed && !onOpen}
    onPress={() => { if (failed) { setFailed(false); setAttempt(attempt + 1); } else onOpen?.(); }} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    {failed ? <Text style={styles.muted}>Image unavailable · Tap to retry</Text> : <Image key={attempt} source={uri} style={{ width: '100%', height: '100%' }} contentFit={cover ? 'cover' : 'contain'} accessibilityLabel={label} cachePolicy="none" onError={() => setFailed(true)} />}
  </Pressable>;
}

export function MediaGallery({ media, postId, visible = true, overrides, interactive = true, largeRadius = false, radius, fixedHeight, cover = false }: { media: Media[]; postId?: string; visible?: boolean; overrides?: Record<string, string>; interactive?: boolean; largeRadius?: boolean; radius?: number; fixedHeight?: number; cover?: boolean }) {
  const [width, setWidth] = useState(320);
  const [index, setIndex] = useState(0);
  if (!media.length) return null;
  const current = media[index] ?? media[0]!;
  const height = fixedHeight ?? Math.max(190, Math.min(360, width * current.height / Math.max(1, current.width)));
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ borderRadius: radius ?? (largeRadius ? 28 : 14), overflow: 'hidden', backgroundColor: colors.paper }}>
    <FlatList data={media} horizontal pagingEnabled keyExtractor={asset => asset.id} showsHorizontalScrollIndicator={false}
      initialNumToRender={1} maxToRenderPerBatch={2} windowSize={3}
      onMomentumScrollEnd={event => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
      renderItem={({ item, index: position }) => <View style={{ width, height }}>
        {item.type === 'video' ? <Video media={item} visible={visible && position === index} uri={overrides?.[item.id]} /> :
          <JournalImage uri={overrides?.[item.id] ?? http.mediaUrl(item.url)} label={`Open image ${position + 1} of ${media.length}`} cover={cover}
            onOpen={interactive ? () => router.push({ pathname: '/media/[id]', params: { id: item.id, ...(postId ? { postId } : {}) } }) : undefined} />}
      </View>} />
    {media.length > 1 && <View style={{ position: 'absolute', right: 10, ...(largeRadius ? { bottom: 10 } : { top: 10 }), borderRadius: 12, backgroundColor: '#202720BF', paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: 'white', fontSize: 11 }}>{index + 1} / {media.length}</Text></View>}
  </View>;
}
