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
import { Button } from './ui/button';
import { useGetExtensionManifest } from '@src/hooks';
import { URL_CHROME_STORE, URL_GUIDE_KO } from '@extension/shared/constants';

type DialogType = 'install' | 'update';

const LAST_VERSION = '1.6.5';

export default function ExtensionDialog() {
  const [open, setOpen] = useState(false);
  const manifest = useGetExtensionManifest();

  const [dialogType, setDialogType] = useState<DialogType | null>(null);

  useEffect(() => {
    const extensionNotLoaded = manifest === null;
    if (extensionNotLoaded) return;

    const extensionNotInstalled = manifest === undefined;
    const extensionNotLastVersion = manifest.version !== LAST_VERSION;

    if (extensionNotInstalled || extensionNotLastVersion) setOpen(true);
    if (extensionNotInstalled) setDialogType('install');
    else if (extensionNotLastVersion) setDialogType('update');
  }, [manifest]);

  if (!dialogType) return;

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
        description: `현재 설치된 버전 : ${manifest?.version}, 최신 버전 : ${LAST_VERSION}`,
        cancel: '업데이트 하지 않고 이용하기',
        ok: '업데이트 하러가기',
      },
      link: URL_GUIDE_KO,
      localStorage: LOCAL_STORAGE.updateVersion,
    },
  };

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
