import React, { type ComponentProps } from "react"
import { Pressable, View } from "react-native"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import type { BottomTabBarProps } from "expo-router/js-tabs"
import { colors } from "./theme"

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"]

const tabs: Record<
  string,
  { label: string; active: IconName; inactive: IconName }
> = {
  index: { label: "Home", active: "home", inactive: "home-outline" },
  search: {
    label: "Search",
    active: "compass",
    inactive: "compass-outline",
  },
  settings: {
    label: "Settings",
    active: "cog",
    inactive: "cog-outline",
  },
}

export function BottomTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const bottomSpace = Math.max(10, insets.bottom)

  return (
    <View
      style={{
        backgroundColor: colors.navigation,
        boxShadow: "0 -4px 18px #3232320D",
      }}>
      <View
        accessibilityRole="tablist"
        style={{
          height: 68,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 22,
        }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index
          const config = tabs[route.name] ?? {
            label:
              descriptors[route.key]?.options.title ?? route.name,
            active: "circle",
            inactive: "circle-outline",
          }
          const onPress = () => {
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            })
            if (!focused && !event.defaultPrevented)
              navigateToTab(route.key)
          }
          const onLongPress = () =>
            emitter.emit({ type: "tabLongPress", target: route.key })

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={config.label}
              accessibilityState={{ selected: focused }}
              aria-selected={focused}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => ({
                flex: 1,
                height: 68,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.55 : 1,
              })}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <MaterialCommunityIcons
                  name={focused ? config.active : config.inactive}
                  size={32}
                  color={focused ? colors.primary : colors.muted}
                />
              </View>
            </Pressable>
          )
        })}
      </View>
      {/* <View
        style={{
          height: bottomSpace,
          backgroundColor: colors.canvas,
        }}
      /> */}
    </View>
  )
}
