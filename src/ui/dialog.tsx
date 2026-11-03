import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { colors, styles } from './theme';
type ConfirmOptions = { title: string; message: string; confirm?: string; destructive?: boolean };
const Dialog = createContext({ confirm: async (_options: ConfirmOptions) => false, toast: (_message: string) => {} });
export const useDialog = () => useContext(Dialog);
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolve = useRef<((value: boolean) => void) | null>(null);
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(done => {
    resolve.current?.(false); resolve.current = done; setDialog(options);
  }), []);
  const close = (value: boolean) => { setDialog(null); resolve.current?.(value); resolve.current = null; };
  const toast = useCallback((value: string) => { if (timer.current) clearTimeout(timer.current); setMessage(value); timer.current = setTimeout(() => setMessage(''), 4500); }, []);
  return <Dialog.Provider value={{ confirm, toast }}>{children}
    {message ? <Pressable onPress={() => setMessage('')} accessibilityLiveRegion="polite" style={{ position: 'absolute', bottom: 86, alignSelf: 'center', backgroundColor: colors.ink, padding: 16, marginHorizontal: 20, borderRadius: 12, zIndex: 20 }}><Text style={{ color: 'white', fontSize: 14 }}>{message}</Text></Pressable> : null}
    <Modal transparent visible={Boolean(dialog)} animationType="fade" onRequestClose={() => close(false)}>
      <View style={{ flex: 1, backgroundColor: '#10180E66', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 380, backgroundColor: 'white', borderRadius: 20, padding: 24, gap: 16 }}>
          <Text style={styles.heading}>{dialog?.title}</Text><Text style={styles.muted}>{dialog?.message}</Text>
          <View style={[styles.row, { justifyContent: 'flex-end' }]}>
            <Pressable accessibilityRole="button" onPress={() => close(false)} style={{ padding: 14, minHeight: 48 }}><Text style={styles.muted}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => close(true)} style={{ backgroundColor: dialog?.destructive ? colors.danger : colors.primary, padding: 14, minHeight: 48, borderRadius: 10 }}><Text style={{ color: 'white', fontWeight: '600' }}>{dialog?.confirm ?? 'Continue'}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </Dialog.Provider>;
}
