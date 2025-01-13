import { EXTENSION } from '@extension/shared/constants';
import {
  checkLocalStorageKey,
  checkLocalStorageTrue,
  LocalStorageKeyType,
  setLocalStorageTrue,
} from '@extension/shared/modules/local-storage';
import { useGetExtensionManifest } from '@src/hooks';
import { useEffect, useState } from 'react';

export type DialogType = 'install';

export default function useExtensionDialog() {
  const manifest = useGetExtensionManifest();
  const [open, setOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType | undefined>(undefined);

  useEffect(() => {
    if (!manifest) return;

    if (manifest === 'NOT_INSTALLED' && !checkLocalStorageTrue('install')) {
      setDialogType('install');
      setOpen(true);
      return;
    }

    // const isExtensionNotLastVersion = manifest.version !== EXTENSION.lastVersion;

    // if (isExtensionNotLastVersion && !checkLocalStorageTrue('updateVersion')) {
    //   setDialogType('update');
    //   setOpen(true);
    //   return;
    // }
  }, [manifest]);

  const handleClose = (localStorageKey: LocalStorageKeyType) => {
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
