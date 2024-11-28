'use client';
import { useMemoPatchMutation, useMemoQuery } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { GetMemoResponse } from '@extension/shared/utils';
import { Button } from '@extension/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@src/components/ui/dialog';
import { useSupabaseClient } from '@src/hooks';
import { useToast } from '@src/hooks/use-toast';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { MemoInput } from '../../types';
import MemoCardFooter from '../MemoCardFooter';

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
    mutateMemoPatch(
      { id: Number(id), memoRequest: { memo: watch('memo') } },
      {
        onSuccess: () => toast({ title: t('toastTitle.memoEdited') }),
      },
    );
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLDivElement>) => {
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
    setValue('memo', memoData?.memo ?? '');
  }, [memoData, setValue]);

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
          <div
            onKeyDown={handleKeyDown}
            {...register('memo')}
            contentEditable={true}
            aria-multiline={true}
            role="textbox"
            tabIndex={0}
            spellCheck={true}
            className="whitespace-break-spaces break-all text-sm focus:outline-none">
            {memoData.memo}
          </div>
        </DialogHeader>
        <MemoCardFooter memo={memoData as GetMemoResponse} lng={lng} isHovered>
          <Button onClick={closeDialog} variant="outline" type="button">
            닫기
          </Button>
          <Button variant="outline" onClick={saveMemo}>
            저장
          </Button>
        </MemoCardFooter>
      </DialogContent>
    </Dialog>
  );
}
