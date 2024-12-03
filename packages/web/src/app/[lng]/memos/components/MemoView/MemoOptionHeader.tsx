import { MemoRow } from '@extension/shared/types';
import { Button } from '@src/components/ui/button';
import { LanguageType } from '@src/modules/i18n';
import { XIcon } from 'lucide-react';

import MemoOption from '../MemoCardFooter/MemoOption';

interface MemoOptionHeaderProps extends LanguageType {
  selectedMemos: MemoRow[];
  onXButtonClick: () => void;
}

export default function MemoOptionHeader({ selectedMemos, lng, onXButtonClick }: MemoOptionHeaderProps) {
  if (selectedMemos.length === 0) return null;
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-12 w-full items-center justify-between bg-white px-4 shadow-sm">
      <Button variant="ghost" size="icon" onClick={onXButtonClick}>
        <XIcon className="h-6 w-6" />
      </Button>
      <div className="flex items-center gap-2 px-4">
        <span className="text-md font-semibold">{selectedMemos.length}개 선택됨</span>
      </div>
      <div className="flex items-center gap-2 px-4">
        <MemoOption memos={selectedMemos} lng={lng} />
      </div>
    </header>
  );
}
