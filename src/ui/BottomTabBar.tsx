import React, { useEffect, useRef, useState, type ComponentProps } from "react"
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import type { BottomTabBarProps } from "expo-router/js-tabs"
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect"
import { colors } from "./theme"
import { useTabBarState } from "./tabBarScroll"

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
  if (Platform.OS === "ios") {
    return (
      <IOSBottomTabBar
        state={state}
        descriptors={descriptors}
        emitter={emitter}
        navigateToTab={navigateToTab}
        insets={insets}
      />
    )
  }

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

function IOSBottomTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const { width: screenWidth } = useWindowDimensions()
  const { collapsed, setCollapsed } = useTabBarState()
  const progress = useRef(new Animated.Value(0)).current
  const [reduceMotion, setReduceMotion] = useState(false)
  const [reduceTransparency, setReduceTransparency] = useState(false)

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    void AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency)
    const motionSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    )
    const transparencySubscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    )
    return () => {
      motionSubscription.remove()
      transparencySubscription.remove()
    }
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(collapsed ? 1 : 0)
      return
    }

    const animation = Animated.timing(progress, {
      toValue: collapsed ? 1 : 0,
      duration: collapsed ? 620 : 560,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    })
    animation.start()
    return () => animation.stop()
  }, [collapsed, progress, reduceMotion])

  const expandedWidth = Math.min(screenWidth - 32, 430)
  const collapsedWidth = Math.max(270, expandedWidth * 0.86)
  const bottomSpace = Math.max(10, insets.bottom)
  const glassAvailable =
    !reduceTransparency &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable()

  const animatedWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [expandedWidth, collapsedWidth],
  })
  const animatedHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [64, 56],
  })
  const animatedRadius = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 28],
  })
  const iconScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.9],
  })
  const verticalShift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  })

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        height: 76 + bottomSpace,
        paddingTop: 8,
        paddingBottom: bottomSpace,
        alignItems: "center",
        justifyContent: "flex-start",
        backgroundColor: "transparent",
      }}>
      <Animated.View
        style={{
          width: animatedWidth,
          height: animatedHeight,
          borderRadius: animatedRadius,
          borderCurve: "continuous",
          overflow: "hidden",
          backgroundColor: glassAvailable
            ? "rgba(255,255,255,0.06)"
            : reduceTransparency
              ? "rgba(250,249,247,0.98)"
              : "rgba(250,249,247,0.82)",
          boxShadow: "0 10px 30px #1D231C24",
          transform: [{ translateY: verticalShift }],
        }}>
        {glassAvailable ? (
          <GlassView
            colorScheme="light"
            glassEffectStyle={{
              style: collapsed ? "clear" : "regular",
              animate: !reduceMotion,
              animationDuration: collapsed ? 0.62 : 0.56,
            }}
            isInteractive
            tintColor="rgba(255,255,255,0.14)"
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View
          accessibilityRole="tablist"
          style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          {state.routes.map((route, index) => {
            const focused = state.index === index
            const config = tabs[route.name] ?? {
              label: descriptors[route.key]?.options.title ?? route.name,
              active: "circle",
              inactive: "circle-outline",
            }
            const onPress = () => {
              const event = emitter.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              })
              if (!event.defaultPrevented) {
                setCollapsed(false)
                if (!focused) navigateToTab(route.key)
              }
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
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.58 : 1,
                })}>
                <Animated.View
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: iconScale }],
                  }}>
                  <MaterialCommunityIcons
                    name={focused ? config.active : config.inactive}
                    size={32}
                    color={focused ? colors.primary : colors.muted}
                  />
                </Animated.View>
              </Pressable>
            )
          })}
        </View>
      </Animated.View>
    </View>
  )
}
