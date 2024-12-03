import { Button } from '@src/components/ui/button';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { TrashIcon } from 'lucide-react';

import MemoOption from '../MemoCardFooter/MemoOption';

interface MemoOptionHeaderProps extends LanguageType {
  selectedMemoLength: number;
}

export default function MemoOptionHeader({ selectedMemoLength, lng }: MemoOptionHeaderProps) {
  const { t } = useTranslation(lng);

  if (selectedMemoLength === 0) return null;
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-12 w-full items-center justify-between bg-white shadow-sm">
      <div className="flex items-center gap-2 px-4">
        <span className="text-md font-semibold">{selectedMemoLength}개 선택</span>
      </div>
      <div className="flex items-center gap-2 px-4">
        <MemoOption memoId={memo.id} lng={lng} />
      </div>
    </header>
  );
}
