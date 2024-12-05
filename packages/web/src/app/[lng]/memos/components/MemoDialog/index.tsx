'use client';
import { useMemoPatchMutation, useMemoQuery } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { formatDate } from '@extension/shared/utils';
import { Button } from '@extension/ui';
import { Card, CardContent, Dialog, DialogContent, Textarea, useToast } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useRouter } from 'next/navigation';
import { FocusEvent, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { MemoInput } from '../../types';
import MemoCardFooter from '../MemoCardFooter';
import MemoCardHeader from '../MemoCardHeader';

interface MemoDialog extends LanguageType {
  id: string;
}

export default function MemoDialog({ lng, id }: MemoDialog) {
  const { t } = useTranslation(lng);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { memo: memoData } = useMemoQuery({ id: Number(id) });
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const { mutate: mutateMemoPatch } = useMemoPatchMutation();

  const { register, watch, setValue } = useForm<MemoInput>({
    defaultValues: {
      memo: '',
    },
  });
  const adjustTextareaHeight = (event: FocusEvent<HTMLTextAreaElement>) => {
    event.target.style.height = `${event.target.scrollHeight}px`;
  };
  const { ref, ...rest } = register('memo', {
    onChange: adjustTextareaHeight,
  });

  useImperativeHandle(ref, () => textareaRef.current);

  const saveMemo = () => {
    console.log(watch('memo'));
    mutateMemoPatch(
      { id: Number(id), memoRequest: { memo: watch('memo') } },
      {
        onSuccess: () => toast({ title: t('toastTitle.memoEdited') }),
      },
    );
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.metaKey && event.key === 's') {
      event.preventDefault();
      saveMemo();
    }
  };

  const closeDialog = () => {
    searchParams.removeAll('id');
    router.replace(searchParams.getUrl(), { scroll: false });
  };

  useEffect(() => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [textareaRef, ref]);

  useEffect(() => {
    setValue('memo', memoData?.memo ?? '');
  }, [memoData, setValue]);

  useEffect(() => {
    setOpen(!!id);
  }, [id]);

  if (!id || !memoData) return;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[600px] p-0" onClose={closeDialog}>
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
              {t('common.updatedAt')} {formatDate(memoData.updated_at, 'yyyy.mm.dd')}
            </span>
          </CardContent>
          <MemoCardFooter memo={memoData} lng={lng} isOptionShown>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={closeDialog}>
                {t('common.close')}
              </Button>
              <Button variant="outline" onClick={saveMemo}>
                {t('common.save')}
              </Button>
            </div>
          </MemoCardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
