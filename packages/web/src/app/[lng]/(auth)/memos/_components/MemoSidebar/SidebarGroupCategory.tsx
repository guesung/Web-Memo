'use client';

import { useCategoryQuery } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@src/components/ui';
import type { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';
import { useRouter } from 'next/navigation';
import { memo } from 'react';

import SidebarMenuItemAddCategory from './SidebarMenuItemAddCategory';

export default memo(function SidebarGroupCategory({ lng }: LanguageType) {
  const { t } = useTranslation(lng);
  const { categories } = useCategoryQuery();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('category');

  const handleCategoryClick = (category: string) => {
    searchParams.removeAll('isWish');
    searchParams.set('category', category);
    router.push(searchParams.getUrl(), { scroll: true });
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('sideBar.allCategory')}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {categories?.map(category => (
            <SidebarMenuItem key={category.id}>
              <SidebarMenuButton asChild>
                <button
                  onClick={() => handleCategoryClick(category.name)}
                  className={`hover:bg-accent flex w-full items-center justify-between rounded-md p-2 ${
                    currentCategory === category.name && 'bg-accent'
                  }`}>
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
