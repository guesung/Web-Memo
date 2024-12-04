'use client';

import { MOTION_VARIANTS, PATHS, QUERY_KEY } from '@extension/shared/constants';
import {
  useCategoryDeleteMutation,
  useCategoryPostMutation,
  useCategoryQuery,
  useCategoryUpsertMutation,
} from '@extension/shared/hooks';
import { LocalStorage } from '@extension/shared/modules/local-storage';
import { Button } from '@src/components/ui/button';
import { Label } from '@src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@src/components/ui/select';
import { useLanguage, useSupabaseClient } from '@src/hooks';
import { useToast } from '@src/hooks/use-toast';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface SettingProps extends LanguageType {}

interface CategoryForm {
  categories: {
    id: number;
    name: string;
  }[];
}

export default function Setting({ lng }: SettingProps) {
  const { t } = useTranslation(lng);
  const { language, setLanguageRouter } = useLanguage();
  const router = useRouter();
  const supabaseClient = useSupabaseClient();
  const { categories } = useCategoryQuery({ supabaseClient });
  const { mutate: deleteCategory } = useCategoryDeleteMutation({ supabaseClient });
  const { mutate: upsertCategory } = useCategoryUpsertMutation({ supabaseClient });
  const { mutate: insertCategory } = useCategoryPostMutation({ supabaseClient });
  const { register, handleSubmit, setValue, watch } = useForm<CategoryForm>({
    defaultValues: {
      categories: [],
    },
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log(watch('categories'));

  const handleRestartGuide = () => {
    LocalStorage.remove('guide');
    router.push(PATHS.memos);
  };

  const handleAddCategory = () => {
    insertCategory({ name: '' });
  };

  const handleCategoryDelete = (id: number) => {
    deleteCategory({ id });
  };

  const onCategoryFormSubmit = (data: CategoryForm) => {
    console.log(data);
    upsertCategory(
      { categoryRequest: data.categories },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
          toast({
            title: '카테고리 저장 완료',
          });
        },
      },
    );
  };

  useEffect(() => {
    if (!categories) return;

    setValue(
      'categories',
      categories.map(category => ({ id: category.id, name: category.name })),
    );
  }, [categories, setValue]);

  return (
    <motion.section
      className="grid gap-6"
      variants={MOTION_VARIANTS.fadeInAndOut}
      initial="initial"
      animate="animate"
      exit="exit">
      <div className="grid grid-cols-12">
        <Label className="col-span-4 grid place-items-center">{t('setting.language')}</Label>
        <Select onValueChange={setLanguageRouter} value={language} aria-label={t('setting.selectLanguage')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ko">한글</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-12">
        <Label className="col-span-4 grid place-items-center">가이드</Label>
        <Button variant="outline" className="col-span-2" onClick={handleRestartGuide}>
          가이드 다시 시작하기
        </Button>
      </div>
      <form className="grid grid-cols-12" onSubmit={handleSubmit(onCategoryFormSubmit)}>
        <Label className="col-span-4 grid place-items-center">카테고리</Label>
        <div className="col-span-6 space-y-2">
          {categories?.map(({ id }, index) => (
            <div key={id} className="flex items-center gap-2">
              <input
                type="text"
                {...register(`categories.${index}.name`)}
                className="border-input focus-visible:ring-ring h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive h-9 w-9"
                onClick={() => handleCategoryDelete(id)}>
                <span className="sr-only">Delete category</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </Button>
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={handleAddCategory}>
            {t('setting.addCategory')}
          </Button>
        </div>
        <div className="col-span-2 grid place-items-center">
          <Button type="submit" variant="outline">
            저장
          </Button>
        </div>
      </form>
    </motion.section>
  );
}
