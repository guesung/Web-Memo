'use server';

import { PATHS } from '@extension/shared/constants';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/server';
import { Heart, Home, SettingsIcon } from 'lucide-react';
import Link from 'next/link';

import { HeaderMargin } from '../../../../_components/Header';
import SidebarGroupCategory from './SidebarGroupCategory';

const items = [
  {
    i18n: 'sideBar.memo',
    url: PATHS.memos,
    icon: Home,
  },
  {
    i18n: 'sideBar.wishList',
    url: PATHS.memosWish,
    icon: Heart,
  },
];

export default async function MemoSidebar({ lng }: LanguageType) {
  const { t } = await useTranslation(lng);

  return (
    <Sidebar>
      <HeaderMargin />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.i18n}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} scroll>
                      <item.icon />
                      <span>{t(item.i18n)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroupCategory lng={lng} />
      </SidebarContent>

      <SidebarFooter className="p-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Link href={PATHS.memosSetting} className="mb-2 ml-2">
                <SettingsIcon size={16} />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('tooltip.goSetting')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </SidebarFooter>
    </Sidebar>
  );
}
