import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Providers } from '../src/providers';
import { colors } from '../src/ui/theme';

export default function RootLayout() {
  return <Providers><StatusBar style="dark" /><View style={{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', backgroundColor: colors.white }}><View style={{ flexDirection: 'row', height: 4 }}><View style={{ flex: 1, backgroundColor: colors.yellow }} /><View style={{ flex: 1, backgroundColor: colors.brandGreen }} /><View style={{ flex: 1, backgroundColor: colors.primary }} /></View><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }} /></View></Providers>;
}
