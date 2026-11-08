import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { api, invalidateContent, useSession } from '../providers';
import { shareBase } from '../config';
import { ApiError, userMessage } from '../api/http';
import { categories, categoryLabels, type Category, type Post } from '../api/types';
import { uniquePosts } from '../domain/validation';
import { Avatar, Button, Chips, Empty, Icon, IconButton, Skeleton } from '../ui/components';
import { useDialog } from '../ui/dialog';
import { copy } from '../copy';
import { colors, styles } from '../ui/theme';
import { MediaGallery } from './media';

export function CategoryFilters({ value, onChange, includeAll = true, presentation = 'chips' }: { value?: Category; onChange: (value?: Category) => void; includeAll?: boolean; presentation?: 'chips' | 'strip' }) {
  const options = [...(includeAll ? [{ value: '', label: 'All' }] : []), ...categories.map(value => ({ value, label: categoryLabels[value] }))];
  if (presentation === 'strip') return <View style={{ minHeight: 54, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'stretch' }}>
    {options.map(option => {
      const selected = (value ?? '') === option.value;
      return <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onChange(option.value ? option.value as Category : undefined)}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 5, opacity: pressed ? 0.55 : 1 })}>
        <Text numberOfLines={1} style={{ color: selected ? colors.ink : colors.muted, fontSize: 11, fontWeight: selected ? '700' : '500' }}>{option.label}</Text>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: selected ? colors.primary : 'transparent' }} />
      </Pressable>;
    })}
  </View>;
  return <Chips options={options} value={value ?? ''} onChange={value => onChange(value ? value as Category : undefined)} />;
}
const date = (value: string, detail = false) => new Date(value).toLocaleDateString(undefined, { month: detail ? 'long' : 'short', day: 'numeric', ...(detail ? { year: 'numeric' } : {}) });
const relativeDate = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : date(value);
};
export function PostCard({ post, detail = false, visible = true, preview = false, mediaOverrides, presentation = 'timeline' }: { post: Post; detail?: boolean; visible?: boolean; preview?: boolean; mediaOverrides?: Record<string, string>; presentation?: 'timeline' | 'card' }) {
  const auth = useSession();
  const dialog = useDialog();
  const [menu, setMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const remove = async () => {
    setMenu(false);
    if (!await dialog.confirm({ title: 'Delete this post?', message: 'It will be removed from the group journal.', confirm: 'Delete post', destructive: true })) return;
    setDeleting(true);
    try { await api.deletePost(post.id); await invalidateContent(); if (detail) router.replace('/'); dialog.toast('Post deleted.'); }
    catch (error) { if (error instanceof ApiError && error.status === 404) { await invalidateContent(); if (detail) router.replace('/'); } else dialog.toast(userMessage(error)); }
    finally { setDeleting(false); }
  };
  const share = async () => {
    const url = shareBase ? `${shareBase}/posts/${post.id}` : `scoutapotres://posts/${post.id}`;
    try {
      if (Platform.OS === 'web') { await navigator.clipboard.writeText(url); dialog.toast('Post link copied.'); }
      else await Share.share({ message: `${post.title || post.group.name}\n${url}` });
    } catch { dialog.toast('We couldn’t open sharing. Please try again.'); }
  };
  const body = <View style={{ gap: 7 }}>
    {post.title ? <Text style={[styles.heading, detail && { fontSize: 25, lineHeight: 32 }]} selectable={detail}>{post.title}</Text> : null}
    {post.text ? <Text style={styles.body} numberOfLines={detail ? undefined : 4} selectable={detail}>{post.text}</Text> : null}
    {!detail && (post.text.length > 200 || post.text.split('\n').length > 4) && <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Read more</Text>}
  </View>;
  if (presentation === 'card' && !detail) return <View style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 12, borderRadius: 28, backgroundColor: colors.white, boxShadow: '0 8px 28px #32323212', overflow: 'hidden', opacity: deleting ? 0.55 : 1 }}>
    {post.media.length ? <View style={{ position: 'relative', backgroundColor: colors.paper }}>
      <MediaGallery media={post.media} postId={post.id} visible={visible} overrides={mediaOverrides} interactive={!preview} largeRadius />
      <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel="Open group profile" onPress={() => router.push('/group')}
        style={({ pressed }) => ({ position: 'absolute', top: 14, left: 14, maxWidth: '64%', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8, paddingRight: 13, borderRadius: 22, backgroundColor: '#FFFFFFEE', opacity: pressed ? 0.72 : 1 })}>
        <Avatar media={post.group.logo} size={30} /><Text numberOfLines={1} style={{ flexShrink: 1, color: colors.ink, fontSize: 13, fontWeight: '600' }}>{post.group.name}</Text>
      </Pressable>
      <View style={{ position: 'absolute', top: 16, right: 14, minHeight: 34, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 17, backgroundColor: colors.primary }}>
        <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>{categoryLabels[post.category]}</Text>
      </View>
    </View> : null}
    <View style={{ paddingHorizontal: 18, paddingTop: post.media.length ? 17 : 20, paddingBottom: 14, gap: 14 }}>
      {!post.media.length && <View style={[styles.row, { gap: 10 }]}>
        <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel="Open group profile" onPress={() => router.push('/group')}><Avatar media={post.group.logo} size={38} /></Pressable>
        <Pressable disabled={preview} accessibilityRole="button" onPress={() => router.push('/group')} style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }}>{post.group.name}</Text></Pressable>
        <View style={{ minHeight: 32, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.primaryTint }}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{categoryLabels[post.category]}</Text></View>
      </View>}
      {preview ? body : <Pressable accessibilityRole="button" accessibilityLabel={`Read ${post.title || 'post'}`} onPress={() => router.push(`/posts/${post.id}`)}>{body}</Pressable>}
      <View style={[styles.between, { minHeight: 38 }]}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{relativeDate(post.publishedAt)}</Text>
        <View style={styles.row}>
          {auth.status === 'admin' && !preview && <IconButton icon="more-horizontal" label="Post options" onPress={() => setMenu(true)} disabled={deleting} />}
          {!preview && <Pressable accessibilityRole="button" accessibilityLabel="Share post" onPress={() => void share()} style={{ minHeight: 40, flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 8 }}><Icon name="share-2" size={17} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 13, fontWeight: '500' }}>Share</Text></Pressable>}
        </View>
      </View>
    </View>
    <PostMenu visible={menu} onClose={() => setMenu(false)} onEdit={() => { setMenu(false); router.push({ pathname: '/compose', params: { postId: post.id } }); }} onDelete={() => void remove()} />
  </View>;
  return <View style={{ paddingHorizontal: 20, paddingTop: 21, paddingBottom: 14, backgroundColor: detail ? colors.canvas : colors.white, gap: 15, opacity: deleting ? 0.55 : 1 }}>
    <View style={[styles.row, { gap: 10 }]}>
      <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel="Open group profile" onPress={() => router.push('/group')}><Avatar media={post.group.logo} /></Pressable>
      <Pressable disabled={preview} accessibilityRole="button" onPress={() => router.push('/group')} style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 15, fontWeight: '600' }}>{post.group.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{date(post.publishedAt, detail)} <Text> · </Text>{categoryLabels[post.category]}</Text>
      </Pressable>
      {auth.status === 'admin' && !preview && <IconButton icon="more-horizontal" label="Post options" onPress={() => setMenu(true)} disabled={deleting} />}
    </View>
    {detail ? body : <Pressable accessibilityRole="button" accessibilityLabel={`Read ${post.title || 'post'}`} onPress={() => router.push(`/posts/${post.id}`)}>{body}</Pressable>}
    <MediaGallery media={post.media} postId={post.id} visible={visible} overrides={mediaOverrides} interactive={!preview} />
    {!preview && <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Share post" onPress={() => void share()} style={{ minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 6 }}><Icon name="upload" size={16} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 12 }}>Share</Text></Pressable>
    </View>}
    <PostMenu visible={menu} onClose={() => setMenu(false)} onEdit={() => { setMenu(false); router.push({ pathname: '/compose', params: { postId: post.id } }); }} onDelete={() => void remove()} />
  </View>;
}

