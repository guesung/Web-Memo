'use client';
import { useMemoPatchMutation, useMemoQuery } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { Button } from '@extension/ui';
import { Card, CardContent, Dialog, DialogContent, Textarea } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';
import { MemoInput } from '../../_types';
import MemoCardFooter from '../MemoCardFooter';
import MemoCardHeader from '../MemoCardHeader';
import UnsavedChangesAlert from './UnsavedChangesAlert';

import relativeTime from 'dayjs/plugin/relativeTime';

import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/ko';

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
  const router = useRouter();

  dayjs.extend(relativeTime);
  dayjs.locale(lng === 'ko' ? 'ko' : 'en');

  const { register, watch, setValue, control } = useForm<MemoInput>({
    defaultValues: {
      memo: '',
    },
  });

  const { ref, ...rest } = register('memo', {
    onChange: event => (event.target.style.height = `${event.target.scrollHeight}px`),
  });

  useWatch({
    name: 'memo',
    control,
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

    history.back();
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

  if (!memoData) return;
  return (
    <>
      <Dialog open>
        <DialogContent className="max-w-[600px] p-0" onClose={checkEditedAndCloseDialog}>
          <Card>
            <MemoCardHeader memo={memoData} />
            <CardContent>
              <Textarea
                {...rest}
                onKeyDown={handleKeyDown}
                className="outline-none focus:border-gray-300 focus:outline-none"
                ref={textareaRef}
              />

              <div className="h-4" />
              <span className="text-muted-foreground float-right text-xs">
                {t('common.lastUpdated', { time: dayjs(memoData.updated_at).fromNow(true) })}
              </span>
            </CardContent>

            <MemoCardFooter memo={memoData} lng={lng}>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={checkEditedAndCloseDialog}>
                  {t('common.close')}
                </Button>
                <Button onClick={handleSaveAndClose}>{t('common.save')}</Button>
              </div>
            </MemoCardFooter>
          </Card>
        </DialogContent>
      </Dialog>

      <UnsavedChangesAlert open={showAlert} onCancel={handleUnChangesAlertClose} onOk={closeDialog} lng={lng} />
    </>
  );
}
