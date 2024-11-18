'use client';

import { useCategoryQuery, useSearchParamsRouter, useCategoryPostMutation } from '@extension/shared/hooks';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@src/components/ui/sidebar';
import { getSupabaseClient } from '@src/utils/supabase.client';

export default function SidebarGroupCategory() {
  const { data: categoryData } = useCategoryQuery({
    supabaseClient: getSupabaseClient(),
  });
  const categorySearchParamsRouter = useSearchParamsRouter('category');

  const handleCategoryClick = (category: string) => {
    categorySearchParamsRouter.set(category, { removeOthers: true });
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>카테고리 모아보기</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {categoryData?.data?.map(category => (
            <SidebarMenuItem key={category.name}>
              <SidebarMenuButton asChild>
                <button onClick={handleCategoryClick.bind(null, category.name)}>
                  <span>{category.name}</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
