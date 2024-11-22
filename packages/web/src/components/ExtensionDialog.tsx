'use client';

import { EXTENSION, URL_CHROME_STORE, URL_GUIDE_KO } from '@extension/shared/constants';
import useTranslation from '@src/app/i18n/client';
import { LanguageType } from '@src/app/i18n/type';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';
import { useGetExtensionManifest } from '@src/hooks';
import { checkUpdateVersion, LOCAL_STORAGE_KEY_MAP, LocalStorage } from '@src/utils';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

type DialogType = 'install' | 'update';

interface ExtensionDialogProps extends LanguageType {}

export default function ExtensionDialog({ lng }: ExtensionDialogProps) {
  const { t } = useTranslation(lng);
  const [open, setOpen] = useState(false);
  const manifest = useGetExtensionManifest();

  const [dialogType, setDialogType] = useState<DialogType | null>(null);

  useEffect(() => {
    if (manifest === null) return;

    const isExtensionInstalled = manifest !== undefined;
    const isExtensionNotLastVersion = isExtensionInstalled && manifest.version !== EXTENSION.lastVersion;

    if (!isExtensionInstalled && !LocalStorage.check(LOCAL_STORAGE_KEY_MAP.install)) {
      setDialogType('install');
      setOpen(true);
    } else if (isExtensionNotLastVersion && !LocalStorage.check(LOCAL_STORAGE_KEY_MAP.updateVersion)) {
      setDialogType('update');
      setOpen(true);
    }
  }, [manifest]);

  if (!dialogType) return;

  const EXTENSION_DIALOG = {
    install: {
      message: {
        title: t('dialogInstall.title'),
        description: t('dialogInstall.title'),
        ok: t('dialogInstall.ok'),
        cancel: t('dialogInstall.cancel'),
      },
      link: URL_CHROME_STORE,
      localStorageKey: LOCAL_STORAGE_KEY_MAP.install,
    },
    update: {
      message: {
        title: t('dialogVersion.title'),
        description: t('dialogVersion.description', {
          currentVersion: manifest?.version,
          lastVersion: EXTENSION.lastVersion,
        }),
        cancel: t('dialogVersion.cancel'),
        ok: t('dialogVersion.ok'),
      },
      link: URL_GUIDE_KO,
      localStorageKey: LOCAL_STORAGE_KEY_MAP.updateVersion + 'a',
    },
  };

  const currentExtensionDialog = EXTENSION_DIALOG[dialogType];

  const setLocalStroageTrueAndCloseDialog = () => {
    setOpen(false);
    if (checkUpdateVersion(currentExtensionDialog.localStorageKey))
      LocalStorage.setTrue(currentExtensionDialog.localStorageKey);
  };

  const handleUpdateClick = () => {
    window.open(currentExtensionDialog.link, '_blank');
    setLocalStroageTrueAndCloseDialog();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentExtensionDialog.message.title}</DialogTitle>
          <DialogDescription>{currentExtensionDialog.message.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {currentExtensionDialog.message.cancel && (
            <Button onClick={setLocalStroageTrueAndCloseDialog} variant="secondary">
              {currentExtensionDialog.message?.cancel}
            </Button>
          )}
          <Button onClick={handleUpdateClick}>{currentExtensionDialog.message.ok}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
