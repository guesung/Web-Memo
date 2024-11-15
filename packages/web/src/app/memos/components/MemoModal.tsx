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

export default function MemoModal() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const router = useRouter();

  const { data: supabaseClient } = useSupabaseClient({ getSupabaseClient });
  const { data: memoData } = useMemoQuery({ supabaseClient, id });

  const handleClose = () => {
    router.replace('/memos', { scroll: false });
  };
  return (
    <Dialog open={!!id}>
      <DialogContent onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>{memoData?.title}</DialogTitle>
          <DialogDescription>{memoData?.memo}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
