'use client';

import { URL } from '@extension/shared/constants';
import { checkLocalStorageTrue, setLocalStorageTrue } from '@extension/shared/modules/local-storage';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@extension/ui';
import { useGetExtensionManifest } from '@src/hooks';
import type { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';
import { useEffect, useState } from 'react';

interface ExtensionInstallCheckDialogProps extends LanguageType {}
export default function ExtensionInstallCheckDialog({ lng }: ExtensionInstallCheckDialogProps) {
  const [open, setOpen] = useState(false);
  const manifest = useGetExtensionManifest();

  const { t } = useTranslation(lng);

  const closeDialog = () => {
    setOpen(false);
  };

  const handleOkClick = () => {
    window.open(URL.chromeStore, '_blank', 'noopener,noreferrer');
    closeDialog();
  };

  const handleCancelClick = () => {
    setLocalStorageTrue('install');
  };

  useEffect(() => {
    const isInstalled = typeof manifest === 'object';

    if (!isInstalled && !checkLocalStorageTrue('install')) setOpen(true);
  }, [manifest]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent onClose={closeDialog}>
        <DialogHeader>
          <DialogTitle>{t('dialogInstall.title')}</DialogTitle>
          <DialogDescription>{t('dialogInstall.description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleCancelClick} variant="secondary">
            {t('dialogInstall.cancel')}
          </Button>
          <Button onClick={handleOkClick}>{t('dialogInstall.ok')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
