import React, { type ComponentProps } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { colors, styles } from './theme';
import { copy } from '../copy';
import { http } from '../config';
import { useSession } from '../providers';
import type { Media } from '../api/types';
export type IconName = ComponentProps<typeof Feather>['name'];
export const Icon = ({ name, size = 22, color = colors.ink }: { name: IconName; size?: number; color?: ComponentProps<typeof Feather>['color'] }) => <Feather name={name} size={size} color={color} accessible={false} accessibilityElementsHidden aria-hidden />;
export function IconButton({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}><Icon name={icon} /></Pressable>;
}
export function Button({ title, onPress, busy, disabled, variant = 'primary', icon }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; icon?: IconName }) {
  const backgroundColor = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.softDanger : variant === 'secondary' ? colors.primaryTint : 'transparent';
  const color = variant === 'primary' ? colors.white : variant === 'danger' ? colors.danger : colors.primary;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: Boolean(disabled || busy), busy }} disabled={disabled || busy}
    onPress={onPress} style={({ pressed }) => ({ backgroundColor, minHeight: 48, borderRadius: 12, paddingHorizontal: 18,
      paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 })}>
    {busy ? <ActivityIndicator color={color} /> : icon ? <Icon name={icon} color={color} size={18} /> : null}
    <Text style={{ color, fontSize: 15, fontWeight: '600' }}>{title}</Text>
  </Pressable>;
}
export function Avatar({ media, size = 42 }: { media?: Media | null; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
    {media ? <Image source={http.mediaUrl(media.url)} style={{ width: size, height: size }} contentFit="cover" /> : <Text accessibilityLabel="Scout des Apôtres" style={{ color: 'white', fontSize: size * 0.32, fontWeight: '700', letterSpacing: 1 }}>SA</Text>}
  </View>;
}
export function Header({ title, back, right, subtitle }: { title: string; back?: boolean; right?: React.ReactNode; subtitle?: string }) {
  return <View style={{ paddingHorizontal: back ? 8 : 20, minHeight: 68, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.canvas }}>
    {back && <IconButton icon="arrow-left" label={copy.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />}
    <View style={{ flex: 1, paddingVertical: 12 }}>{subtitle && <Text style={[styles.eyebrow, { marginBottom: 5 }]}>{subtitle}</Text>}<Text numberOfLines={1} style={[styles.heading, { fontSize: 21 }]}>{title}</Text></View>
    {right}
  </View>;
}
export function Page({ children, backgroundColor }: { children: React.ReactNode; backgroundColor?: string }) {
  const focused = useIsFocused();
  return <SafeAreaView edges={['top']} style={[styles.page, backgroundColor ? { backgroundColor } : undefined]} pointerEvents={focused ? 'auto' : 'none'}
    aria-hidden={!focused} accessibilityElementsHidden={!focused} importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'}>{children}</SafeAreaView>;
}
export function FormBody({ children }: { children: React.ReactNode }) {
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>{children}</ScrollView></KeyboardAvoidingView>;
}
export function Field({ label, ...props }: ComponentProps<typeof TextInput> & { label: string }) {
  return <View><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#909589" {...props} style={[styles.field, props.multiline && { minHeight: 150, textAlignVertical: 'top' }, props.style]} /></View>;
}
export function Notice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <View accessibilityLiveRegion="polite" style={{ backgroundColor: error ? colors.softDanger : colors.greenTint, padding: 14, borderRadius: 12 }}><Text style={error ? styles.error : styles.muted}>{children}</Text></View>;
}
export function Empty({ title = copy.emptyTitle, message = copy.emptyBody, retry, icon = 'compass' }: { title?: string; message?: string; retry?: () => void; icon?: IconName }) {
  return <View style={{ padding: 32, paddingVertical: 54, gap: 14, alignItems: 'center' }}>
    <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint }}><Icon name={icon} color={colors.primary} size={28} /></View>
    <Text style={[styles.heading, { textAlign: 'center' }]}>{title}</Text><Text style={[styles.muted, { textAlign: 'center', maxWidth: 320 }]}>{message}</Text>
    {retry && <Button title={copy.retry} onPress={retry} variant="secondary" />}
  </View>;
}
export function Skeleton() { return <View accessibilityLabel="Loading posts" style={{ padding: 20, gap: 18 }}>
  {[1, 2, 3].map(i => <View key={i} style={{ gap: 12, paddingBottom: 28 }}><View style={styles.row}><View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.line }} /><View style={{ width: '55%', height: 15, borderRadius: 4, backgroundColor: colors.line }} /></View><View style={{ height: 12, width: '95%', backgroundColor: colors.paper }} /><View style={{ height: 12, width: '70%', backgroundColor: colors.paper }} /></View>)}
  </View>; }
export function AdminGate({ children }: { children: React.ReactNode }) {
  const auth = useSession();
  if (auth.status === 'restoring') return <Page><Header back title="Admin access" /><Skeleton /></Page>;
  if (auth.status !== 'admin') return <Page><Header back title="Admin access" /><Empty title="A place for the group’s admins" message="Sign in to publish updates and manage the journal." icon="lock" /><View style={{ padding: 24 }}><Button title="Admin login" onPress={() => router.push('/login')} /></View></Page>;
  return children;
}
export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0, maxHeight: 68 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, alignItems: 'center' }}>
    {options.map(option => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: option.value === value }} onPress={() => onChange(option.value)}
      style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 24, backgroundColor: value === option.value ? colors.primary : colors.paper, justifyContent: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: value === option.value ? 'white' : colors.muted }}>{option.label}</Text>
    </Pressable>)}
  </ScrollView>;
}
