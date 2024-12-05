import {
  useCategoryDeleteMutation,
  useCategoryPostMutation,
  useCategoryQuery,
  useCategoryUpsertMutation,
} from '@extension/shared/hooks';
import { Button, Label } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { TrashIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

interface CategoryForm {
  categories: {
    id: number;
    name: string;
  }[];
}

interface SettingCategoryFormProps extends LanguageType {}

export default function SettingCategoryForm({ lng }: SettingCategoryFormProps) {
  const { t } = useTranslation(lng);

  const { categories } = useCategoryQuery();
  const { mutate: deleteCategory } = useCategoryDeleteMutation();
  const { mutate: upsertCategory } = useCategoryUpsertMutation();
  const { mutate: insertCategory } = useCategoryPostMutation();
  const { register, handleSubmit, setValue } = useForm<CategoryForm>({
    defaultValues: {
      categories: [],
    },
  });

  const handleAddCategory = () => {
    const defaultCategoryName = t('setting.defaultCategoryName');

    insertCategory({ name: defaultCategoryName });
  };

  const handleCategoryDelete = (id: number) => {
    deleteCategory(id, {});
  };

  const onCategoryFormSubmit = (data: CategoryForm) => {
    upsertCategory({ categoryRequest: data.categories }, {});
  };

  useEffect(() => {
    if (!categories) return;

    setValue(
      'categories',
      categories.map(category => ({ id: category.id, name: category.name })),
    );
  }, [categories, setValue]);

  return (
    <form className="grid grid-cols-12" onSubmit={handleSubmit(onCategoryFormSubmit)}>
      <Label className="col-span-4 grid place-items-center">{t('setting.category')}</Label>
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
              type="button"
              onClick={() => handleCategoryDelete(id)}>
              <TrashIcon size={16} />
            </Button>
          </div>
        ))}
        <Button variant="outline" className="w-full" onClick={handleAddCategory} type="button">
          {t('setting.addCategory')}
        </Button>
      </div>
      <div className="col-span-2 grid place-items-center">
        <Button type="submit" variant="outline">
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
