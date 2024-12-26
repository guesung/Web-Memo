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
} from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useRouter } from 'next/navigation';
import { memo } from 'react';

import SidebarMenuItemAddCategory from './SidebarMenuItemAddCategory';
import { useSearchParams } from '@extension/shared/modules/search-params';

export default memo(function SidebarGroupCategory({ lng }: LanguageType) {
  const { t } = useTranslation(lng);
  const { categories } = useCategoryQuery();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCategoryClick = (category: string) => {
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
                  className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2">
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
