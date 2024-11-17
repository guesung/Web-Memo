import { Heart, Home } from 'lucide-react';

import Header from '../Header';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from './sidebar';
import { RefreshButton } from '@src/app/memos/components';

const items = [
  {
    title: '메모',
    url: '/',
    icon: Home,
  },
  {
    title: '위시리스트',
    url: '?wish=true',
    icon: Heart,
  },
];

export function AppSidebar() {
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
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
