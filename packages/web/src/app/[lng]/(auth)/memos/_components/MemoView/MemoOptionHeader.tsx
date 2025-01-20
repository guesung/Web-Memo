import { MOTION_VARIANTS } from '@extension/shared/constants';
import { MemoRow } from '@extension/shared/types';
import { Button } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

import MemoOption from '../MemoCardFooter/MemoOption';

interface MemoOptionHeaderProps extends LanguageType {
  selectedMemoIds: number[];
  onXButtonClick: () => void;
  closeMemoOption: () => void;
}

export default function MemoOptionHeader({ selectedMemoIds, lng, closeMemoOption }: MemoOptionHeaderProps) {
  const { t } = useTranslation(lng);

  if (selectedMemoIds.length === 0) return null;
  return (
    <motion.header
      className="bg-background fixed inset-x-0 top-0 z-50 flex h-[3.5rem] w-full items-center justify-between px-4 shadow-sm"
      variants={MOTION_VARIANTS.fadeInAndOut}
      initial="initial"
      animate="animate"
      exit="exit">
      <Button variant="ghost" size="icon" onClick={closeMemoOption}>
        <XIcon className="h-6 w-6" />
      </Button>
      <div className="flex items-center gap-2 px-4">
        <span className="text-md select-none font-semibold">
          {t('memos.selected', { count: selectedMemoIds.length })}
        </span>
      </div>
      <div className="flex items-center gap-2 px-4">
        <MemoOption memoIds={selectedMemoIds} lng={lng} closeMemoOption={closeMemoOption} />
      </div>
    </motion.header>
  );
}
