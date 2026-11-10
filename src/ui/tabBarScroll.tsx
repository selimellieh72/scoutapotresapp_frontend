import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native"

type TabBarScrollContextValue = {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

const TabBarScrollContext = createContext<TabBarScrollContextValue>({
  collapsed: false,
  setCollapsed: () => undefined,
})

export function TabBarScrollProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const value = useMemo(() => ({ collapsed, setCollapsed }), [collapsed])

  return (
    <TabBarScrollContext.Provider value={value}>
      {children}
    </TabBarScrollContext.Provider>
  )
}

export function useTabBarState() {
  return useContext(TabBarScrollContext)
}

export function useTabBarScroll() {
  const { collapsed, setCollapsed } = useTabBarState()
  const lastOffset = useRef(0)
  const direction = useRef<-1 | 0 | 1>(0)
  const distance = useRef(0)

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS !== "ios") return

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
      const offset = Math.max(0, contentOffset.y)
      const delta = offset - lastOffset.current
      lastOffset.current = offset

      if (offset <= 10) {
        direction.current = 0
        distance.current = 0
        if (collapsed) setCollapsed(false)
        return
      }

      if (Math.abs(delta) < 0.75) return

      const nextDirection: -1 | 1 = delta > 0 ? 1 : -1
      const distanceFromBottom = Math.max(
        0,
        contentSize.height - layoutMeasurement.height - offset,
      )

      // Do not treat the natural rebound at the bottom as an upward gesture.
      if (nextDirection === -1 && distanceFromBottom < 30) {
        direction.current = 0
        distance.current = 0
        return
      }

      if (nextDirection !== direction.current) {
        direction.current = nextDirection
        distance.current = 0
      }
      distance.current += Math.abs(delta)

      if (nextDirection === 1 && !collapsed && distance.current >= 30) {
        setCollapsed(true)
        distance.current = 0
      } else if (nextDirection === -1 && collapsed && distance.current >= 24) {
        setCollapsed(false)
        distance.current = 0
      }
    },
    [collapsed, setCollapsed],
  )

  return Platform.OS === "ios"
    ? { onScroll, scrollEventThrottle: 16 as const }
    : {}
}