function PostMenu({ visible, onClose, onEdit, onDelete }: { visible: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><View style={{ flex: 1, backgroundColor: '#20272055', justifyContent: 'flex-end', alignItems: 'center' }}>
    <View accessibilityViewIsModal style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, width: '100%', maxWidth: 680, gap: 12 }}>
      <Text style={styles.heading}>Manage post</Text>
      <Button title="Edit post" icon="edit-2" variant="secondary" onPress={onEdit} />
      <Button title="Delete post" icon="trash-2" variant="danger" onPress={onDelete} />
      <Button title="Cancel" variant="ghost" onPress={onClose} />
    </View>
  </View></Modal>;
}

export type FeedData = { posts: Post[]; page: { nextCursor: string | null; hasMore: boolean } };
export function PostList({ query, header, emptyTitle, emptyBody, presentation = 'timeline' }: { query: UseInfiniteQueryResult<InfiniteData<FeedData>, Error>; header?: React.ReactElement; emptyTitle?: string; emptyBody?: string; presentation?: 'timeline' | 'card' }) {
  const [visible, setVisible] = useState(new Set<string>());
  const viewability = useRef(({ viewableItems }: { viewableItems: { item: Post }[] }) => setVisible(new Set(viewableItems.map(item => item.item.id)))).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const posts = useMemo(() => uniquePosts(query.data?.pages.map(page => page.posts) ?? []), [query.data?.pages]);
  return <FlatList data={posts} keyExtractor={post => post.id} extraData={visible} renderItem={({ item }) => <PostCard post={item} visible={visible.has(item.id)} presentation={presentation} />}
    onViewableItemsChanged={viewability} viewabilityConfig={viewabilityConfig}
    ListHeaderComponent={header} style={presentation === 'card' ? { backgroundColor: colors.canvas } : undefined} contentContainerStyle={{ flexGrow: 1, paddingBottom: presentation === 'card' ? 28 : 36 }}
    refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => { void query.refetch(); }}
    onEndReachedThreshold={0.4} onEndReached={() => { if (query.hasNextPage && !query.isFetching) void query.fetchNextPage(); }}
    initialNumToRender={5} windowSize={5} maxToRenderPerBatch={5}
    ListEmptyComponent={query.isPending ? <Skeleton /> : query.isError ? <Empty title={copy.errorTitle} message={copy.errorBody} retry={() => void query.refetch()} icon="cloud-off" /> : <Empty title={emptyTitle} message={emptyBody} />}
    ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 24 }} /> : query.isFetchNextPageError ? <View style={{ padding: 20 }}><Button title="Retry loading more" variant="secondary" onPress={() => void query.fetchNextPage()} /></View> : posts.length ? <View style={{ alignItems: 'center', padding: 26 }}><Text style={styles.eyebrow}>{query.hasNextPage ? 'MORE FROM THE GROUP' : 'YOU’RE ALL CAUGHT UP'}</Text></View> : undefined} />;
}

export function CreateButton() {
  const auth = useSession();
  if (auth.status !== 'admin') return null;
  return <Pressable accessibilityRole="button" accessibilityLabel="Create post" onPress={() => router.push('/compose')}
    style={{ position: 'absolute', bottom: 22, right: 22, width: 58, height: 58, backgroundColor: colors.primary, borderRadius: 29, justifyContent: 'center', alignItems: 'center', boxShadow: '0 8px 22px #CA373744' }}><Icon name="plus" color="white" size={26} /></Pressable>;
}
