'use client';

import { Heart, Home } from 'lucide-react';

import { useCategoryQuery, useSearchParamsRouter } from '@extension/shared/hooks';
import {
  SidebarGroup,
  SidebarGroupContent,
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
    categorySearchParamsRouter.set(category);
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {categoryData?.data?.map(category => (
            <SidebarMenuItem key={category.name}>
              <SidebarMenuButton asChild>
                <button onClick={handleCategoryClick.bind(null, category?.name)}>
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
