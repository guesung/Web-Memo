'use client';
import { useMemoPatchMutation, useMemoQuery } from '@extension/shared/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@src/components/ui/dialog';
import { Textarea } from '@src/components/ui/textarea';
import { getSupabaseClient } from '@src/utils/supabase.client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';

type InputType = {
  memo: string;
};

export default function MemoModal() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const router = useRouter();
  const [row, setRow] = useState(4);

  const { register, handleSubmit, watch, setValue } = useForm<InputType>({
    defaultValues: {
      memo: '',
    },
  });
  const onSubmit: SubmitHandler<InputType> = data => console.log(data);
  const memo = watch('memo');

  const supabaseClient = getSupabaseClient();
  const { data: memoData } = useMemoQuery({ supabaseClient, id });
  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient,
  });

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.metaKey && event.key === 's') {
      event.preventDefault();

      mutateMemoPatch({ ...memoData, memo });
    }
  };

  const handleClose = () => {
    router.replace('/memos', { scroll: false });
  };

  useEffect(() => {
    const rowCount = memo.split(/\r\n|\r|\n/).length;
    setRow(rowCount + 2);
  }, [memo]);

  useEffect(() => {
    setValue('memo', memoData?.memo ?? '');
  }, [memoData]);

  if (!id || !memoData) return;
  return (
    <Dialog open={!!id}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent onClose={handleClose}>
          <DialogHeader>
            <DialogTitle>
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
        </DialogContent>
      </form>
    </Dialog>
  );
}
function abortThrottle() {
  throw new Error('Function not implemented.');
}
