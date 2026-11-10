import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { api } from "../providers"
import type { Filters } from "../api/types"
import {
  demoGroups,
  filterDemoGroups,
  filterDemoPosts,
  findDemoGroup,
  findDemoPost,
  isDemoGroup,
} from "../demo/content"

const endPage = { nextCursor: null, hasMore: false }

type PostQueryOptions = {
  groupId?: string
  includeDemo?: boolean
}

export function usePosts(
  filters: Filters = {},
  { groupId, includeDemo = true }: PostQueryOptions = {},
) {
  return useInfiniteQuery({
    queryKey: ["posts", filters, groupId, includeDemo],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const demos = includeDemo && !pageParam
        ? filterDemoPosts(filters, groupId)
        : []

      if (groupId && isDemoGroup(groupId)) {
        return { posts: demos, page: endPage }
      }

      try {
        const result = await api.posts(filters, pageParam, signal)
        return { posts: [...result.data, ...demos], page: result.page }
      } catch (error) {
        if (demos.length) return { posts: demos, page: endPage }
        throw error
      }
    },
    getNextPageParam: last => last.page.hasMore
      ? last.page.nextCursor ?? undefined
      : undefined,
  })
}

export const useGroup = () => useQuery({
  queryKey: ["group"],
  queryFn: ({ signal }) => api.group(signal),
})

export const useGroups = () => useQuery({
  queryKey: ["groups"],
  queryFn: async ({ signal }) => {
    try {
      const result = await api.group(signal)
      return [result.data, ...demoGroups]
    } catch {
      return demoGroups
    }
  },
})

export const useGroupById = (id?: string) => useQuery({
  queryKey: ["group", id],
  queryFn: async ({ signal }) => {
    const demo = findDemoGroup(id)
    if (demo) return { data: demo }
    return api.group(signal)
  },
})

export const usePost = (id: string) => useQuery({
  queryKey: ["post", id],
  queryFn: ({ signal }) => {
    const demo = findDemoPost(id)
    return demo ? Promise.resolve({ data: demo }) : api.post(id, signal)
  },
  enabled: /^[a-f0-9]{24}$/i.test(id),
})

export function useSearch(filters: Filters) {
  const searching = Boolean(filters.q && filters.q.length >= 2)
  return useInfiniteQuery({
    queryKey: [searching ? "search" : "discover", filters],
    initialPageParam: undefined as string | undefined,
    enabled: !filters.q || searching,
    queryFn: async ({ pageParam, signal }) => {
      const demoPosts = pageParam ? [] : filterDemoPosts(filters)
      const groups = pageParam ? [] : filterDemoGroups(filters)

      try {
        if (searching) {
          const result = await api.search(filters, pageParam, signal)
          return {
            posts: [...result.data.posts, ...demoPosts],
            groups: [...result.data.groups, ...groups],
            page: result.page,
          }
        }
        const result = await api.discover(filters, pageParam, signal)
        return {
          posts: [...result.data.posts, ...demoPosts],
          groups: [result.data.group, ...groups],
          page: result.page,
        }
      } catch (error) {
        if (!pageParam && (demoPosts.length || groups.length)) {
          return { posts: demoPosts, groups, page: endPage }
        }
        throw error
      }
    },
    getNextPageParam: last => last.page.hasMore
      ? last.page.nextCursor ?? undefined
      : undefined,
  })
}
