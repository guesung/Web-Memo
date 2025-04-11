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
              <Link href={`/memos?category=${encodeURIComponent(category.name)}`}>
                <SidebarMenuButton>
                  <span className={`${currentCategory === category.name ? 'font-bold' : ''}`}>{category.name}</span>
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
