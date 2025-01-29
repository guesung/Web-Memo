'use client';
import { useKeyboardBind, useMemoPatchMutation, useMemoQuery } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { Button } from '@extension/ui';
import { Card, CardContent, Dialog, DialogContent, Textarea } from '@src/components/ui';
import type { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import type { MemoInput } from '../../_types';
import MemoCardFooter from '../MemoCardFooter';
import MemoCardHeader from '../MemoCardHeader';
import UnsavedChangesAlert from './UnsavedChangesAlert';

interface MemoDialog extends LanguageType {
  memoId: number;
  setDialogMemoId: (id: number | null) => void;
}

export default function MemoDialog({ lng, memoId, setDialogMemoId }: MemoDialog) {
  const { t } = useTranslation(lng);
  const searchParams = useSearchParams();
  const { memo: memoData } = useMemoQuery({ id: memoId });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutate: mutateMemoPatch } = useMemoPatchMutation();
  const [showAlert, setShowAlert] = useState(false);

  const { register, watch, setValue } = useForm<MemoInput>({
    defaultValues: {
      memo: '',
    },
  });

  const { ref, ...rest } = register('memo', {
    onChange: event => (event.target.style.height = `${event.target.scrollHeight}px`),
  });
  useImperativeHandle(ref, () => textareaRef.current);

  const saveMemo = () => {
    mutateMemoPatch({ id: memoId, request: { memo: watch('memo') } });
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.metaKey && event.key === 's') {
      event.preventDefault();
      saveMemo();
    }
  };

  useKeyboardBind({ key: 's', callback: saveMemo, isMetaKey: true });

  const checkEditedAndCloseDialog = () => {
    const isEdited = watch('memo') !== memoData?.memo;

    if (isEdited) setShowAlert(true);
    else closeDialog();
  };

  const handleSaveAndClose = () => {
    saveMemo();
    closeDialog();
  };

  const closeDialog = () => {
    setDialogMemoId(null);
    searchParams.removeAll('id');

    history.pushState({ openedMemoId: null }, '', searchParams.getUrl());
  };

  const handleUnChangesAlertClose = () => {
    setShowAlert(false);
  };

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [textareaRef, ref]);

  useEffect(() => {
    setValue('memo', memoData?.memo ?? '');
  }, [memoData, setValue]);

  if (!memoData) return null;

  return (
    <>
      <Dialog open>
        <DialogContent className="max-w-[600px] p-0" onClose={checkEditedAndCloseDialog}>
          <motion.div
            layoutId={`memo-${memoId}`}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}>
            <Card>
              <motion.div layoutId={`header-${memoId}`}>
                <MemoCardHeader memo={memoData} />
              </motion.div>
              <motion.div layoutId={`content-${memoId}`}>
                <CardContent>
                  <Textarea
                    {...rest}
                    className="outline-none focus:border-gray-300 focus:outline-none"
                    ref={textareaRef}
                    placeholder={t('memos.placeholder')}
                  />
                  <div className="h-4" />
                  <span className="text-muted-foreground float-right text-xs">
                    {t('common.lastUpdated', { time: dayjs(memoData.updated_at).fromNow() })}
                  </span>
                </CardContent>
              </motion.div>
              <motion.div layoutId={`footer-${memoId}`}>
                <MemoCardFooter memo={memoData} lng={lng}>
                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={checkEditedAndCloseDialog}>
                      {t('common.close')}
                    </Button>
                    <Button onClick={handleSaveAndClose}>{t('common.save')}</Button>
                  </div>
                </MemoCardFooter>
              </motion.div>
            </Card>
          </motion.div>
        </DialogContent>
      </Dialog>

      <UnsavedChangesAlert open={showAlert} onCancel={handleUnChangesAlertClose} onOk={closeDialog} lng={lng} />
    </>
  );
}
