import { Heart, Home, SettingsIcon } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@src/components/ui/sidebar';
import Header from '../Header';
import { useCategoryQuery } from '@extension/shared/hooks';
import { getSupabaseClient } from '@src/utils/supabase.client';
import SidebarGroupCategory from './SidebarGroupCategory';
import Link from 'next/link';
import SidebarMenuItemAddCategory from './SidebarMenuItemAddCategory';

const items = [
  {
    title: '메모',
    url: '/memos',
    icon: Home,
  },
  {
    title: '위시리스트',
    url: '/memos?wish=true',
    icon: Heart,
  },
];

export default function MemoSidebar() {
  return (
    <Sidebar>
      <Header.Margin />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroupCategory />

        <SidebarMenuItemAddCategory />
      </SidebarContent>
      <SidebarFooter>
        <Link href="/setting" className="mb-2 ml-2 cursor-pointer">
          <SettingsIcon size={16} />
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
