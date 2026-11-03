import React from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { Icon } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';
export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: 'white', borderTopColor: colors.line, minHeight: 68, paddingTop: 8, paddingBottom: 8 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Icon name="home" color={typeof color === 'string' ? color : colors.primary} /> }} />
    <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ color }) => <Icon name="search" color={typeof color === 'string' ? color : colors.primary} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Icon name="sliders" color={typeof color === 'string' ? color : colors.primary} /> }} />
  </Tabs>;
}
