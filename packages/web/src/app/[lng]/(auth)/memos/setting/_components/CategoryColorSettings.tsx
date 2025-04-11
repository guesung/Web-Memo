'use client';

import { useCategoryQuery, useCategoryUpsertMutation } from '@extension/shared/hooks';
import { Card, CardContent, CardHeader, CardTitle, Input } from '@src/components/ui';
import type { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';

export default function CategoryColorSettings({ lng }: LanguageType) {
  const { t } = useTranslation(lng);
  const { categories } = useCategoryQuery();
  const { mutate: upsertCategory } = useCategoryUpsertMutation();

  const handleColorChange = (categoryId: number, color: string) => {
    const category = categories?.find(c => c.id === categoryId);
    if (!category) return;

    upsertCategory({
      ...category,
      color,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.categoryColors')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories?.map(category => (
            <div key={category.id} className="flex items-center gap-4">
              <span className="w-32">{category.name}</span>
              <Input
                type="color"
                value={category.color || '#000000'}
                onChange={e => handleColorChange(category.id, e.target.value)}
                className="h-8 w-20"
              />
              <div
                className="h-8 w-32 rounded border"
                style={{
                  backgroundColor: category.color + '20',
                  borderColor: category.color,
                }}>
                {t('settings.preview')}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
