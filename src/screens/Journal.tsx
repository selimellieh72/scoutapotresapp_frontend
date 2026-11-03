import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Avatar, Button, Chips, Empty, Header, Icon, Page, Skeleton } from '../ui/components';
import { colors, styles } from '../ui/theme';
import { CategoryFilters, CreateButton, PostList } from '../features/posts';
import { useGroup, usePosts, useSearch } from '../features/queries';
import { useSession } from '../providers';
import { http } from '../config';
import { copy } from '../copy';
import type { Category, Filters } from '../api/types';

export function HomeScreen() {
  const [category, setCategory] = useState<Category>();
  const group = useGroup();
  const posts = usePosts({ category });
  return <Page><Header title={copy.appName} subtitle={copy.journal.toUpperCase()} right={<Pressable accessibilityRole="button" accessibilityLabel="Open group profile" onPress={() => router.push('/group')}><Avatar media={group.data?.data.logo} size={38} /></Pressable>} />
    <CategoryFilters value={category} onChange={setCategory} />
    <PostList query={posts} emptyTitle={category ? `No ${categoryLabelsForEmpty(category)} yet` : undefined} emptyBody={category ? 'Try another category or come back for the next update.' : undefined} />
    <CreateButton />
  </Page>;
}
const categoryLabelsForEmpty = (category: Category) => ({ article: 'articles', atelier: 'ateliers', installation: 'installations', jeux: 'games' }[category]);

export function SearchScreen() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>();
  const [contentType, setType] = useState<Filters['contentType']>();
  useEffect(() => { const timer = setTimeout(() => setQuery(input.trim()), 350); return () => clearTimeout(timer); }, [input]);
  const results = useSearch({ q: query || undefined, category, contentType });
  const groups = results.data?.pages[0]?.groups ?? [];
  const header = <View style={{ gap: 18, padding: 20, paddingBottom: 0 }}>
    {!query && <View style={{ gap: 6 }}><Text style={styles.eyebrow}>EXPLORE THE JOURNAL</Text><Text style={styles.heading}>A little inspiration for the next adventure.</Text></View>}
    {groups.map(group => <Pressable accessibilityRole="button" accessibilityLabel="Open group profile" key={group.id} onPress={() => router.push('/group')} style={[styles.card, styles.row]}><Avatar media={group.logo} size={46} /><View style={{ flex: 1, gap: 3 }}><Text style={[styles.eyebrow, { fontSize: 9 }]}>OUR GROUP</Text><Text style={[styles.heading, { fontSize: 16 }]}>{group.name}</Text></View><Icon name="arrow-up-right" size={19} color={colors.primary} /></Pressable>)}
    <Text style={styles.eyebrow}>{query ? 'POSTS' : 'RECENT STORIES'}</Text>
  </View>;
  return <Page><Header title="Search" subtitle="FIND SOMETHING GOOD" />
    <View style={{ paddingHorizontal: 20, paddingTop: 18 }}><View style={[styles.row, styles.field, { paddingVertical: 0 }]}><Icon name="search" size={20} color={colors.muted} />
      <TextInput accessibilityLabel="Search posts and group" placeholder="Search the journal" placeholderTextColor={colors.muted} value={input} maxLength={200} onChangeText={setInput} returnKeyType="search" onSubmitEditing={() => setQuery(input.trim())} style={{ flex: 1, minHeight: 48, color: colors.ink, fontSize: 16 }} />
      {input ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setInput(''); setQuery(''); }} style={{ minWidth: 32, minHeight: 44, justifyContent: 'center' }}><Icon name="x" size={18} /></Pressable> : null}
    </View></View>
    <CategoryFilters value={category} onChange={setCategory} />
    <Chips options={[{ value: '', label: 'All formats' }, { value: 'text', label: 'Text' }, { value: 'image', label: 'Images' }, { value: 'video', label: 'Videos' }]} value={contentType ?? ''} onChange={value => setType(value ? value as Filters['contentType'] : undefined)} />
    {input.trim().length === 1 ? <Empty title="Keep going…" message="Enter at least two characters to search." icon="search" /> : input.trim() !== query ? <Skeleton /> :
      <PostList query={results} header={header} emptyTitle={query ? 'No stories found' : undefined} emptyBody={query ? 'Try another phrase or a different filter.' : undefined} />}
  </Page>;
}

export function GroupScreen() {
  const auth = useSession();
  const group = useGroup();
  const [tab, setTab] = useState('posts');
  const [category, setCategory] = useState<Category>();
  const posts = usePosts({ category, contentType: tab === 'videos' ? 'video' : undefined });
  const data = group.data?.data;
  const header = data ? <View>
    <View style={{ height: 156, backgroundColor: colors.yellowTint, alignItems: 'center', justifyContent: 'center' }}>
      {data.cover ? <Image source={http.mediaUrl(data.cover.url)} contentFit="cover" style={{ width: '100%', height: '100%' }} accessibilityLabel="Group cover" /> : <View style={{ alignItems: 'center', gap: 9 }}><Icon name="compass" size={44} color={colors.primary} /><Text style={[styles.eyebrow, { fontSize: 9 }]}>TOUJOURS PRÊTS</Text></View>}
    </View>
    <View style={{ padding: 24, paddingTop: 0, gap: 12 }}><View style={{ marginTop: -35, padding: 4, backgroundColor: 'white', borderRadius: 42, alignSelf: 'flex-start' }}><Avatar media={data.logo} size={72} /></View>
      <Text style={styles.eyebrow}>ONE GROUP. MANY ADVENTURES.</Text><Text style={styles.title}>{data.name}</Text>
      {data.description ? <Text style={styles.body}>{data.description}</Text> : null}
      {auth.status === 'admin' && <Button title="Edit group profile" icon="edit-2" variant="secondary" onPress={() => router.push('/edit-group')} />}
    </View>
    <Chips options={[{ value: 'posts', label: 'Posts' }, { value: 'videos', label: 'Videos' }]} value={tab} onChange={setTab} />
    <CategoryFilters value={category} onChange={setCategory} />
  </View> : undefined;
  return <Page><Header back title="Our group" />{group.isPending ? <Skeleton /> : group.isError ? <Empty title={copy.errorTitle} message={copy.errorBody} retry={() => void group.refetch()} /> : <PostList query={posts} header={header} emptyTitle={tab === 'videos' ? 'No videos yet' : undefined} emptyBody={tab === 'videos' ? 'The next adventure might be a moving one.' : undefined} />}</Page>;
}

export function ManagePostsScreen() {
  const [category, setCategory] = useState<Category>();
  const posts = usePosts({ category });
  return <Page><Header back title="Group posts" right={<Button title="New post" icon="plus" onPress={() => router.push('/compose')} />} />
    <CategoryFilters value={category} onChange={setCategory} /><PostList query={posts} /><CreateButton />
  </Page>;
}
