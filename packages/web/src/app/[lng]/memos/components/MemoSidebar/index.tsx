'use server';

import { Heart, Home, SettingsIcon } from 'lucide-react';

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
} from '@src/components/ui/sidebar';
import Link from 'next/link';
import Header from '../Header';
import SidebarGroupCategory from './SidebarGroupCategory';
import { LanguageType } from '@src/app/i18n/type';
import useTranslation from '@src/app/i18n/server';

const items = [
  {
    i18n: 'sideBar.memo',
    url: '/memos',
    icon: Home,
  },
  {
    i18n: 'sideBar.wishList',
    url: '/memos?wish=true',
    icon: Heart,
  },
];

export default async function MemoSidebar({ lng }: LanguageType) {
  const { t } = await useTranslation(lng);

  return (
    <Sidebar>
      <Header.Margin />

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
      {/* <SidebarFooter>
        <Link href="/setting" className="mb-2 ml-2 cursor-pointer">
          <SettingsIcon size={16} />
        </Link>
      </SidebarFooter> */}
    </Sidebar>
  );
}
