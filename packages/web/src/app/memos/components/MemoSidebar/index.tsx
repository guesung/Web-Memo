import { Heart, Home } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
      </SidebarContent>
    </Sidebar>
  );
}
