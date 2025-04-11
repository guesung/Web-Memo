'use client';

import { PATHS } from '@extension/shared/constants';
import { useMemosQuery } from '@extension/shared/hooks';
import type { MemoRow } from '@extension/shared/types';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@src/components/ui';
import type { Language } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TagInfo {
  name: string;
  count: number;
}

export default function SidebarGroupTags({ lng }: { lng: Language }) {
  const { t } = useTranslation(lng);
  const { memos } = useMemosQuery();
  const searchParams = useSearchParams();
  const currentTag = searchParams.get('tag');
  const [tags, setTags] = useState<TagInfo[]>([]);

  useEffect(() => {
    const tagMap = new Map<string, number>();

    memos.forEach((memo: MemoRow) => {
      memo.tags?.forEach((tag: string) => {
        const count = tagMap.get(tag) || 0;
        tagMap.set(tag, count + 1);
      });
    });

    setTags(
      Array.from(tagMap.entries())
        .map(([name, count]): TagInfo => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    );
  }, [memos]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('sideBar.tags')}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {tags?.map(tag => (
            <SidebarMenuItem key={tag.name}>
              <Link
                key={tag.name}
                href={`${PATHS.memos}?tag=${encodeURIComponent(tag.name)}`}
                className="w-full"
                replace>
                <SidebarMenuButton
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 ${
                    currentTag === tag.name
                      ? 'bg-gray-100 font-medium dark:bg-gray-800'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  } `}>
                  <span># {tag.name}</span>
                  <span
                    className={`text-xs ${
                      currentTag === tag.name ? 'text-orange-600/80 dark:text-orange-300/80' : 'text-muted-foreground'
                    }`}>
                    {tag.count}
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
