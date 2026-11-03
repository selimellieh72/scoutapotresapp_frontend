import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, session } from '../providers';
import { ApiError, userMessage } from '../api/http';
import { Avatar, Button, Field, FormBody, Header, Icon, Notice, Page } from '../ui/components';
import { colors, styles } from '../ui/theme';
import { useDialog } from '../ui/dialog';

export function AuthScreen({ mode = 'login' }: { mode?: 'login' | 'forgot' | 'reset' }) {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const dialog = useDialog();
  const resetInvalid = mode === 'reset' && !/^[A-Za-z0-9_-]{43}$/.test(token);
  const submit = async () => {
    if (busy) return;
    setError('');
    if (mode === 'reset' && (password.length < 12 || password.length > 256)) { setError('Choose a password between 12 and 256 characters.'); return; }
    if (mode === 'reset' && password !== confirm) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') { await session.login(identifier.trim(), password); router.replace('/settings'); }
      else if (mode === 'forgot') { await api.forgotPassword(identifier.trim()); setSent(true); }
      else { await api.resetPassword(token, password); await session.invalidate(); dialog.toast('Password updated. Please sign in.'); router.replace('/login'); }
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 401 && mode === 'login' ? 'The email/username or password is incorrect.' : caught instanceof ApiError && caught.code === 'INVALID_RESET_TOKEN' ? 'This reset link is invalid or has expired. Request a new one.' : caught instanceof ApiError && caught.code === 'EMAIL_UNAVAILABLE' ? 'Password recovery is temporarily unavailable. Please contact your group administrator.' : userMessage(caught));
    } finally { setBusy(false); }
  };
  return <Page><Header back title={mode === 'login' ? 'Admin login' : mode === 'forgot' ? 'Forgot password' : 'Reset password'} /><FormBody>
    <View style={{ paddingVertical: 14, gap: 20 }}><Avatar size={62} /><View style={{ gap: 9 }}><Text style={styles.eyebrow}>BEHIND THE JOURNAL</Text><Text style={styles.title}>{mode === 'login' ? 'Welcome back.' : mode === 'forgot' ? 'Let’s get you back in.' : 'A fresh start.'}</Text><Text style={styles.muted}>{mode === 'login' ? 'Sign in to share the group’s next adventure.' : mode === 'forgot' ? 'Enter your admin email or username to request a reset link.' : 'Choose a new password for your admin account.'}</Text></View></View>
    {sent ? <><Notice>If an active account exists, recovery instructions will be sent.</Notice><Button title="Back to login" variant="secondary" onPress={() => router.replace('/login')} /></> : resetInvalid ? <><Notice error>This reset link is incomplete or invalid.</Notice><Button title="Request a new link" onPress={() => router.replace('/forgot-password')} /></> : <>
      {mode !== 'reset' && <Field label="Email or username" value={identifier} onChangeText={setIdentifier} maxLength={254} autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" returnKeyType="next" />}
      {mode !== 'forgot' && <View><Field label={mode === 'reset' ? 'New password' : 'Password'} value={password} onChangeText={setPassword} maxLength={256} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete={mode === 'reset' ? 'new-password' : 'current-password'} onSubmitEditing={() => void submit()} /><Pressable accessibilityRole="button" onPress={() => setShow(!show)} style={{ flexDirection: 'row', gap: 7, alignItems: 'center', minHeight: 44, alignSelf: 'flex-end' }}><Icon name={show ? 'eye-off' : 'eye'} size={16} color={colors.muted} /><Text style={styles.muted}>{show ? 'Hide password' : 'Show password'}</Text></Pressable></View>}
      {mode === 'reset' && <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry={!show} maxLength={256} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" />}
      {error ? <Notice error>{error}</Notice> : null}
      <Button title={mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Update password'} onPress={() => void submit()} busy={busy} disabled={mode === 'reset' ? !password || !confirm : !identifier.trim() || (mode === 'login' && !password)} />
      {mode === 'login' ? <Button title="Forgot password?" variant="ghost" onPress={() => router.push('/forgot-password')} /> : mode === 'reset' && <Button title="Request a new reset link" variant="ghost" onPress={() => router.replace('/forgot-password')} />}
    </>}
  </FormBody></Page>;
}
