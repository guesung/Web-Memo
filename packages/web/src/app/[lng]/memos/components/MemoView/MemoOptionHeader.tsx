import { MemoRow } from '@extension/shared/types';
import { LanguageType } from '@src/modules/i18n';

import MemoOption from '../MemoCardFooter/MemoOption';

interface MemoOptionHeaderProps extends LanguageType {
  selectedMemos: MemoRow[];
}

export default function MemoOptionHeader({ selectedMemos, lng }: MemoOptionHeaderProps) {
  if (selectedMemos.length === 0) return null;
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-12 w-full items-center justify-between bg-white shadow-sm">
      <div className="flex items-center gap-2 px-4">
        <span className="text-md font-semibold">{selectedMemos.length}개 선택</span>
      </div>
      <div className="flex items-center gap-2 px-4">
        <MemoOption memos={selectedMemos} lng={lng} />
      </div>
    </header>
  );
}
