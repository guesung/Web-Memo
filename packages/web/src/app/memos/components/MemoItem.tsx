import { requestRefetchTheMemoList } from '@extension/shared/utils/extension';

import { HTMLAttributes } from 'react';

import { MemoRow } from '@extension/shared/types';
import { formatDate } from '@extension/shared/utils';
import { Card, CardContent, CardHeader } from '@src/components/ui/card';
import { useMemoDeleteMutation } from '@src/hooks';
import Image from 'next/image';
import Link from 'next/link';

interface MemoItemProps extends HTMLAttributes<HTMLDivElement> {
  isHovered: boolean;
  memo?: MemoRow;
}

export default function MemoItem({ isHovered, memo, ...props }: MemoItemProps) {
  if (!memo) return null;
  const { mutate: mutateMemoDelete } = useMemoDeleteMutation({
    handleSuccess: requestRefetchTheMemoList,
  });

  const handleDeleteClick = () => {
    const answer = window.confirm('정말로 메모를 삭제하시겠습니까? 복구는 불가능합니다.');
    if (!answer) return;
    mutateMemoDelete(memo.id);
  };

  return (
    <Card className="relative box-border w-[300px]" id={String(memo.id)} {...props}>
      <CardHeader>
        <Link className="flex gap-2" href={memo.url} target="_blank">
          {memo?.favIconUrl ? (
            <Image
              src={memo.favIconUrl}
              width={16}
              height={16}
              alt="favicon"
              className="float-left"
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <></>
          )}
          <span className="line-clamp-1 font-bold">{memo.title}</span>
        </Link>
      </CardHeader>
      {memo.memo && (
        <CardContent className="whitespace-break-spaces break-all">
          {memo.memo}
          <div className="text-right text-xs text-stone-500">{formatDate(memo.updated_at, 'mm/dd')}</div>
        </CardContent>
      )}

      {isHovered ? (
        <span className="absolute right-4 top-6 cursor-pointer" onClick={handleDeleteClick}>
          X
        </span>
      ) : (
        ''
      )}
    </Card>
  );
}
