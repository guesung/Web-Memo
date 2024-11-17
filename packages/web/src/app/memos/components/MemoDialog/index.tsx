'use client';
import { useMemoPatchMutation, useMemoQuery, useSearchParamsRouter } from '@extension/shared/hooks';
import { Button } from '@src/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@src/components/ui/dialog';
import { Textarea } from '@src/components/ui/textarea';
import { cn } from '@src/utils';
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
  const [isSaved, setIsSaved] = useState(true);

  const { register, watch, setValue } = useForm<InputType>({
    defaultValues: {
      memo: '',
    },
  });

  const saveMemo = () => {
    setIsSaved(true);
    mutateMemoPatch({ ...memoData, memo: watch('memo') });
  };

  const supabaseClient = getSupabaseClient();
  const { data: memoData } = useMemoQuery({ supabaseClient, id: Number(id) });
  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient,
  });

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.metaKey && event.key === 's') {
      event.preventDefault();

      saveMemo();
    }
  };

  const handleCloseClick = () => {
    idSearchParamsRouter.remove();
  };

  const handleSaveClick = () => {
    saveMemo();
    idSearchParamsRouter.remove();
  };

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
      <DialogContent onClose={handleCloseClick}>
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
          <Textarea
            rows={row}
            onKeyDown={handleKeyDown}
            {...register('memo', {
              onChange: () => setIsSaved(false),
            })}
            className={cn({
              'border-cyan-900 focus:border-cyan-900': !isSaved,
            })}
          />
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleCloseClick} variant="outline" type="button">
            닫기
          </Button>
          <Button variant="outline" onClick={handleSaveClick}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
