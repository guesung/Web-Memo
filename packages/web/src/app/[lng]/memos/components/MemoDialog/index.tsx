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
import { FocusEvent, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { MemoInput } from '../../types';
import MemoCardFooter from '../MemoCardFooter';
import MemoCardHeader from '../MemoCardHeader';

interface MemoDialog extends LanguageType {}

export default function MemoDialog({ lng }: MemoDialog) {
  const { t } = useTranslation(lng);
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const supabaseClient = useSupabaseClient();
  const { memo: memoData } = useMemoQuery({ supabaseClient, id: Number(id) });
  const { toast } = useToast();
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

  if (!id || !memoData) return;
  return (
    <Dialog open={!!id}>
      <DialogContent onClose={closeDialog} className="max-w-[600px] p-0">
        <Card>
          <MemoCardHeader memo={memoData as GetMemoResponse} />
          <CardContent>
            <Textarea
              {...register('memo', {
                onChange: adjustTextareaHeight,
              })}
              onKeyDown={handleKeyDown}
              onFocus={adjustTextareaHeight}
              className="focus:outline-none"
            />

            <div className="h-4" />
            <span className="text-muted-foreground float-right text-xs">
              {t('common.updatedAt')} {formatDate(memoData.updated_at, 'yyyy.mm.dd')}
            </span>
          </CardContent>
          <MemoCardFooter memo={memoData as GetMemoResponse} lng={lng} isHovered>
            <Button onClick={closeDialog} variant="outline" type="button">
              닫기
            </Button>
            <Button variant="outline" onClick={saveMemo}>
              저장
            </Button>
          </MemoCardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
