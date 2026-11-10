import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, Share, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewProps } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import NativeMaskedView from '@react-native-masked-view/masked-view';
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
import { useTabBarScroll } from '../ui/tabBarScroll';
import { MediaGallery } from './media';
import { isDemoGroup } from '../demo/content';

// The package's class declaration predates React 19's JSX constructor types.
// Its runtime API is still compatible, so expose it through a modern component type.
const MaskedView = NativeMaskedView as unknown as React.ComponentType<ViewProps & {
  maskElement: React.ReactElement;
  androidRenderingMode?: 'software' | 'hardware';
}>;

const openPostGroup = (id: string) => {
  if (isDemoGroup(id)) router.push({ pathname: '/groups/[id]', params: { id } });
  else router.push('/group');
};

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
const searchSnippet = (text: string, term: string) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const match = clean.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  const start = match >= 0 ? Math.max(0, match - 52) : 0;
  const end = Math.min(clean.length, match >= 0 ? match + term.length + 92 : 150);
  return `${start ? '…' : ''}${clean.slice(start, end)}${end < clean.length ? '…' : ''}`;
};
export function HighlightedText({ text, term, style, numberOfLines }: { text: string; term: string; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const needle = term.trim();
  if (!needle) return <Text numberOfLines={numberOfLines} style={style}>{text}</Text>;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return <Text numberOfLines={numberOfLines} style={style}>{parts.map((part, index) => part.toLocaleLowerCase() === needle.toLocaleLowerCase() ? <Text key={`${part}-${index}`} style={{ color: colors.primary, fontWeight: '700' }}>{part}</Text> : part)}</Text>;
}

const categoryArtwork = {
  article: { icon: 'book-open' as const, background: colors.yellowTint, color: colors.ink },
  atelier: { icon: 'tool' as const, background: colors.primaryTint, color: colors.primary },
  installation: { icon: 'layers' as const, background: colors.greenTint, color: colors.green },
  jeux: { icon: 'target' as const, background: '#FFF7D6', color: colors.ink },
};

function CategoryArtwork({ category, height = 220, immersive = false }: { category: Category; height?: number; immersive?: boolean }) {
  const visual = categoryArtwork[category];
  const backgroundColor = immersive ? colors.green : visual.background;
  const foreground = immersive ? colors.white : visual.color;
  return <View style={{ height, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor }}>
    <View style={{ position: 'absolute', width: height * 0.78, height: height * 0.78, right: -height * 0.22, top: -height * 0.32, borderRadius: height, backgroundColor: immersive ? '#FFFFFF12' : '#FFFFFF80' }} />
    <View style={{ position: 'absolute', width: height * 0.42, height: height * 0.42, left: -height * 0.12, bottom: -height * 0.14, borderRadius: height, backgroundColor: immersive ? '#FFEE1426' : '#FFFFFF70' }} />
    <View style={{ alignItems: 'center', gap: 10 }}>
      <Icon name={visual.icon} size={38} color={foreground} />
      <Text style={{ color: foreground, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>{categoryLabels[category].toLocaleUpperCase()}</Text>
    </View>
  </View>;
}

export function PostCard({ post, detail = false, visible = true, preview = false, mediaOverrides, presentation = 'timeline', searchTerm = '' }: { post: Post; detail?: boolean; visible?: boolean; preview?: boolean; mediaOverrides?: Record<string, string>; presentation?: 'timeline' | 'card' | 'search'; searchTerm?: string }) {
  const auth = useSession();
  const dialog = useDialog();
  const [menu, setMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canManage = auth.status === 'admin' && !isDemoGroup(post.group.id);
  const atelierTilt = useMemo(() => {
    const hash = [...post.id].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) | 0, 0);
    return `${((Math.abs(hash) % 49) - 24) / 10}deg`;
  }, [post.id]);
  const dateLabel = (label: string, inverted = false, fontSize = 11) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
    <Icon name="calendar" size={fontSize + 2} color={inverted ? '#FFFFFFCC' : colors.muted} />
    <Text style={{ color: inverted ? '#FFFFFFCC' : colors.muted, fontSize }}>{label}</Text>
  </View>;
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
  if (presentation === 'search' && !detail) {
    const snippet = searchSnippet(post.text, searchTerm);
    return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${post.title || 'post'}`} onPress={() => router.push(`/posts/${post.id}`)}
      style={({ pressed }) => ({ marginHorizontal: 16, marginTop: 8, marginBottom: 8, padding: 16, borderRadius: 22, backgroundColor: colors.white, boxShadow: '0 7px 24px #3232320D', gap: 10, opacity: pressed ? 0.65 : 1 })}>
      <View style={[styles.row, { gap: 9 }]}>
        <Avatar media={post.group.logo} name={post.group.name} size={34} />
        <HighlightedText text={post.group.name} term={searchTerm} numberOfLines={1} style={{ flex: 1, color: colors.ink, fontSize: 13, fontWeight: '600' }} />
        <View style={{ minHeight: 23, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 12, backgroundColor: colors.primaryTint }}><Text style={{ color: colors.primary, fontSize: 9, lineHeight: 11, fontWeight: '700' }}>{categoryLabels[post.category]}</Text></View>
      </View>
      {post.title ? <HighlightedText text={post.title} term={searchTerm} numberOfLines={2} style={{ color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '600' }} /> : null}
      {snippet ? <HighlightedText text={snippet} term={searchTerm} numberOfLines={3} style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }} /> : null}
      <View style={styles.between}>{dateLabel(relativeDate(post.publishedAt))}<Icon name="chevron-right" size={17} color={colors.muted} /></View>
    </Pressable>;
  }
  const groupLine = (inverted = false, size = 30) => <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel={`Open ${post.group.name}`} onPress={() => openPostGroup(post.group.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.65 : 1 })}>
    <Avatar media={post.group.logo} name={post.group.name} size={size} />
    <Text numberOfLines={1} style={{ flexShrink: 1, color: inverted ? colors.white : colors.ink, fontSize: 13, fontWeight: '600' }}>{post.group.name}</Text>
  </Pressable>;
  const badge = (inverted = false, centered = false) => <View style={{ alignSelf: centered ? 'auto' : 'flex-start', minHeight: 23, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 12, backgroundColor: inverted ? '#FFFFFFE8' : colors.primaryTint }}>
    <Text style={{ color: colors.primary, fontSize: 9, lineHeight: 11, fontWeight: '700', letterSpacing: 0.2 }}>{categoryLabels[post.category]}</Text>
  </View>;
  const footer = (inverted = false, compact = false) => <View style={[styles.between, { minHeight: 38 }]}>
    {dateLabel(relativeDate(post.publishedAt), inverted)}
    <View style={[styles.row, { gap: compact ? 1 : 5 }]}>
      {canManage && !preview && <IconButton icon="more-horizontal" label="Post options" onPress={() => setMenu(true)} disabled={deleting} />}
      {!preview && <Pressable accessibilityRole="button" accessibilityLabel="Share post" onPress={() => void share()} style={{ minHeight: 38, flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: compact ? 4 : 8 }}>
        <Icon name="share-2" size={16} color={inverted ? colors.white : colors.muted} />
        {!compact && <Text style={{ color: inverted ? colors.white : colors.muted, fontSize: 12, fontWeight: '500' }}>Share</Text>}
      </Pressable>}
    </View>
  </View>;
  const postMenu = <PostMenu visible={menu} onClose={() => setMenu(false)} onEdit={() => { setMenu(false); router.push({ pathname: '/compose', params: { postId: post.id } }); }} onDelete={() => void remove()} />;

  if (presentation === 'card' && !detail && post.category === 'article') return <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 18, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.white, boxShadow: '0 8px 26px #32323210', opacity: deleting ? 0.55 : 1 }}>
    <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel={`Read ${post.title || 'post'}`} onPress={() => router.push(`/posts/${post.id}`)} style={({ pressed }) => ({ position: 'relative', backgroundColor: colors.paper, opacity: pressed ? 0.9 : 1 })}>
      {post.media.length ? <MediaGallery media={post.media} postId={post.id} visible={visible} overrides={mediaOverrides} interactive={false} radius={0} /> : <CategoryArtwork category={post.category} height={230} />}
      <LinearGradient pointerEvents="none" colors={['transparent', '#17201718', '#111811D9']} locations={[0.35, 0.62, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel={`Open ${post.group.name}`} onPress={event => { event.stopPropagation(); openPostGroup(post.group.id); }} style={({ pressed }) => ({ minWidth: 0, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 7, opacity: pressed ? 0.65 : 1 })}>
          <Icon name="users" size={16} color={colors.white} />
          <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.white, fontSize: 12, fontWeight: '700' }}>{post.group.name}</Text>
        </Pressable>
        <View style={{ width: 1, height: 18, backgroundColor: '#FFFFFF99' }} />
        {badge(true, true)}
      </View>
    </Pressable>
    <View style={{ padding: 18, backgroundColor: colors.white, gap: 11 }}>
      <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel={`Read ${post.title || 'post'}`} onPress={() => router.push(`/posts/${post.id}`)} style={({ pressed }) => ({ gap: 8, opacity: pressed ? 0.65 : 1 })}>
        <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: colors.yellow }} />
        {post.title ? <Text numberOfLines={2} style={{ color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.5 }}>{post.title}</Text> : null}
        {post.text ? <Text numberOfLines={3} style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>{post.text}</Text> : null}
      </Pressable>
      {footer()}
    </View>
    {postMenu}
  </View>;

  if (presentation === 'card' && !detail && post.category === 'atelier') return <View style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 18, opacity: deleting ? 0.55 : 1 }}>
    <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel={`Read ${post.title || 'post'}`} onPress={() => router.push(`/posts/${post.id}`)} style={({ pressed }) => ({ borderRadius: 28, overflow: 'hidden', backgroundColor: colors.primaryTint, transform: [{ rotate: atelierTilt }], opacity: pressed ? 0.82 : 1 })}>
      {post.media.length ? <MediaGallery media={post.media} postId={post.id} visible={visible} overrides={mediaOverrides} interactive={false} largeRadius fixedHeight={232} /> : <CategoryArtwork category={post.category} height={232} />}
    </Pressable>
    <View style={{ marginTop: -28, borderRadius: 28, padding: 18, paddingTop: 16, backgroundColor: colors.white, boxShadow: '0 10px 28px #32323212', gap: 12 }}>
      <View style={{ alignSelf: 'flex-start', marginTop: -34, padding: 6, paddingRight: 12, borderRadius: 22, backgroundColor: colors.white, boxShadow: '0 5px 16px #32323212' }}>{groupLine(false, 30)}</View>
      <View style={styles.between}>{badge()}<Icon name="tool" size={19} color={colors.primary} /></View>
      <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel={`Read ${post.title || 'post'}`} onPress={() => router.push(`/posts/${post.id}`)} style={{ gap: 6 }}>
        {post.title ? <Text numberOfLines={2} style={[styles.heading, { fontSize: 20 }]}>{post.title}</Text> : null}
        {post.text ? <Text numberOfLines={3} style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>{post.text}</Text> : null}
      </Pressable>
      {footer()}
    </View>
    {postMenu}
  </View>;

  if (presentation === 'card' && !detail && post.category === 'installation') return <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 18, minHeight: 500, borderRadius: 30, overflow: 'hidden', backgroundColor: colors.green, boxShadow: '0 10px 30px #17351B22', opacity: deleting ? 0.55 : 1 }}>
    <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel={`Read ${post.title || 'post'}`} onPress={() => router.push(`/posts/${post.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
      {post.media.length ? <MediaGallery media={post.media} postId={post.id} visible={visible} overrides={mediaOverrides} interactive={false} largeRadius fixedHeight={500} cover /> : <CategoryArtwork category={post.category} height={500} immersive />}
    </Pressable>
    <MaskedView
      pointerEvents="none"
      androidRenderingMode="software"
      maskElement={<LinearGradient colors={['transparent', 'transparent', '#00000036', '#000000A8', '#000000']} locations={[0, 0.55, 0.68, 0.84, 1]} style={{ flex: 1 }} />}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <BlurView intensity={52} tint="default" style={{ flex: 1 }} />
    </MaskedView>
    <LinearGradient pointerEvents="none" colors={['transparent', 'transparent', '#00000020', '#00000066', '#0000009E']} locations={[0, 0.54, 0.7, 0.86, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingTop: 24, gap: 10 }}>
      <View style={styles.between}>{groupLine(true, 30)}{badge(true)}</View>
      <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel={`Read ${post.title || 'post'}`} onPress={() => router.push(`/posts/${post.id}`)} style={{ gap: 5 }}>
        {post.title ? <Text numberOfLines={2} style={{ color: colors.white, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 }}>{post.title}</Text> : null}
        {post.text ? <Text numberOfLines={2} style={{ color: '#FFFFFFD8', fontSize: 13, lineHeight: 19 }}>{post.text}</Text> : null}
      </Pressable>
      {footer(true)}
    </View>
    {postMenu}
  </View>;

  if (presentation === 'card' && !detail && post.category === 'jeux') return <View style={{ marginHorizontal: 16, marginTop: 11, marginBottom: 17, minHeight: 216, flexDirection: 'row', borderRadius: 27, overflow: 'hidden', backgroundColor: colors.white, boxShadow: '0 8px 26px #32323210', opacity: deleting ? 0.55 : 1 }}>
    <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel={`Read ${post.title || 'post'}`} onPress={() => router.push(`/posts/${post.id}`)} style={({ pressed }) => ({ width: '38%', minHeight: 216, backgroundColor: colors.yellowTint, opacity: pressed ? 0.82 : 1 })}>
      {post.media.length ? <MediaGallery media={post.media} postId={post.id} visible={visible} overrides={mediaOverrides} interactive={false} fixedHeight={216} /> : <CategoryArtwork category={post.category} height={216} />}
    </Pressable>
    <View style={{ flex: 1, minWidth: 0, padding: 15, gap: 9 }}>
      {groupLine(false, 27)}
      {badge()}
      <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel={`Read ${post.title || 'post'}`} onPress={() => router.push(`/posts/${post.id}`)} style={{ flex: 1, gap: 5 }}>
        {post.title ? <Text numberOfLines={2} style={{ color: colors.ink, fontSize: 17, lineHeight: 22, fontWeight: '700' }}>{post.title}</Text> : null}
        {post.text ? <Text numberOfLines={3} style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{post.text}</Text> : null}
      </Pressable>
      {footer(false, true)}
    </View>
    {postMenu}
  </View>;
  return <View style={{ paddingHorizontal: 20, paddingTop: 21, paddingBottom: 14, backgroundColor: detail ? colors.canvas : colors.white, gap: 15, opacity: deleting ? 0.55 : 1 }}>
    <View style={[styles.row, { gap: 10 }]}>
      <Pressable disabled={preview} accessibilityRole="button" accessibilityLabel="Open group profile" onPress={() => openPostGroup(post.group.id)}><Avatar media={post.group.logo} name={post.group.name} /></Pressable>
      <Pressable disabled={preview} accessibilityRole="button" onPress={() => openPostGroup(post.group.id)} style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 15, fontWeight: '600' }}>{post.group.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Icon name="calendar" size={14} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 12 }}>{date(post.publishedAt, detail)} <Text> · </Text>{categoryLabels[post.category]}</Text></View>
      </Pressable>
      {canManage && !preview && <IconButton icon="more-horizontal" label="Post options" onPress={() => setMenu(true)} disabled={deleting} />}
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
export function PostList({ query, header, emptyTitle, emptyBody, presentation = 'timeline', searchTerm = '' }: { query: UseInfiniteQueryResult<InfiniteData<FeedData>, Error>; header?: React.ReactElement; emptyTitle?: string; emptyBody?: string; presentation?: 'timeline' | 'card' | 'search'; searchTerm?: string }) {
  const tabBarScroll = useTabBarScroll();
  const [visible, setVisible] = useState(new Set<string>());
  const viewability = useRef(({ viewableItems }: { viewableItems: { item: Post }[] }) => setVisible(new Set(viewableItems.map(item => item.item.id)))).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const posts = useMemo(() => uniquePosts(query.data?.pages.map(page => page.posts) ?? []), [query.data?.pages]);
  return <FlatList data={posts} keyExtractor={post => post.id} extraData={visible} renderItem={({ item }) => <PostCard post={item} visible={visible.has(item.id)} presentation={presentation} searchTerm={searchTerm} />}
    {...tabBarScroll}
    onViewableItemsChanged={viewability} viewabilityConfig={viewabilityConfig}
    ItemSeparatorComponent={presentation === 'card' ? () => <View style={{ height: 10, justifyContent: 'center' }}><LinearGradient colors={['transparent', '#32323216', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ height: 1, marginHorizontal: 46 }} /></View> : undefined}
    ListHeaderComponent={header} style={presentation === 'card' || presentation === 'search' ? { backgroundColor: colors.canvas } : undefined} contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'ios' ? 124 : presentation === 'card' || presentation === 'search' ? 28 : 36 }}
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
