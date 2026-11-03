import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useGroup } from '../features/queries';
import { cleanupAttachments, pickAttachments, uploadAttachment, type Attachment } from '../features/attachments';
import { useDiscardGuard } from '../features/form';
import { api, invalidateContent } from '../providers';
import { ApiError, userMessage } from '../api/http';
import { http } from '../config';
import { Button, Empty, Field, FormBody, Header, Notice, Page, Skeleton } from '../ui/components';
import { colors, styles } from '../ui/theme';

export function EditGroupScreen() {
  const query = useGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<Attachment | null>();
  const [cover, setCover] = useState<Attachment | null>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const initial = useRef<{ name: string; description: string } | null>(null);
  const submitting = useRef(false);
  useEffect(() => { if (query.data && !initial.current) { const group = query.data.data; initial.current = group; setName(group.name); setDescription(group.description); } }, [query.data]);
  const dirty = Boolean(initial.current && (name !== initial.current.name || description !== initial.current.description || logo !== undefined || cover !== undefined));
  useDiscardGuard(dirty && !complete, busy, () => cleanupAttachments([logo, cover].filter((item): item is Attachment => Boolean(item))));
  useEffect(() => { if (complete) router.replace('/group'); }, [complete]);
  const select = async (slot: 'logo' | 'cover') => {
    setError('');
    try { const picked = (await pickAttachments(1, true))[0]; if (!picked) return; const old = slot === 'logo' ? logo : cover; if (old) void cleanupAttachments([old]); (slot === 'logo' ? setLogo : setCover)(picked); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'We couldn’t open your photo library.'); }
  };
  const save = async () => {
    if (submitting.current) return;
    if (!name.trim()) { setError('Enter a group name.'); return; }
    submitting.current = true; setError(''); setBusy(true);
    try {
      let nextLogo = logo; let nextCover = cover;
      if (nextLogo) { nextLogo = await uploadAttachment(nextLogo); setLogo(nextLogo); }
      if (nextCover) { nextCover = await uploadAttachment(nextCover); setCover(nextCover); }
      await api.editGroup({ name: name.trim(), description: description.trim(),
        ...(nextLogo === undefined ? {} : { logoMediaId: nextLogo?.media?.id ?? null }),
        ...(nextCover === undefined ? {} : { coverMediaId: nextCover?.media?.id ?? null }) });
      setComplete(true); void invalidateContent();
    } catch (caught) { setError(caught instanceof ApiError && caught.ambiguous ? 'We couldn’t confirm the update. Check the group profile before saving again.' : userMessage(caught)); }
    finally { submitting.current = false; setBusy(false); }
  };
  if (!query.data) return <Page><Header back title="Edit group" />{query.isPending ? <Skeleton /> : <Empty title="Group information unavailable" retry={() => void query.refetch()} />}</Page>;
  const group = query.data.data;
  const imageField = (slot: 'logo' | 'cover', selected: Attachment | null | undefined) => {
    const existing = slot === 'logo' ? group.logo : group.cover;
    const uri = selected === undefined ? existing ? http.mediaUrl(existing.url) : undefined : selected?.uri;
    const setter = slot === 'logo' ? setLogo : setCover;
    return <View style={{ gap: 12 }}><Text style={styles.label}>{slot === 'logo' ? 'Group logo' : 'Cover image'}</Text>
      <View style={{ height: slot === 'logo' ? 100 : 150, width: slot === 'logo' ? 100 : '100%', backgroundColor: colors.primaryTint, borderRadius: slot === 'logo' ? 50 : 14, overflow: 'hidden' }}>{uri && <Image source={uri} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={slot === 'logo' ? 'Selected group logo' : 'Selected cover image'} />}</View>
      <Button title={slot === 'logo' ? 'Choose logo' : 'Choose cover'} variant="secondary" icon="image" disabled={busy} onPress={() => void select(slot)} />
      {uri && <Button title={slot === 'logo' ? 'Remove logo' : 'Remove cover'} variant="ghost" disabled={busy} onPress={() => { if (selected) void cleanupAttachments([selected]); setter(null); }} />}
    </View>;
  };
  return <Page><Header back title="Edit group profile" /><FormBody>
    <Field label="Group name" value={name} onChangeText={setName} maxLength={120} editable={!busy} />
    <Field label="Description" value={description} onChangeText={setDescription} maxLength={2000} multiline editable={!busy} />
    {imageField('logo', logo)}{imageField('cover', cover)}
    {error ? <Notice error>{error}</Notice> : null}
    <Button title="Save group profile" busy={busy} disabled={!dirty} onPress={() => void save()} />
  </FormBody></Page>;
}
