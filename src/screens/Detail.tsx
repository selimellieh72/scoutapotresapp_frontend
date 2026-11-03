import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, queryClient } from '../providers';
import { usePost } from '../features/queries';
import { PostCard } from '../features/posts';
import { Video } from '../features/media';
import { ApiError } from '../api/http';
import { http } from '../config';
import { Empty, Header, IconButton, Page, Skeleton } from '../ui/components';
import { styles } from '../ui/theme';

export function PostDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const valid = /^[a-f0-9]{24}$/i.test(id);
  const query = usePost(id);
  useEffect(() => { if (query.error instanceof ApiError && query.error.status === 404) void queryClient.invalidateQueries({ queryKey: ['posts'] }); }, [query.error]);
  const unavailable = !valid || (query.error instanceof ApiError && query.error.status === 404);
  return <Page><Header back title="From the journal" />{unavailable ? <Empty title="Post unavailable" message="It may have been removed. Return to the journal for the latest updates." /> : query.isPending ? <Skeleton /> : query.data ? <ScrollView><PostCard detail post={query.data.data} /></ScrollView> : <Empty title="We couldn’t load this post" message="Check your connection and try again." retry={() => void query.refetch()} />}</Page>;
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
