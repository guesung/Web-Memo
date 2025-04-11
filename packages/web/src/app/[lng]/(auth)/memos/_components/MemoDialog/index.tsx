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
  const { memo: memoData } = useMemoQuery({ id: memoId });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutate: mutateMemoPatch } = useMemoPatchMutation();
  const [showAlert, setShowAlert] = useState(false);
  const searchParams = useSearchParams();

  const { register, watch, setValue } = useForm<MemoInput>({
    defaultValues: {
      memo: '',
      tags: [],
    },
  });

  const { ref, ...rest } = register('memo', {
    onChange: event => (event.target.style.height = `${event.target.scrollHeight}px`),
  });
  useImperativeHandle(ref, () => textareaRef.current);

  const saveMemo = () => {
    mutateMemoPatch({
      id: memoId,
      request: {
        memo: watch('memo'),
        tags: watch('tags') || [],
      },
    });
  };

  useKeyboardBind({ key: 's', callback: saveMemo, isMetaKey: true });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === ' ') {
      const text = event.currentTarget.value;
      const normalizedText = text.replace(/\n/g, ' ');
      const words = normalizedText.split(' ');
      const lastWord = words[words.length - 1];

      if (lastWord.startsWith('#') && lastWord.length > 1) {
        event.preventDefault();
        const newTag = lastWord.substring(1);
        const currentTags = watch('tags') || [];

        if (!currentTags.includes(newTag)) {
          const newText = text.slice(0, -lastWord.length) + ' ';
          setValue('memo', newText);
          setValue('tags', [...currentTags, newTag]);
          saveMemo();
        }
      }
    }
  };

  const handleTagRemove = (tag: string) => {
    if (!memoData || !memoData.tags) return;
    const newTags = memoData.tags.filter(t => t !== tag);
    setValue('tags', newTags);
    saveMemo();
  };

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

    const isHasPreviousPage = history.state?.openedMemoId === memoId;
    if (isHasPreviousPage) history.back();
    else {
      searchParams.removeAll('id');
      history.pushState({}, '', searchParams.getUrl());
    }
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
    setValue('tags', memoData?.tags ?? []);
  }, [memoData, setValue]);

  if (!memoData) return null;

  return (
    <>
      <Dialog open>
        <DialogContent className="max-w-[600px] p-0" onClose={checkEditedAndCloseDialog}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <MemoCardHeader memo={memoData} />
              <CardContent>
                <Textarea
                  {...rest}
                  className="outline-none focus:border-gray-300 focus:outline-none"
                  ref={textareaRef}
                  placeholder={t('memos.placeholder')}
                  onKeyDown={handleKeyDown}
                />

                <div className="h-4" />
                <span className="text-muted-foreground float-right text-xs">
                  {t('common.lastUpdated', { time: dayjs(memoData.updated_at).fromNow() })}
                </span>
              </CardContent>
              <MemoCardFooter memo={memoData} lng={lng} onTagClick={tag => handleTagRemove(tag)}>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={checkEditedAndCloseDialog}>
                    {t('common.close')}
                  </Button>
                  <Button onClick={handleSaveAndClose}>{t('common.save')}</Button>
                </div>
              </MemoCardFooter>
            </Card>
          </motion.div>
        </DialogContent>
      </Dialog>

      <UnsavedChangesAlert open={showAlert} onCancel={handleUnChangesAlertClose} onOk={closeDialog} lng={lng} />
    </>
  );
}
