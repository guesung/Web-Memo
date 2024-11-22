import { EXTENSION } from '@extension/shared/constants';
import { useGetExtensionManifest } from '@src/hooks';
import { checkUpdateVersion, LOCAL_STORAGE_KEY_MAP, LocalStorage } from '@src/utils';
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

    if (!isExtensionInstalled && !LocalStorage.check(LOCAL_STORAGE_KEY_MAP.install)) {
      setDialogType('install');
      setOpen(true);
      return;
    }
    if (isExtensionNotLastVersion && !LocalStorage.check(LOCAL_STORAGE_KEY_MAP.updateVersion)) {
      setDialogType('update');
      setOpen(true);
      return;
    }
  }, [manifest]);

  const handleClose = (localStorageKey: string) => {
    setOpen(false);
    if (checkUpdateVersion(localStorageKey)) LocalStorage.setTrue(localStorageKey);
  };

  return {
    open,
    setOpen,
    dialogType,
    manifest,
    handleClose,
  };
}
