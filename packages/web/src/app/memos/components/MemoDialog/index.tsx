'use client';
import { useCloseOnEscape, useMemoPatchMutation, useMemoQuery, useSearchParamsRouter } from '@extension/shared/hooks';
import { Button } from '@extension/ui';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@src/components/ui/dialog';
import { Textarea } from '@src/components/ui/textarea';
import { useToast } from '@src/hooks/use-toast';
import { getSupabaseClient } from '@src/utils/supabase.client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const MIN_ROW = 4;

type InputType = {
  memo: string;
};

export default function MemoDialog() {
  const idSearchParamsRouter = useSearchParamsRouter('id');
  const id = idSearchParamsRouter.get();
  const [row, setRow] = useState(MIN_ROW);
  const supabaseClient = getSupabaseClient();
  const { data: memoData } = useMemoQuery({ supabaseClient, id: Number(id) });
  const { toast } = useToast();
  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient,
  });

  const { register, watch, setValue } = useForm<InputType>({
    defaultValues: {
      memo: '',
    },
  });

  const saveMemo = () => {
    mutateMemoPatch(
      { id: Number(id), memoRequest: { memo: watch('memo') } },
      {
        onSuccess: () => toast({ title: '메모가 수정되었습니다.' }),
      },
    );
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.metaKey && event.key === 's') {
      event.preventDefault();

      saveMemo();
    }
  };

  const closeDialog = () => idSearchParamsRouter.remove();

  useCloseOnEscape(closeDialog);

  useEffect(() => {
    const rowCount = watch('memo').split(/\r\n|\r|\n/).length;
    setRow(rowCount + 2);
  }, [watch('memo')]);

  useEffect(() => {
    setValue('memo', memoData?.memo ?? '');
  }, [memoData]);

  if (!id || !memoData) return;
  return (
    <Dialog open={!!id}>
      <DialogContent onClose={closeDialog}>
        <DialogHeader>
          <DialogTitle className="font-normal">
            <Link className="link-hover flex gap-2" href={memoData.url} target="_blank">
              {memoData.favIconUrl ? (
                <Image
                  src={memoData.favIconUrl}
                  width={16}
                  height={16}
                  alt="favicon"
                  className="float-left"
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <></>
              )}
              {memoData?.title}
            </Link>
          </DialogTitle>
          <div className="h-2" />
          <Textarea rows={row} onKeyDown={handleKeyDown} {...register('memo')} />
        </DialogHeader>
        <DialogFooter>
          <Button onClick={closeDialog} variant="outline" type="button">
            닫기
          </Button>
          <Button variant="outline" onClick={saveMemo}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
