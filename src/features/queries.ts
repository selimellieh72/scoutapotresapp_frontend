import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../providers';
import type { Filters } from '../api/types';

export function usePosts(filters: Filters = {}) {
  return useInfiniteQuery({
    queryKey: ['posts', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.posts(filters, pageParam, signal);
      return { posts: result.data, page: result.page };
    },
    getNextPageParam: last => last.page.hasMore ? last.page.nextCursor ?? undefined : undefined,
  });
}

export function useMyPosts(filters: Filters = {}) {
  return useInfiniteQuery({
    queryKey: ['my-posts', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.myPosts(filters, pageParam, signal);
      return { posts: result.data, page: result.page };
    },
    getNextPageParam: last => last.page.hasMore ? last.page.nextCursor ?? undefined : undefined,
  });
}

export const useGroups = () => useQuery({
  queryKey: ['groups'],
  queryFn: ({ signal }) => api.groups(signal).then(result => result.data),
});

export const useGroupById = (id?: string) => useQuery({
  queryKey: ['group', id],
  queryFn: ({ signal }) => api.group(id!, signal),
  enabled: Boolean(id && /^[a-f0-9]{24}$/i.test(id)),
});

export const usePost = (id: string) => useQuery({
  queryKey: ['post', id],
  queryFn: ({ signal }) => api.post(id, signal),
  enabled: /^[a-f0-9]{24}$/i.test(id),
});

export function useSearch(filters: Filters) {
  const searching = Boolean(filters.q && filters.q.length >= 2);
  return useInfiniteQuery({
    queryKey: [searching ? 'search' : 'discover', filters],
    initialPageParam: undefined as string | undefined,
    enabled: !filters.q || searching,
    queryFn: async ({ pageParam, signal }) => {
      const result = searching
        ? await api.search(filters, pageParam, signal)
        : await api.discover(filters, pageParam, signal);
      return { posts: result.data.posts, groups: pageParam ? [] : result.data.groups, page: result.page };
    },
    getNextPageParam: last => last.page.hasMore ? last.page.nextCursor ?? undefined : undefined,
  });
}
