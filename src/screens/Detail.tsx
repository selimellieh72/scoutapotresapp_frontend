import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, queryClient } from '../providers';
import { usePost } from '../features/queries';
import { Video } from '../features/media';
import { ApiError } from '../api/http';
import { http } from '../config';
import { Avatar, Empty, Header, Icon, IconButton, Page, Skeleton } from '../ui/components';
import { colors, styles } from '../ui/theme';
import { categoryLabels, type Post } from '../api/types';
import { isDemoGroup } from '../demo/content';

const detailDate = (value: string) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const postSeed = (post: Post) => [...post.id].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) | 0, 0);

function PostDetailContent({ post }: { post: Post }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(720, windowWidth);
  const heroHeight = Math.max(300, Math.min(500, width * 0.73));
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const engagement = useMemo(() => {
    const seed = Math.abs(postSeed(post));
    return { likes: 28 + (seed % 61), comments: 4 + (seed % 13) };
  }, [post]);
  const media = post.media[0];
  const openGroup = () => isDemoGroup(post.group.id)
    ? router.push({ pathname: '/groups/[id]', params: { id: post.group.id } })
    : router.push('/group');
  const share = () => void Share.share({ title: post.title || post.group.name, message: `${post.title}\n\n${post.text}`.trim() });
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');
  const top = Platform.OS === 'ios' ? insets.top + 12 : 14;

  return <Page backgroundColor={colors.white} safeTop={Platform.OS !== 'ios'}>
    <ScrollView style={{ flex: 1, backgroundColor: colors.white }} contentContainerStyle={{ paddingBottom: 28 + insets.bottom }} showsVerticalScrollIndicator={false}>
      <View style={{ height: heroHeight, backgroundColor: colors.green, overflow: 'hidden' }}>
        {media?.type === 'image' ? <Pressable accessibilityRole="button" accessibilityLabel="Open post image" onPress={() => router.push({ pathname: '/media/[id]', params: { id: media.id, postId: post.id } })} style={StyleSheet.absoluteFill}>
          <Image source={http.mediaUrl(media.url)} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={post.title || 'Post image'} />
        </Pressable> : media?.type === 'video' ? <Video media={media} /> : <LinearGradient colors={[colors.greenTint, colors.green, '#153B20']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <View style={{ width: heroHeight * 0.72, height: heroHeight * 0.72, position: 'absolute', right: -heroHeight * 0.18, top: -heroHeight * 0.2, borderRadius: heroHeight, backgroundColor: '#FFFFFF12' }} />
          <View style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF18' }}><Icon name="compass" size={48} color={colors.white} /></View>
        </LinearGradient>}
        <LinearGradient pointerEvents="none" colors={['transparent', '#11181116', '#0B120ACC']} locations={[0.38, 0.64, 1]} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${post.group.name}`} onPress={openGroup} style={({ pressed }) => ({ minWidth: 0, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.65 : 1 })}>
            <Icon name="users" size={19} color={colors.white} />
            <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.white, fontSize: 14, fontWeight: '700' }}>{post.group.name}</Text>
          </Pressable>
          <View style={{ width: 1, height: 22, backgroundColor: '#FFFFFFA0' }} />
          <View style={{ minHeight: 24, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#FFFFFFEE' }}><Text style={{ color: colors.ink, fontSize: 10, lineHeight: 12, fontWeight: '700' }}>{categoryLabels[post.category]}</Text></View>
        </View>
      </View>

      <View style={{ marginTop: -1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderCurve: 'continuous', backgroundColor: colors.white, gap: 18 }}>
        <View style={{ width: 39, height: 6, borderRadius: 3, backgroundColor: colors.yellow }} />
        <Text selectable style={{ color: colors.ink, fontSize: 30, lineHeight: 35, fontWeight: '700', letterSpacing: -0.8 }}>{post.title || categoryLabels[post.category]}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Icon name="calendar" size={21} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 15 }}>{detailDate(post.publishedAt)}</Text></View>
        {post.text ? <Text selectable style={{ color: colors.ink, fontSize: 16, lineHeight: 25 }}>{post.text}</Text> : null}

        <View style={{ minHeight: 48, paddingHorizontal: 6, borderRadius: 24, backgroundColor: '#F6F5F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={liked ? 'Unlike post' : 'Like post'} accessibilityState={{ selected: liked }} onPress={() => setLiked(value => !value)} hitSlop={4} style={({ pressed }) => ({ minWidth: 54, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: pressed ? 0.55 : 1 })}><Icon name="heart" size={20} color={liked ? colors.primary : colors.green} /><Text style={{ color: colors.ink, fontSize: 13 }}>{engagement.likes + (liked ? 1 : 0)}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="View comments" hitSlop={4} style={({ pressed }) => ({ minWidth: 54, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: pressed ? 0.55 : 1 })}><Icon name="message-circle" size={20} color={colors.green} /><Text style={{ color: colors.ink, fontSize: 13 }}>{engagement.comments}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Remove bookmark' : 'Bookmark post'} accessibilityState={{ selected: saved }} onPress={() => setSaved(value => !value)} hitSlop={4} style={({ pressed }) => ({ minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.55 : 1 })}><Icon name="bookmark" size={20} color={saved ? colors.primary : colors.green} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Share post" onPress={share} hitSlop={4} style={({ pressed }) => ({ minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.55 : 1 })}><Icon name="share" size={20} color={colors.green} /></Pressable>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${post.group.name}`} onPress={openGroup} style={({ pressed }) => ({ minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.65 : 1 })}>
          <Avatar media={post.group.logo} name={post.group.name} size={54} />
          <View style={{ flex: 1, gap: 3 }}><Text numberOfLines={1} style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>{post.group.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>Groupe scout</Text></View>
          <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F5F1' }}><Icon name="chevron-right" size={21} color={colors.green} /></View>
        </Pressable>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: colors.ink, fontSize: 21, fontWeight: '700' }}>Commentaires ({engagement.comments})</Text><Text style={{ color: colors.green, fontSize: 14, fontWeight: '600' }}>Tout voir</Text></View>
          <View style={{ padding: 15, borderRadius: 22, backgroundColor: '#F7F6F2', flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenTint }}><Icon name="user" size={20} color={colors.green} /></View>
            <View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.ink, fontSize: 14, fontWeight: '700' }}>Yacine B.</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Il y a 2 jours</Text><Text style={{ marginTop: 2, color: colors.ink, fontSize: 14, lineHeight: 20 }}>Quelle belle reprise ! Hâte de vivre toutes ces nouvelles aventures avec le groupe !</Text></View>
          </View>
        </View>
      </View>
    </ScrollView>

    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={({ pressed }) => ({ position: 'absolute', top, left: 18, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFFE8', boxShadow: '0 6px 20px #1D231C22', opacity: pressed ? 0.65 : 1 })}><Icon name="chevron-left" size={27} color={colors.green} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Share post" onPress={share} style={({ pressed }) => ({ position: 'absolute', top, right: 18, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFFE8', boxShadow: '0 6px 20px #1D231C22', opacity: pressed ? 0.65 : 1 })}><Icon name="share" size={23} color={colors.green} /></Pressable>
  </Page>;
}

export function PostDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const valid = /^[a-f0-9]{24}$/i.test(id);
  const query = usePost(id);
  useEffect(() => { if (query.error instanceof ApiError && query.error.status === 404) void queryClient.invalidateQueries({ queryKey: ['posts'] }); }, [query.error]);
  const unavailable = !valid || (query.error instanceof ApiError && query.error.status === 404);
  if (unavailable) return <Page><Header back title="From the journal" /><Empty title="Post unavailable" message="It may have been removed. Return to the journal for the latest updates." /></Page>;
  if (query.isPending) return <Page><Skeleton /></Page>;
  if (query.data) return <PostDetailContent post={query.data.data} />;
  return <Page><Header back title="From the journal" /><Empty title="We couldn’t load this post" message="Check your connection and try again." retry={() => void query.refetch()} /></Page>;
}

export function MediaViewerScreen() {
  const params = useLocalSearchParams<{ id: string; postId?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const postId = typeof params.postId === 'string' ? params.postId : '';
  const valid = /^[a-f0-9]{24}$/i.test(id);
  const post = usePost(postId);
  const media = useQuery({ queryKey: ['media', id], enabled: valid, queryFn: () => api.media(id) });
  const dimensions = useWindowDimensions();
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setZoom(1); setFailed(false); }, [id]);
  const assets = post.data?.data.media ?? (media.data ? [media.data.data] : []);
  const index = Math.max(0, assets.findIndex(asset => asset.id === id));
  const asset = assets[index];
  const width = Math.min(720, dimensions.width);
  const height = Math.max(300, dimensions.height - 190);
  const next = (offset: number) => { const item = assets[index + offset]; if (item) router.setParams({ id: item.id }); };
  return <Page><Header back title={assets.length > 1 ? `${index + 1} / ${assets.length}` : 'Media'} right={asset?.type === 'image' ? <View style={styles.row}><IconButton icon="minus" label="Zoom out" disabled={zoom === 1} onPress={() => setZoom(Math.max(1, zoom - 1))} /><IconButton icon="plus" label="Zoom in" disabled={zoom === 3} onPress={() => setZoom(Math.min(3, zoom + 1))} /></View> : undefined} />
    {!valid || media.isError ? <Empty title="Media unavailable" message="This image or video may no longer be published." retry={valid ? () => void media.refetch() : undefined} /> : !asset ? <Skeleton /> : asset.type === 'video' ? <View style={{ height }}><Video media={asset} /></View> : failed ? <Empty title="Image unavailable" retry={() => setFailed(false)} /> : <ScrollView style={{ flex: 1 }} maximumZoomScale={3} minimumZoomScale={1}><ScrollView horizontal contentContainerStyle={{ minWidth: width }}><Image source={http.mediaUrl(asset.url)} style={{ width: width * zoom, height: height * zoom }} contentFit="contain" accessibilityLabel={`Full image ${index + 1} of ${assets.length}`} cachePolicy="none" onError={() => setFailed(true)} /></ScrollView></ScrollView>}
    {assets.length > 1 && <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><IconButton icon="arrow-left" label="Previous attachment" disabled={index === 0} onPress={() => next(-1)} /><Text style={styles.muted}>{index + 1} of {assets.length}</Text><IconButton icon="arrow-right" label="Next attachment" disabled={index === assets.length - 1} onPress={() => next(1)} /></View>}
  </Page>;
}
