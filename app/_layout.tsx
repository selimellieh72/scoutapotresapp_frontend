import React from "react"
import { View } from "react-native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { Providers } from "../src/providers"
import { useTheme } from "../src/ui/theme"

const BrandStripe = () => {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: "row", height: 4 }}>
      <View style={{ flex: 1, backgroundColor: colors.yellow }} />
      <View style={{ flex: 1, backgroundColor: colors.brandGreen }} />
      <View style={{ flex: 1, backgroundColor: colors.primary }} />
    </View>
  )
}

function AppShell() {
  const { colors, scheme } = useTheme()
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 720,
          alignSelf: "center",
          backgroundColor: colors.canvas,
        }}>
        <BrandStripe />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.canvas },
          }}
        />
        <BrandStripe />
      </View>
    </>
  )
}

export default function RootLayout() {
  return (
    <Providers>
      <AppShell />
    </Providers>
  )
}
