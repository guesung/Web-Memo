'use client';
import { useCloseOnEscape, useMemoPatchMutation, useMemoQuery } from '@extension/shared/hooks';
import { Button } from '@extension/ui';
import useTranslation from '@src/modules/i18n/client';
import { LanguageType } from '@src/modules/i18n';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@src/components/ui/dialog';
import { Textarea } from '@src/components/ui/textarea';
import { useSupabaseClient } from '@src/hooks';
import { useToast } from '@src/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MemoInput } from '../../types';
import { useRouter } from 'next/navigation';
import { useSearchParams } from '@extension/shared/modules/search-params';

const MIN_ROW = 4;

interface MemoDialog extends LanguageType {}

export default function MemoDialog({ lng }: MemoDialog) {
  const { t } = useTranslation(lng);
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  const [row, setRow] = useState(MIN_ROW);
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
    mutateMemoPatch(
      { id: Number(id), memoRequest: { memo: watch('memo') } },
      {
        onSuccess: () => toast({ title: t('toastMessage.memoEdited') }),
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

  const closeDialog = () => {
    searchParams.removeAll('id');

    router.replace(searchParams.getUrl(), { scroll: false });
  };

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
