'use server';

import { SidebarTrigger } from '@src/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@src/components/ui/tooltip';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/server';

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
