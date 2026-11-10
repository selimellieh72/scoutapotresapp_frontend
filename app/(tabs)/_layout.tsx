import React from "react"
import { Tabs } from "expo-router/js-tabs"
import { BottomTabBar } from "../../src/ui/BottomTabBar"
import { TabBarScrollProvider } from "../../src/ui/tabBarScroll"

export default function TabsLayout() {
  return (
    <TabBarScrollProvider>
      <Tabs
        tabBar={(props) => <BottomTabBar {...props} />}
        screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="search" options={{ title: "Search" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      </Tabs>
    </TabBarScrollProvider>
  )
}
