import { useRef, useState } from 'react';
import { usePreventRemove } from 'expo-router';
import { useDialog } from '../ui/dialog';

export function useDiscardGuard(dirty: boolean, busy: boolean, cleanup?: () => Promise<void>) {
  const dialog = useDialog();
  const [discarded, setDiscarded] = useState(false);
  const latest = useRef({ busy, cleanup }); latest.current = { busy, cleanup };
  const disablePrevention = usePreventRemove(dirty && !discarded, ({ repeat }) => {
    if (latest.current.busy) { dialog.toast('Please wait for the current action to finish.'); return; }
    void dialog.confirm({ title: 'Discard your changes?', message: 'Your unsaved changes will be lost.', confirm: 'Discard', destructive: true }).then(async discard => {
      if (!discard) return;
      await latest.current.cleanup?.(); setDiscarded(true); disablePrevention(); repeat();
    });
  });
}
