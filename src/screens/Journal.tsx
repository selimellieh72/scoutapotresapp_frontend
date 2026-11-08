import React, { useState } from "react"
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
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
import {
  CategoryFilters,
  CreateButton,
  PostList,
} from "../features/posts"
import { useGroup, usePosts, useSearch } from "../features/queries"
import { useSession } from "../providers"
import { http } from "../config"
import { copy } from "../copy"
import type { Category, Filters } from "../api/types"

export function HomeScreen() {
  const group = useGroup()
  const posts = usePosts()
  const auth = useSession()
  const groupData = group.data?.data
  return (
    <Page backgroundColor={colors.canvas}>
      <View style={{ paddingTop: 4, paddingBottom: 4 }}>
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
                onPress={() => router.push("/group")}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Avatar media={groupData?.logo} size={38} />
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${groupData?.name ?? copy.appName}`}
            onPress={() => router.push("/group")}
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
              <Avatar media={groupData?.logo} size={58} />
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
              {groupData?.name ?? copy.appName}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
      <PostList query={posts} presentation="card" />
    </Page>
  )
}

export function SearchScreen() {
  const [input, setInput] = useState("")
  const [query, setQuery] = useState("")
  const [searchMode, setSearchMode] = useState(false)
  const [category, setCategory] = useState<Category>()
  const [contentType, setType] = useState<Filters["contentType"]>()
  const results = useSearch({
    q: query || undefined,
    category,
    contentType,
  })
  const groups = results.data?.pages[0]?.groups ?? []
  const groupResults = groups.map((group) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open group profile"
      key={group.id}
      onPress={() => router.push("/group")}
      style={[styles.card, styles.row]}>
      <Avatar media={group.logo} size={46} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.eyebrow, { fontSize: 9 }]}>OUR GROUP</Text>
        <Text style={[styles.heading, { fontSize: 16 }]}>{group.name}</Text>
      </View>
      <Icon name="arrow-up-right" size={19} color={colors.primary} />
    </Pressable>
  ))
  const header = (
    <View style={{ gap: 18, padding: 20, paddingBottom: 0 }}>
      {!query && (
        <View style={{ gap: 6 }}>
          <Text style={styles.eyebrow}>EXPLORE THE JOURNAL</Text>
          <Text style={styles.heading}>
            A little inspiration for the next adventure.
          </Text>
        </View>
      )}
      {groupResults}
      <Text style={styles.eyebrow}>
        {query ? "POSTS" : "RECENT STORIES"}
      </Text>
    </View>
  )
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
            onFocus={() => {
              setSearchMode(true)
              setCategory(undefined)
              setType(undefined)
            }}
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
      {searchMode ? query.length >= 2 ? (
        <PostList
          query={results}
          header={groupResults.length ? <View style={{ gap: 12, padding: 20, paddingBottom: 0 }}>{groupResults}</View> : undefined}
          presentation="card"
          emptyTitle="No stories found"
          emptyBody="Try another phrase."
        />
      ) : <View style={{ flex: 1 }} /> : <>
        <CategoryFilters value={category} onChange={setCategory} presentation="strip" />
        <Chips
          options={[
            { value: "", label: "All formats" },
            { value: "text", label: "Text" },
            { value: "image", label: "Images" },
            { value: "video", label: "Videos" },
          ]}
          value={contentType ?? ""}
          onChange={(value) => setType(value ? (value as Filters["contentType"]) : undefined)}
        />
        <PostList query={results} header={header} presentation="card" />
      </>}
    </Page>
  )
}

export function GroupScreen() {
  const auth = useSession()
  const group = useGroup()
  const [tab, setTab] = useState("posts")
  const [category, setCategory] = useState<Category>()
  const posts = usePosts({
    category,
    contentType: tab === "videos" ? "video" : undefined,
  })
  const data = group.data?.data
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
          <Avatar media={data.logo} size={72} />
        </View>
        <Text style={styles.eyebrow}>
          ONE GROUP. MANY ADVENTURES.
        </Text>
        <Text style={styles.title}>{data.name}</Text>
        {data.description ? (
          <Text style={styles.body}>{data.description}</Text>
        ) : null}
        {auth.status === "admin" && (
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
  const posts = usePosts({ category })
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
