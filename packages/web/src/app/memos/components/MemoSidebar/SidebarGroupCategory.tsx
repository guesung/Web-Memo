'use client';

import { useCategoryQuery, useSearchParamsRouter } from '@extension/shared/hooks';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@src/components/ui/sidebar';
import { getSupabaseClient } from '@src/utils/supabase.client';
import SidebarMenuItemAddCategory from './SidebarMenuItemAddCategory';
import { memo, MouseEventHandler, useCallback } from 'react';

export default memo(function SidebarGroupCategory() {
  const { categories } = useCategoryQuery({
    supabaseClient: getSupabaseClient(),
  });
  const categorySearchParamsRouter = useSearchParamsRouter('category');

  const handleCategoryClick: MouseEventHandler<HTMLButtonElement> = event => {
    const category = event.currentTarget.id;

    categorySearchParamsRouter.set(category, { removeOthers: true, scroll: true });
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>카테고리 모아보기</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {categories?.map(category => (
            <SidebarMenuItem key={category.name}>
              <SidebarMenuButton asChild>
                <button id={category.name} onClick={handleCategoryClick}>
                  <span>{category.name}</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItemAddCategory />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});
