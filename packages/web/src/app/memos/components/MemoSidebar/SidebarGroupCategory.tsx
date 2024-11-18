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

export default function SidebarGroupCategory() {
  const { categories } = useCategoryQuery({
    supabaseClient: getSupabaseClient(),
  });
  const categorySearchParamsRouter = useSearchParamsRouter('category');

  const handleCategoryClick = (category: string) => {
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
                <button onClick={handleCategoryClick.bind(null, category.name)}>
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
}
