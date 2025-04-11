'use client';

import { useCategoryQuery, useMemosQuery } from '@extension/shared/hooks';
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
import { memo, useMemo } from 'react';

export default memo(function SidebarGroupCategory({ lng }: LanguageType) {
  const { t } = useTranslation(lng);
  const { categories } = useCategoryQuery();
  const { memos } = useMemosQuery();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');

  const memoCounts = useMemo(() => {
    if (!memos || !categories) return {};

    return memos.reduce(
      (acc, memo) => {
        if (!memo.category_id) return acc;
        acc[memo.category_id] = (acc[memo.category_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [memos, categories]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('sideBar.allCategory')}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {categories?.map(category => (
            <SidebarMenuItem key={category.id}>
              <Link href={`/memos?category=${encodeURIComponent(category.name)}`} className="w-full" replace>
                <SidebarMenuButton
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 ${
                    currentCategory === category.name
                      ? 'bg-gray-100 font-medium dark:bg-gray-800'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  } `}
                  style={{
                    borderLeft: `4px solid ${category.color || 'transparent'}`,
                    backgroundColor:
                      currentCategory === category.name
                        ? category.color
                          ? `${category.color}20`
                          : 'bg-gray-100'
                        : 'transparent',
                  }}>
                  <span>{category.name}</span>
                  <span
                    className={`text-xs ${
                      currentCategory === category.name
                        ? 'text-orange-600/80 dark:text-orange-300/80'
                        : 'text-muted-foreground'
                    }`}>
                    {memoCounts[category.id] ?? 0}
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});
