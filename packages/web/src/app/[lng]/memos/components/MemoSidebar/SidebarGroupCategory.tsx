'use client';

import { PATHS } from '@extension/shared/constants';
import { useCategoryQuery } from '@extension/shared/hooks';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@src/components/ui/sidebar';
import { useSupabaseClient } from '@src/hooks';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useRouter } from 'next/navigation';
import { memo, MouseEventHandler } from 'react';

import SidebarMenuItemAddCategory from './SidebarMenuItemAddCategory';

export default memo(function SidebarGroupCategory({ lng }: LanguageType) {
  const { t } = useTranslation(lng);
  const supabaseClient = useSupabaseClient();
  const { categories } = useCategoryQuery({
    supabaseClient,
  });
  const router = useRouter();

  const handleCategoryClick: MouseEventHandler<HTMLButtonElement> = event => {
    const category = event.currentTarget.id;

    router.push(`${PATHS.memos}?category=${category}`, { scroll: true });
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('sideBar.allCategory')}</SidebarGroupLabel>
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
