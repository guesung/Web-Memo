import { Calendar, Home, Inbox, Search, Settings } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './sidebar';
import Header from '../Header';

const items = [
  {
    title: '메모',
    url: '/',
    icon: Home,
  },
  {
    title: '위시리스트',
    url: '?wish=true',
    icon: Inbox,
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <Header.Margin />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>메모</SidebarGroupLabel>
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
