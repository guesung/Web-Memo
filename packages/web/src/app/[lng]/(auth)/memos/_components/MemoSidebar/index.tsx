'use server';

import { PATHS } from '@extension/shared/constants';
import { HeaderMargin } from '@src/components/Header';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarSeparator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@src/components/ui';
import type { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.server';
import { Heart, Home, SettingsIcon } from 'lucide-react';
import Link from 'next/link';

import SidebarGroupCategory from './SidebarGroupCategory';
import SidebarGroupTags from './SidebarGroupTags';

export default async function MemoSidebar({ lng }: LanguageType) {
  const { t } = await useTranslation(lng);

  return (
    <Sidebar>
      <HeaderMargin />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <Link href={PATHS.memos}>
                <SidebarMenuButton>
                  <Home className="h-4 w-4" />
                  <span>{t('sideBar.memo')}</span>
                </SidebarMenuButton>
              </Link>
              <Link href={PATHS.memosWish}>
                <SidebarMenuButton>
                  <Heart className="h-4 w-4" />
                  <span>{t('sideBar.wishList')}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroupCategory lng={lng} />

        <SidebarSeparator />

        <SidebarGroupTags lng={lng} />
      </SidebarContent>

      <SidebarFooter className="p-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={PATHS.memosSetting}>
                <SidebarMenuButton>
                  <SettingsIcon className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </SidebarMenuButton>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </SidebarFooter>
    </Sidebar>
  );
}
