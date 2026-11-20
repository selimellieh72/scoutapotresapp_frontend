import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { session, useSession } from '../providers';
import { useGroupById } from '../features/queries';
import { http } from '../config';
import { Avatar, Button, Empty, Header, Icon, Notice, Page, Skeleton } from '../ui/components';
import { themeModes, useTheme } from '../ui/theme';
import { useDialog } from '../ui/dialog';
import { useTabBarScroll } from '../ui/tabBarScroll';

function AppearanceSetting() {
  const { colors, styles, mode, setMode } = useTheme();
  return <View style={{ gap: 10 }}>
    <Text style={styles.label}>Appearance</Text>
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', padding: 4, gap: 4, borderRadius: 16, backgroundColor: colors.paper }}>
      {themeModes.map(option => {
        const selected = option.value === mode;
        return <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={`${option.label} appearance`} accessibilityState={{ selected, checked: selected }} onPress={() => setMode(option.value)}
          style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7,
            backgroundColor: selected ? colors.surface : 'transparent', boxShadow: selected ? '0 3px 10px #3232321A' : undefined, opacity: pressed ? 0.7 : 1 })}>
          <Icon name={option.value === 'system' ? 'smartphone' : option.value === 'light' ? 'sun' : 'moon'} size={16} color={selected ? colors.primary : colors.muted} />
          <Text style={{ color: selected ? colors.ink : colors.muted, fontSize: 14, fontWeight: selected ? '600' : '500' }}>{option.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

export function SettingsScreen() {
  const { colors, styles } = useTheme();
  const tabBarScroll = useTabBarScroll();
  const auth = useSession();
  const group = useGroupById(auth.group?.id);
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    setBusy(true);
    try { await session.logout(); dialog.toast('You’re signed out.'); }
    catch { dialog.toast('Signed out on this device.'); }
    finally { setBusy(false); }
  };

  if (auth.status === 'restoring') return <Page><Header title="Profile" /><Skeleton /></Page>;

  if (auth.status === 'unverified') return <Page><Header title="Profile" />
    <View style={styles.content}>
      <Notice>Connect to verify your group session.</Notice>
      <Button title="Retry session" variant="secondary" onPress={() => void session.restore()} />
      <Button title="Sign out on this device" variant="ghost" onPress={() => void logout()} />
      <AppearanceSetting />
    </View>
  </Page>;

  if (auth.status !== 'group' || !auth.group) return <Page><Header title="Profile" />
    <View style={[styles.content, { flex: 1, justifyContent: 'center' }]}>
      <Button title="Group login" icon="log-in" onPress={() => router.push('/login')} />
    </View>
    <View style={[styles.content, { paddingBottom: Platform.OS === 'ios' ? 124 : 36 }]}><AppearanceSetting /></View>
  </Page>;

  if (group.isPending) return <Page><Header title="Profile" /><Skeleton /></Page>;
  if (group.isError || !group.data?.data) return <Page><Header title="Profile" />
    <Empty title="Profile unavailable" message="We couldn’t load your group profile." retry={() => void group.refetch()} />
    <View style={styles.content}><AppearanceSetting /></View>
  </Page>;

  const profile = group.data.data;
  const account = auth.group;
  return <Page><Header title="Profile" subtitle="YOUR GROUP ACCOUNT" />
    <ScrollView {...tabBarScroll} contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 124 : 40 }}>
      <View style={{ height: 210, backgroundColor: colors.yellowTint, alignItems: 'center', justifyContent: 'center' }}>
        {profile.cover ? <Image source={http.mediaUrl(profile.cover.url)} contentFit="cover" style={{ width: '100%', height: '100%' }} accessibilityLabel="Group cover" /> :
          <Icon name="compass" size={52} color={colors.primary} />}
      </View>
      <View style={{ padding: 24, paddingTop: 0, gap: 16 }}>
        <View style={{ marginTop: -44, padding: 4, backgroundColor: colors.surface, borderRadius: 50, alignSelf: 'flex-start' }}>
          <Avatar media={profile.logo} name={profile.name} size={84} />
        </View>
        <View style={{ gap: 5 }}>
          <Text style={styles.title}>{profile.name}</Text>
          <Text style={styles.muted}>@{account.username}</Text>
        </View>
        {profile.description ? <Text style={styles.body}>{profile.description}</Text> : null}
        <View style={{ gap: 10, paddingTop: 4 }}>
          <Button title="Edit group profile" icon="edit-2" onPress={() => router.push('/edit-group')} />
          <Button title="Manage posts" icon="edit-3" variant="secondary" onPress={() => router.push('/manage-posts')} />
          <Button title="Log out" icon="log-out" variant="ghost" busy={busy} onPress={() => void logout()} />
        </View>
        <AppearanceSetting />
      </View>
    </ScrollView>
  </Page>;
}
