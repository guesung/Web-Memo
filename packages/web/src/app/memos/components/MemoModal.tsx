'use client';
import { useMemoPatchMutation, useMemoQuery } from '@extension/shared/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@src/components/ui/dialog';
import { Textarea } from '@src/components/ui/textarea';
import { getSupabaseClient } from '@src/utils/supabase.client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MemoModal() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const router = useRouter();
  const [row, setRow] = useState(4);
  const [memo, setMemo] = useState('');

  const supabaseClient = getSupabaseClient();
  const { data: memoData } = useMemoQuery({ supabaseClient, id });
  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient,
  });

  useEffect(() => {
    setMemo(memoData?.memo ?? '');
  }, [memoData]);

  const handleMemoTextAreaChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(event.target.value);
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.metaKey && event.key === 's') {
      event.preventDefault();

      mutateMemoPatch({ ...memoData, memo });
    }
  };

  useEffect(() => {
    if (!memoData?.memo) return;

    const rowCount = memoData?.memo.split(/\r\n|\r|\n/).length;
    setRow(rowCount + 2);
  }, [memoData]);

  const handleClose = () => {
    router.replace('/memos', { scroll: false });
  };

  if (!id || !memoData) return;
  return (
    <Dialog open={!!id}>
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
          <Textarea rows={row} onKeyDown={handleKeyDown} value={memo} onChange={handleMemoTextAreaChange} />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
function abortThrottle() {
  throw new Error('Function not implemented.');
}
