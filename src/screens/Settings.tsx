import React, { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { session, useSession } from '../providers';
import { useGroupById } from '../features/queries';
import { http, privacyPolicyUrl } from '../config';
import { Avatar, Button, Empty, Header, Icon, Notice, Page, Skeleton } from '../ui/components';
import { colors, styles } from '../ui/theme';
import { useDialog } from '../ui/dialog';
import { useTabBarScroll } from '../ui/tabBarScroll';

function PrivacyLink() {
  return <Pressable accessibilityRole="link" accessibilityLabel="Open the privacy policy" hitSlop={8}
    onPress={() => void Linking.openURL(privacyPolicyUrl)}
    style={({ pressed }) => ({ alignSelf: 'center', paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}>
    <Text style={[styles.muted, { textDecorationLine: 'underline' }]}>Privacy policy</Text>
  </Pressable>;
}

export function SettingsScreen() {
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
      <PrivacyLink />
    </View>
  </Page>;

  if (auth.status !== 'group' || !auth.group) return <Page><Header title="Profile" />
    <View style={[styles.content, { flex: 1, justifyContent: 'center' }]}>
      <Button title="Group login" icon="log-in" onPress={() => router.push('/login')} />
      <PrivacyLink />
    </View>
  </Page>;

  if (group.isPending) return <Page><Header title="Profile" /><Skeleton /></Page>;
  if (group.isError || !group.data?.data) return <Page><Header title="Profile" />
    <Empty title="Profile unavailable" message="We couldn’t load your group profile." retry={() => void group.refetch()} />
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
        <View style={{ marginTop: -44, padding: 4, backgroundColor: colors.white, borderRadius: 50, alignSelf: 'flex-start' }}>
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
        <PrivacyLink />
      </View>
    </ScrollView>
  </Page>;
}
