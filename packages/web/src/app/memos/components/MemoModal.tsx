'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@src/components/ui/dialog';
import { useMemoQuery, useSupabaseClient } from '@extension/shared/hooks';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { Textarea } from '@src/components/ui/textarea';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function MemoModal() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const router = useRouter();
  const [row, setRow] = useState(4);

  const supabaseClient = getSupabaseClient();
  const { data: memoData } = useMemoQuery({ supabaseClient, id });

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
          <Textarea defaultValue={memoData?.memo} rows={row} />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
