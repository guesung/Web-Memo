import { EXTENSION } from '@extension/shared/constants';
import { useGetExtensionManifest } from '@src/hooks';
import {
  checkLocalStorageKey,
  checkLocalStorageTrue,
  LocalStorage,
  setLocalStorageTrue,
} from '@extension/shared/modules/local-storage';
import { useEffect, useState } from 'react';

export type DialogType = 'install' | 'update';

export default function useExtensionDialog() {
  const manifest = useGetExtensionManifest();
  const [open, setOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType | undefined>(undefined);

  useEffect(() => {
    if (manifest === null) return;

    const isExtensionInstalled = manifest !== undefined;
    const isExtensionNotLastVersion = isExtensionInstalled && manifest.version !== EXTENSION.lastVersion;

    if (!isExtensionInstalled && !checkLocalStorageTrue('install')) {
      setDialogType('install');
      setOpen(true);
      return;
    }
    if (isExtensionNotLastVersion && !checkLocalStorageTrue('updateVersion')) {
      setDialogType('update');
      setOpen(true);
      return;
    }
  }, [manifest]);

  const handleClose = (localStorageKey: string) => {
    setOpen(false);
    if (checkLocalStorageKey(localStorageKey)) setLocalStorageTrue(localStorageKey);
  };

  return {
    open,
    setOpen,
    dialogType,
    manifest,
    handleClose,
  };
}
