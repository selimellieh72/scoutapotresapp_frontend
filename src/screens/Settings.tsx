import React, { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api, session, usePreferences, useSession } from '../providers';
import { Avatar, Button, Header, Icon, Notice, Page, type IconName } from '../ui/components';
import { colors, styles } from '../ui/theme';
import { useDialog } from '../ui/dialog';
import { useTabBarScroll } from '../ui/tabBarScroll';

function SettingRow({ icon, title, subtitle, onPress, right }: { icon: IconName; title: string; subtitle?: string; onPress?: () => void; right?: React.ReactNode }) {
  const content = <><View style={{ backgroundColor: colors.paper, padding: 10, borderRadius: 12 }}><Icon name={icon} size={20} color={colors.primary} /></View><View style={{ flex: 1, gap: 3 }}><Text style={{ color: colors.ink, fontSize: 15, fontWeight: '500' }}>{title}</Text>{subtitle && <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{subtitle}</Text>}</View>{right ?? (onPress ? <Icon name="chevron-right" color={colors.muted} size={18} /> : null)}</>;
  const rowStyle = [styles.row, { minHeight: 62, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8, borderRadius: 18, backgroundColor: colors.white }];
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.65 : 1 }]}>{content}</Pressable> : <View style={rowStyle}>{content}</View>;
}
export function SettingsScreen() {
  const tabBarScroll = useTabBarScroll();
  const auth = useSession();
  const preferences = usePreferences();
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const info = useQuery({ queryKey: ['app-info'], queryFn: () => api.info() });
  const logout = async () => { setBusy(true); try { await session.logout(); dialog.toast('You’re signed out.'); } catch { dialog.toast('Signed out on this device.'); } finally { setBusy(false); } };
  const open = async (url: string) => { try { await Linking.openURL(url); } catch { dialog.toast('We couldn’t open this link.'); } };
  return <Page><Header title="Settings" subtitle="MAKE YOURSELF AT HOME" /><ScrollView {...tabBarScroll} contentContainerStyle={[styles.content, Platform.OS === 'ios' && { paddingBottom: 124 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Open group profile" onPress={() => router.push('/group')} style={[styles.card, styles.row]}><Avatar size={48} /><View style={{ flex: 1 }}><Text style={styles.heading}>Scout des Apôtres</Text><Text style={styles.muted}>A shared sense of adventure.</Text></View><Icon name="arrow-up-right" color={colors.primary} /></Pressable>
    <View><Text style={styles.eyebrow}>YOUR EXPERIENCE</Text>
      <SettingRow icon="globe" title="App language" right={<Text style={styles.muted}>English</Text>} />
      <SettingRow icon="play-circle" title="Autoplay videos" subtitle="Play visible videos muted" right={<Switch accessibilityLabel="Autoplay videos" value={preferences.autoplay} onValueChange={preferences.setAutoplay} trackColor={{ true: colors.primary, false: colors.line }} />} />
    </View><View style={styles.separator} />
    <View><Text style={styles.eyebrow}>THE GROUP</Text>
      <SettingRow icon="compass" title="About the app" onPress={() => router.push('/about')} />
      {info.data?.data.contactEmail && <SettingRow icon="mail" title="Contact" onPress={() => void open(`mailto:${info.data!.data.contactEmail}`)} />}
      {info.data?.data.privacyPolicyUrl && /^https?:\/\//.test(info.data.data.privacyPolicyUrl) && <SettingRow icon="shield" title="Privacy Policy" onPress={() => void open(info.data!.data.privacyPolicyUrl!)} />}
      {info.isError && <Notice>Some group information is temporarily unavailable.</Notice>}
    </View><View style={styles.separator} />
    <View style={{ gap: 8 }}><Text style={styles.eyebrow}>ADMIN SPACE</Text>
      {auth.status === 'admin' ? <>
        <View style={[styles.card, { marginTop: 10 }]}><Text style={styles.heading}>{auth.admin?.displayName}</Text><Text style={styles.muted}>{auth.admin?.email}</Text><Text style={[styles.eyebrow, { fontSize: 9 }]}>GROUP ADMIN</Text></View>
        <SettingRow icon="edit-3" title="Manage posts" onPress={() => router.push('/manage-posts')} />
        <SettingRow icon="image" title="Edit group profile" onPress={() => router.push('/edit-group')} />
        <Button title="Log out" variant="ghost" icon="log-out" busy={busy} onPress={() => void logout()} />
      </> : auth.status === 'restoring' ? <Text style={styles.muted}>Restoring your session…</Text> : auth.status === 'unverified' ? <><Notice>Connect to verify your admin session. You can keep browsing as a guest.</Notice><Button title="Retry session" variant="secondary" onPress={() => void session.restore()} /><Button title="Sign out on this device" variant="ghost" onPress={() => void logout()} /></> :
        <View style={{ gap: 14, paddingTop: 12 }}><Text style={styles.muted}>Keep the journal growing. Sign in to publish updates for the group.</Text><Button title="Admin login" icon="log-in" variant="secondary" onPress={() => router.push('/login')} /></View>}
    </View>
    <View style={{ alignItems: 'center', paddingTop: 20, gap: 7 }}><Icon name="compass" color={colors.green} size={22} /><Text style={{ color: colors.muted, fontSize: 11 }}>Scout des Apôtres · 0.1.0</Text></View>
  </ScrollView></Page>;
}
export function AboutScreen() {
  const info = useQuery({ queryKey: ['app-info'], queryFn: () => api.info() });
  return <Page><Header back title="About" /><ScrollView contentContainerStyle={[styles.content, { gap: 26 }]}><Avatar size={72} /><View style={{ gap: 12 }}><Text style={styles.eyebrow}>THE GROUP JOURNAL</Text><Text style={styles.title}>Scout des Apôtres</Text><Text style={styles.body}>{info.data?.data.about ?? 'Activities, ideas, and moments from our Scout group.'}</Text></View>{info.isError && <Button title="Retry loading group information" variant="secondary" onPress={() => void info.refetch()} />}</ScrollView></Page>;
}
