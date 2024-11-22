'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';
import { LOCAL_STORAGE } from '@src/constants';
import { useEffect, useState } from 'react';
import { useGetExtensionManifest } from '@src/hooks';
import { URL_CHROME_STORE } from '@extension/shared/constants';
import { Button } from '@src/components/ui/button';

const EXTENSION_DIALOG = {
  install: {
    message: {
      title: '확장 프로그램 미설치',
      description: '설치해야 메모 기능을 이용하실 수 있습니다. 설치하러 가시겠습니까?',
      cancel: '설치하지 않고 이용하기',
      ok: '설치하러 가기',
    },
    link: URL_CHROME_STORE,
    localStorage: LOCAL_STORAGE.install,
  },
  update: {
    message: {
      title: '새로운 버전 출시!',
      description: '',
      cancel: '업데이트 하지 않고 이용하기',
      ok: '업데이트 하러가기',
    },
    link: '',
    localStorage: LOCAL_STORAGE.updateVersion,
  },
};

type DialogType = 'install' | 'update';

const VERSION = '1.6.3';

export default function ExtensionDialog() {
  const [open, setOpen] = useState(false);
  const manifest = useGetExtensionManifest();
  const [dialogType, setDialogType] = useState<DialogType | null>(null);

  console.log(manifest);
  useEffect(() => {
    if (manifest === null) return;
    if (manifest === undefined) setDialogType('install');
    else if (manifest.version !== VERSION) setDialogType('update');
  }, [manifest]);

  if (!dialogType) return;

  const handleUpdateClick = () => {
    window.open(EXTENSION_DIALOG[dialogType].link, '_blank');
  };

  const handleCloseClick = () => {
    setOpen(false);
    localStorage.setItem(EXTENSION_DIALOG[dialogType].localStorage, 'true');
  };

  return (
    <Dialog open={!!dialogType} onOpenChange={setOpen}>
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
