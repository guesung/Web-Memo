'use server';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@src/components/ui/tooltip';

import { SidebarTrigger } from '@src/components/ui/sidebar';
import { LanguageType } from '@src/app/i18n/type';
import useTranslation from '@src/app/i18n/server';

interface MemoSidebarTriggerProps extends LanguageType {}

export default async function MemoSidebarTrigger({ lng }: MemoSidebarTriggerProps) {
  const { t } = await useTranslation(lng);

  return (
    <div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger />
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('tooltip.sideBar')}</p>
            <p>Control/Command + B</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
