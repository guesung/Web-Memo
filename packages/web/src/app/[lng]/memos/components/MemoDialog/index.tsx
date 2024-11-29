'use client';
import { useMemoPatchMutation, useMemoQuery } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { formatDate, GetMemoResponse } from '@extension/shared/utils';
import { Button } from '@extension/ui';
import { Card, CardContent } from '@src/components/ui/card';
import { Dialog, DialogContent } from '@src/components/ui/dialog';
import { Textarea } from '@src/components/ui/textarea';
import { useSupabaseClient } from '@src/hooks';
import { useToast } from '@src/hooks/use-toast';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useRouter } from 'next/navigation';
import { FocusEvent, useEffect, useState } from 'react';
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
  const supabaseClient = useSupabaseClient();
  const { memo: memoData } = useMemoQuery({ supabaseClient, id: Number(id) });
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient,
  });

  const { register, watch, setValue } = useForm<MemoInput>({
    defaultValues: {
      memo: '',
    },
  });

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

  const adjustTextareaHeight = (event: FocusEvent<HTMLTextAreaElement>) => {
    event.target.style.height = `${event.target.scrollHeight}px`;
  };

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
          <MemoCardHeader memo={memoData as GetMemoResponse} />
          <CardContent>
            <Textarea
              {...register('memo', {
                onChange: adjustTextareaHeight,
              })}
              onKeyDown={handleKeyDown}
              onFocus={adjustTextareaHeight}
              className="outline-none focus:border-gray-300 focus:outline-none"
            />

            <div className="h-4" />
            <span className="text-muted-foreground float-right text-xs">
              {t('common.updatedAt')} {formatDate(memoData.updated_at, 'yyyy.mm.dd')}
            </span>
          </CardContent>
          <MemoCardFooter memo={memoData as GetMemoResponse} lng={lng} isHovered>
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
