import React, { useEffect, useRef, useState } from "react"
import { Linking, Modal, ScrollView, Text, View } from "react-native"
import { Image } from "expo-image"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { api, invalidateContent } from "../providers"
import { ApiError, userMessage } from "../api/http"
import {
  categoryLabels,
  type Category,
  type Media,
  type Post,
} from "../api/types"
import { useGroup } from "../features/queries"
import { CategoryFilters, PostCard } from "../features/posts"
import {
  cleanupAttachments,
  existingAttachment,
  pickAttachments,
  uploadAttachment,
  type Attachment,
} from "../features/attachments"
import { useDiscardGuard } from "../features/form"
import { validatePost } from "../domain/validation"
import {
  Button,
  Empty,
  Field,
  FormBody,
  Header,
  IconButton,
  Notice,
  Page,
  Skeleton,
} from "../ui/components"
import { colors, styles } from "../ui/theme"

export function ComposerScreen() {
  const params = useLocalSearchParams<{ postId?: string }>()
  const postId =
    typeof params.postId === "string" ? params.postId : undefined
  const validId = !postId || /^[a-f0-9]{24}$/i.test(postId)
  const existing = useQuery({
    queryKey: ["post", postId, "editor"],
    enabled: Boolean(postId && validId),
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: () => api.post(postId!),
  })
  const group = useGroup()
  const [category, setCategory] = useState<Category>("article")
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [items, setItems] = useState<Attachment[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [ambiguous, setAmbiguous] = useState(false)
  const [preview, setPreview] = useState(false)
  const [complete, setComplete] = useState("")
  const initialized = useRef(false)
  const submitting = useRef(false)
  const baseline = useRef("")
  const current = JSON.stringify([
    category,
    title,
    text,
    items.map((item) => item.media?.id ?? item.key),
  ])
  useEffect(() => {
    if (!postId && !initialized.current) {
      baseline.current = current
      initialized.current = true
    }
    if (
      postId &&
      existing.data &&
      !existing.isFetching &&
      !initialized.current
    ) {
      const post = existing.data.data
      const attachments = post.media.map(existingAttachment)
      setCategory(post.category)
      setTitle(post.title)
      setText(post.text)
      setItems(attachments)
      baseline.current = JSON.stringify([
        post.category,
        post.title,
        post.text,
        attachments.map((item) => item.media!.id),
      ])
      initialized.current = true
    }
  }, [postId, existing.data, existing.isFetching, current])
  useDiscardGuard(
    initialized.current && current !== baseline.current && !complete,
    busy,
    () => cleanupAttachments(items),
  )
  useEffect(() => {
    if (complete) router.replace(`/posts/${complete}`)
  }, [complete])
  const add = async () => {
    setError("")
    try {
      const selected = await pickAttachments(10 - items.length)
      setItems((value) => [...value, ...selected])
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn’t open your photo library.",
      )
    }
  }
  const remove = (index: number) => {
    const removed = items[index]
    setItems(items.filter((_item, position) => position !== index))
    if (removed) void cleanupAttachments([removed])
  }
  const move = (index: number, offset: number) => {
    const next = [...items]
    const target = index + offset
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setItems(next)
  }
  const input = {
    category,
    title: title.trim(),
    text: text.trim(),
    mediaIds: items.map((item) => item.media?.id ?? item.key),
  }
  const save = async () => {
    if (submitting.current) return
    const invalid = validatePost(input)
    if (invalid) {
      setError(invalid)
      return
    }
    submitting.current = true
    setBusy(true)
    setError("")
    setAmbiguous(false)
    const working = [...items]
    try {
      for (let index = 0; index < working.length; index++) {
        const attachment = working[index]!
        if (attachment.media) continue
        working[index] = { ...attachment, state: "uploading" }
        setItems([...working])
        try {
          working[index] = await uploadAttachment(attachment)
          setItems([...working])
        } catch (caught) {
          working[index] = { ...attachment, state: "error" }
          setItems([...working])
          throw caught
        }
      }
      const body = {
        ...input,
        mediaIds: working.map((item) => item.media!.id),
      }
      const result = postId
        ? await api.editPost(postId, body)
        : await api.createPost(body)
      setComplete(result.data.id)
      void invalidateContent()
    } catch (caught) {
      if (caught instanceof ApiError && caught.ambiguous) {
        setAmbiguous(true)
        setError(
          "We couldn’t confirm the result. Check Group posts before publishing again. Your text is still here.",
        )
      } else
        setError(
          caught instanceof ApiError
            ? userMessage(caught)
            : caught instanceof Error
              ? caught.message
              : "We couldn’t save this post.",
        )
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  const previewMedia: Media[] = items.map(
    (item) =>
      item.media ?? {
        id: item.key,
        type: item.type,
        mimeType: item.mime,
        sizeBytes: item.size ?? 0,
        width: item.width,
        height: item.height,
        state: "ready",
        url: "/api/v1/media/local/file",
      },
  )
  const previewPost: Post = {
    id: postId ?? "000000000000000000000000",
    group: {
      id: group.data?.data.id ?? "000000000000000000000000",
      name: group.data?.data.name ?? "Groupe Scout des Apôtres",
      logo: group.data?.data.logo ?? null,
    },
    category,
    title,
    text,
    media: previewMedia,
    publishedAt:
      existing.data?.data.publishedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (!validId || (existing.isError && !initialized.current))
    return (
      <Page>
        <Header back title="Edit post" />
        <Empty
          title="Post unavailable"
          message="It may have been removed. Return to the journal to see the latest posts."
        />
      </Page>
    )
  if (postId && !initialized.current)
    return (
      <Page>
        <Header back title="Edit post" />
        <Skeleton />
      </Page>
    )
  return (
    <Page>
      <Header
        back
        title={postId ? "Edit post" : "New post"}
        subtitle="SOMETHING WORTH SHARING"
      />
      <FormBody>
        <View
          style={{ gap: 10 }}
          pointerEvents={busy ? "none" : "auto"}>
          <Text style={styles.label}>Category</Text>
          <CategoryFilters
            includeAll={false}
            value={category}
            presentation="strip"
            onChange={(value) => {
              if (value) setCategory(value)
            }}
          />
          <Text style={styles.muted}>
            Selected: {categoryLabels[category]}
          </Text>
        </View>
        <Field
          label="Title (optional)"
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          editable={!busy}
          placeholder="Give your story a title"
        />
        <View>
          <Field
            label="Post text"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={20_000}
            editable={!busy}
            placeholder="What has the group been up to?"
            style={{ minHeight: 190 }}
          />
          <Text
            style={[
              styles.muted,
              { textAlign: "right", fontSize: 11, marginTop: 7 },
            ]}>
            {text.length.toLocaleString()} / 20,000
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          <View style={styles.between}>
            <Text style={styles.label}>Photos & videos</Text>
            <Text style={styles.muted}>{items.length} / 10</Text>
          </View>
          {items.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.card,
                styles.row,
                { padding: 10, gap: 8 },
              ]}>
              {item.type === "image" ? (
                <Image
                  source={item.uri}
                  style={{ width: 54, height: 54, borderRadius: 8 }}
                  contentFit="cover"
                  accessibilityLabel={`Attachment ${index + 1}`}
                />
              ) : (
                <View style={{ width: 54 }}>
                  <Text style={styles.eyebrow}>VIDEO</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 12, color: colors.ink }}>
                  {item.name}
                </Text>
                <Text style={[styles.muted, { fontSize: 11 }]}>
                  {item.state === "uploading"
                    ? "Uploading…"
                    : item.state === "error"
                      ? "Upload failed · retry with Publish"
                      : item.media
                        ? "Ready"
                        : "Selected"}
                </Text>
              </View>
              <IconButton
                icon="arrow-up"
                label={`Move attachment ${index + 1} earlier`}
                disabled={busy || index === 0}
                onPress={() => move(index, -1)}
              />
              <IconButton
                icon="arrow-down"
                label={`Move attachment ${index + 1} later`}
                disabled={busy || index === items.length - 1}
                onPress={() => move(index, 1)}
              />
              <IconButton
                icon="x"
                label={`Remove attachment ${index + 1}`}
                disabled={busy}
                onPress={() => remove(index)}
              />
            </View>
          ))}
          <Button
            title="Add photos or videos"
            icon="image"
            variant="secondary"
            disabled={busy || items.length >= 10}
            onPress={() => void add()}
          />
        </View>
        {error ? <Notice error>{error}</Notice> : null}
        {ambiguous && (
          <Button
            title="Check Group posts"
            variant="secondary"
            onPress={() => router.push("/manage-posts")}
          />
        )}
        <Button
          title="Preview post"
          icon="eye"
          variant="secondary"
          disabled={busy}
          onPress={() => {
            const invalid = validatePost(input)
            if (invalid) setError(invalid)
            else setPreview(true)
          }}
        />
        <Button
          title={postId ? "Save changes" : "Publish post"}
          icon="arrow-up-right"
          busy={busy}
          onPress={() => void save()}
        />
        {Boolean(error) && /permission|library/i.test(error) && (
          <Button
            title="Open device settings"
            variant="ghost"
            onPress={() => void Linking.openSettings()}
          />
        )}
      </FormBody>
      <Modal
        visible={preview}
        animationType="slide"
        onRequestClose={() => setPreview(false)}>
        <Page>
          <Header
            title="Post preview"
            subtitle="NOT PUBLISHED"
            right={
              <IconButton
                icon="x"
                label="Close preview"
                onPress={() => setPreview(false)}
              />
            }
          />
          <ScrollView>
            <PostCard
              post={previewPost}
              detail
              preview
              mediaOverrides={Object.fromEntries(
                items.map((item, index) => [
                  previewMedia[index]!.id,
                  item.uri,
                ]),
              )}
            />
          </ScrollView>
          <View style={{ padding: 20 }}>
            <Button
              title="Back to editing"
              onPress={() => setPreview(false)}
            />
          </View>
        </Page>
      </Modal>
    </Page>
  )
}
