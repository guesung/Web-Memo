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
} from '@src/components/ui';
import type { Language } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';
import Link from 'next/link';
import { useMemo } from 'react';

interface TagInfo {
  name: string;
  count: number;
}

export default function SidebarGroupTags({ lng }: { lng: Language }) {
  const { t } = useTranslation(lng);
  const { memos } = useMemosQuery();

  const tags = useMemo(() => {
    const tagMap = new Map<string, number>();

    memos.forEach((memo: MemoRow) => {
      memo.tags?.forEach((tag: string) => {
        const count = tagMap.get(tag) || 0;
        tagMap.set(tag, count + 1);
      });
    });

    return Array.from(tagMap.entries())
      .map(([name, count]): TagInfo => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [memos]);

  if (tags.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('sideBar.tags')}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {tags.map(tag => (
            <Link key={tag.name} href={`${PATHS.memos}?tag=${encodeURIComponent(tag.name)}`}>
              <SidebarMenuButton>
                <span className={tag.count >= 10 ? 'font-bold' : tag.count >= 5 ? 'font-medium' : ''}>{tag.name}</span>
                <span className="text-muted-foreground ml-auto text-xs">{tag.count}</span>
              </SidebarMenuButton>
            </Link>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
