'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { useGetExtensionManifest } from '@src/hooks';
import { EXTENSION, URL_CHROME_STORE, URL_GUIDE_KO } from '@extension/shared/constants';
import { LanguageType } from '@src/app/i18n/type';
import useTranslation from '@src/app/i18n/client';
import { LOCAL_STORAGE_KEY_MAP, LocalStorage } from '@src/utils';

type DialogType = 'install' | 'update';

interface ExtensionDialogProps extends LanguageType {}

export default function ExtensionDialog({ lng }: ExtensionDialogProps) {
  const { t } = useTranslation(lng);
  const [open, setOpen] = useState(false);
  const manifest = useGetExtensionManifest();

  const [dialogType, setDialogType] = useState<DialogType | null>(null);

  useEffect(() => {
    const extensionNotLoaded = manifest === null;
    if (extensionNotLoaded) return;

    const extensionNotInstalled = manifest === undefined;
    const extensionNotLastVersion = manifest.version !== '1.6.5';

    if (extensionNotInstalled && !LocalStorage.check(LOCAL_STORAGE_KEY_MAP.install)) {
      setDialogType('install');
      setOpen(true);
    } else if (extensionNotLastVersion && !LocalStorage.check(LOCAL_STORAGE_KEY_MAP.updateVersion)) {
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
        cancel: t('dialogInstall.cancel'),
        ok: t('dialogInstall.ok'),
      },
      link: URL_CHROME_STORE,
      localStorage: LOCAL_STORAGE_KEY_MAP.install,
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
      localStorage: LOCAL_STORAGE_KEY_MAP.updateVersion,
    },
  };

  const handleUpdateClick = () => {
    window.open(EXTENSION_DIALOG[dialogType].link, '_blank');
  };

  const handleCloseClick = () => {
    setOpen(false);
    LocalStorage.setTrue(EXTENSION_DIALOG[dialogType].localStorage);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{EXTENSION_DIALOG[dialogType].message.title}</DialogTitle>
          <DialogDescription>{EXTENSION_DIALOG[dialogType].message.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleCloseClick} variant="secondary">
            {EXTENSION_DIALOG[dialogType].message.cancel}
          </Button>
          <Button onClick={handleUpdateClick}>{EXTENSION_DIALOG[dialogType].message.ok}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
