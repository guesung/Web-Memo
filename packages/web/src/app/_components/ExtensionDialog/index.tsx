'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';

import { setLocalStorageTrue } from '@extension/shared/modules/local-storage';
import useExtensionDialog from './useExtensionDialog';
import { useExtensionDialogInfo } from './useExtensionDialogInfo';

interface ExtensionDialogProps extends LanguageType {}

export default function ExtensionDialog({ lng }: ExtensionDialogProps) {
  const { open, setOpen, dialogType, manifest, handleClose } = useExtensionDialog();

  const extensionDialogInfo = useExtensionDialogInfo(lng, manifest, dialogType);

  if (!dialogType || !extensionDialogInfo) return null;

  const handleOkClick = () => {
    setLocalStorageTrue(extensionDialogInfo.localStorageKey);
    handleClose(extensionDialogInfo.localStorageKey);
    window.open(extensionDialogInfo.link, '_blank', 'noopener,noreferrer');
  };

  const handleCloseClick = () => {
    setLocalStorageTrue(extensionDialogInfo.localStorageKey);
    handleClose(extensionDialogInfo.localStorageKey);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent onClose={handleCloseClick}>
        <DialogHeader>
          <DialogTitle>{extensionDialogInfo.message.title}</DialogTitle>
          <DialogDescription>{extensionDialogInfo.message.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {extensionDialogInfo.message.cancel && (
            <Button onClick={handleCloseClick} variant="secondary">
              {extensionDialogInfo.message.cancel}
            </Button>
          )}
          <Button onClick={handleOkClick}>{extensionDialogInfo.message.ok}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
