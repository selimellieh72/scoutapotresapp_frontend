import React, { useState } from "react"
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  Avatar,
  Button,
  Chips,
  Empty,
  Header,
  Icon,
  Page,
  Skeleton,
} from "../ui/components"
import { colors, styles } from "../ui/theme"
import { useTabBarScroll } from "../ui/tabBarScroll"
import {
  CategoryFilters,
  CreateButton,
  HighlightedText,
  PostList,
} from "../features/posts"
import { useGroupById, useGroups, usePosts, useSearch } from "../features/queries"
import { useSession } from "../providers"
import { http } from "../config"
import { copy } from "../copy"
import type { Category, Group } from "../api/types"
import { isDemoGroup } from "../demo/content"

const openGroup = (group: Group) => {
  if (isDemoGroup(group.id)) {
    router.push({ pathname: "/groups/[id]", params: { id: group.id } })
  } else {
    router.push("/group")
  }
}

export function HomeScreen() {
  const insets = useSafeAreaInsets()
  const groups = useGroups()
  const posts = usePosts()
  const auth = useSession()
  const groupData = groups.data?.[0]
  const groupStories = groups.data ?? []
  const header = (
    <View style={{ paddingTop: Platform.OS === "ios" ? insets.top + 4 : 4, paddingBottom: 4 }}>
        <View
          style={[
            styles.between,
            { minHeight: 46, paddingHorizontal: 20 },
          ]}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: colors.ink,
              fontSize: 24,
              lineHeight: 30,
              fontWeight: "700",
              letterSpacing: -0.7,
            }}>
            Chikirlik
          </Text>
          {auth.status === "admin" ? (
            <View style={[styles.row, { gap: 8 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create post"
                onPress={() => router.push("/compose")}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Icon name="plus" size={21} color={colors.white} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open group profile"
                onPress={() => groupData ? openGroup(groupData) : router.push("/group")}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Avatar media={groupData?.logo} name={groupData?.name} size={38} />
              </Pressable>
            </View>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: 5,
            gap: 14,
          }}>
          {groupStories.map(group => (
            <Pressable
              key={group.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${group.name}`}
              onPress={() => openGroup(group)}
              style={({ pressed }) => ({
                width: 70,
                alignItems: "center",
                gap: 5,
                opacity: pressed ? 0.68 : 1,
              })}>
              <View
                style={{
                  padding: 3,
                  borderRadius: 34,
                  backgroundColor: colors.primaryTint,
                }}>
                <Avatar media={group.logo} name={group.name} size={58} />
              </View>
              <Text
                numberOfLines={1}
                style={{
                  width: 70,
                  textAlign: "center",
                  color: colors.ink,
                  fontSize: 11,
                  fontWeight: "600",
                }}>
                {group.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
  )
  return (
    <Page backgroundColor={colors.canvas} safeTop={Platform.OS !== "ios"}>
      <PostList header={header} query={posts} presentation="card" />
    </Page>
  )
}

function GroupGrid({ groups, searchTerm = "" }: { groups: Group[]; searchTerm?: string }) {
  return (
    <View style={{ padding: 20, paddingTop: 16, gap: 13 }}>
      <Text style={styles.eyebrow}>GROUPS</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {groups.map((group) => (
          <Pressable
            key={group.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${group.name}`}
            onPress={() => openGroup(group)}
            style={({ pressed }) => [styles.card, { flexBasis: "47%", maxWidth: "48%", minHeight: 148, padding: 16, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.65 : 1 }]}>
            <Avatar media={group.logo} name={group.name} size={66} />
            <HighlightedText text={group.name} term={searchTerm} numberOfLines={2} style={{ color: colors.ink, fontSize: 14, lineHeight: 19, fontWeight: "600", textAlign: "center" }} />
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export function SearchScreen() {
  const tabBarScroll = useTabBarScroll()
  const [input, setInput] = useState("")
  const [query, setQuery] = useState("")
  const [searchMode, setSearchMode] = useState(false)
  const [category, setCategory] = useState<Category>()
  const results = useSearch({
    q: query || undefined,
    category,
  })
  const groups = results.data?.pages[0]?.groups ?? []
  return (
    <Page>
      {!searchMode && <Header title="Search" subtitle="FIND SOMETHING GOOD" />}
      <View style={{ paddingHorizontal: 20, paddingTop: searchMode ? 14 : 0 }}>
        <View style={[styles.row, { minHeight: 42, gap: 10, paddingHorizontal: 2 }]}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel="Search posts and group"
            placeholder="Search the journal"
            placeholderTextColor={colors.muted}
            value={input}
            maxLength={200}
            onFocus={() => setSearchMode(true)}
            onChangeText={(value) => {
              setInput(value)
              setQuery(value.trim())
            }}
            returnKeyType="search"
            style={{
              flex: 1,
              minHeight: 42,
              color: colors.ink,
              fontSize: 14,
            }}
          />
          {searchMode ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close search"
              onPress={() => {
                setInput("")
                setQuery("")
                setSearchMode(false)
                Keyboard.dismiss()
              }}
              style={{
                minWidth: 32,
                minHeight: 42,
                justifyContent: "center",
              }}>
              <Icon name="x" size={18} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <CategoryFilters value={category} onChange={setCategory} presentation="strip" />
      {searchMode ? query.length >= 2 ? (
        <PostList
          query={results}
          header={groups.length ? <GroupGrid groups={groups} searchTerm={query} /> : undefined}
          presentation="search"
          searchTerm={query}
          emptyTitle="No stories found"
          emptyBody="Try another phrase."
        />
      ) : <View style={{ flex: 1 }} /> : <>
        {results.isPending ? <Skeleton /> : results.isError ? <Empty title={copy.errorTitle} message={copy.errorBody} retry={() => void results.refetch()} icon="cloud-off" /> : <ScrollView {...tabBarScroll} contentContainerStyle={Platform.OS === "ios" ? { paddingBottom: 124 } : undefined}><GroupGrid groups={groups} /></ScrollView>}
      </>}
    </Page>
  )
}

export function GroupScreen({ groupId }: { groupId?: string } = {}) {
  const auth = useSession()
  const group = useGroupById(groupId)
  const [tab, setTab] = useState("posts")
  const [category, setCategory] = useState<Category>()
  const data = group.data?.data
  const posts = usePosts({
    category,
    contentType: tab === "videos" ? "video" : undefined,
  }, { groupId: groupId ?? data?.id, includeDemo: Boolean(groupId) })
  const header = data ? (
    <View>
      <View
        style={{
          height: 156,
          backgroundColor: colors.yellowTint,
          alignItems: "center",
          justifyContent: "center",
        }}>
        {data.cover ? (
          <Image
            source={http.mediaUrl(data.cover.url)}
            contentFit="cover"
            style={{ width: "100%", height: "100%" }}
            accessibilityLabel="Group cover"
          />
        ) : (
          <View style={{ alignItems: "center", gap: 9 }}>
            <Icon name="compass" size={44} color={colors.primary} />
            <Text style={[styles.eyebrow, { fontSize: 9 }]}>
              TOUJOURS PRÊTS
            </Text>
          </View>
        )}
      </View>
      <View style={{ padding: 24, paddingTop: 0, gap: 12 }}>
        <View
          style={{
            marginTop: -35,
            padding: 4,
            backgroundColor: "white",
            borderRadius: 42,
            alignSelf: "flex-start",
          }}>
          <Avatar media={data.logo} name={data.name} size={72} />
        </View>
        <Text style={styles.eyebrow}>
          ONE GROUP. MANY ADVENTURES.
        </Text>
        <Text style={styles.title}>{data.name}</Text>
        {data.description ? (
          <Text style={styles.body}>{data.description}</Text>
        ) : null}
        {auth.status === "admin" && !isDemoGroup(data.id) && (
          <Button
            title="Edit group profile"
            icon="edit-2"
            variant="secondary"
            onPress={() => router.push("/edit-group")}
          />
        )}
      </View>
      <Chips
        options={[
          { value: "posts", label: "Posts" },
          { value: "videos", label: "Videos" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <CategoryFilters
        value={category}
        onChange={setCategory}
        presentation="strip"
      />
    </View>
  ) : undefined
  return (
    <Page>
      <Header back title="Our group" />
      {group.isPending ? (
        <Skeleton />
      ) : group.isError ? (
        <Empty
          title={copy.errorTitle}
          message={copy.errorBody}
          retry={() => void group.refetch()}
        />
      ) : (
        <PostList
          query={posts}
          header={header}
          presentation="card"
          emptyTitle={tab === "videos" ? "No videos yet" : undefined}
          emptyBody={
            tab === "videos"
              ? "The next adventure might be a moving one."
              : undefined
          }
        />
      )}
    </Page>
  )
}

export function ManagePostsScreen() {
  const [category, setCategory] = useState<Category>()
  const posts = usePosts({ category }, { includeDemo: false })
  return (
    <Page>
      <Header
        back
        title="Group posts"
        right={
          <Button
            title="New post"
            icon="plus"
            onPress={() => router.push("/compose")}
          />
        }
      />
      <CategoryFilters
        value={category}
        onChange={setCategory}
        presentation="strip"
      />
      <PostList query={posts} presentation="card" />
      <CreateButton />
    </Page>
  )
}
