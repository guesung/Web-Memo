import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@src/components/ui/tooltip';

import { SidebarTrigger } from '@src/components/ui/sidebar';

export default function MemoSidebarTrigger() {
  return (
    <div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger />
          </TooltipTrigger>
          <TooltipContent>
            <p>사이드바 토글</p>
            <p>Command + B</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
