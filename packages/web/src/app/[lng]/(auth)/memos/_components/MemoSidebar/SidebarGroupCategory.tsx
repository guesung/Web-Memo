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
import Link from 'next/link';
import { memo } from 'react';

import SidebarMenuItemAddCategory from './SidebarMenuItemAddCategory';

export default memo(function SidebarGroupCategory({ lng }: LanguageType) {
  const { t } = useTranslation(lng);
  const { categories } = useCategoryQuery();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('sideBar.allCategory')}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {categories?.map(category => (
            <SidebarMenuItem key={category.id}>
              <Link href={`/memos?category=${encodeURIComponent(category.name)}`} className="w-full">
                <SidebarMenuButton
                  className={`w-full rounded-md px-3 py-2 ${
                    currentCategory === category.name
                      ? 'bg-orange-100 font-medium text-orange-600 dark:bg-orange-900/30 dark:text-orange-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  } `}>
                  <span>{category.name}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItemAddCategory />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});
