'use client';

import { useCategoryPostMutation } from '@extension/shared/hooks';
import { Button } from '@src/components/ui/button';
import { Input } from '@src/components/ui/input';
import { useSupabaseClient } from '@src/hooks';
import { PlusIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { CategoryInput } from '../../types';

export default memo(function SidebarMenuItemAddCategory() {
  const supabaseClient = useSupabaseClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const { register, handleSubmit } = useForm<CategoryInput>({
    defaultValues: {
      category: '',
    },
  });

  const { mutate: mutateCategoryPost } = useCategoryPostMutation({ supabaseClient });

  const onSubmit = handleSubmit(({ category }) => {
    mutateCategoryPost({ name: category });
  });

  const handlePlusIconClick = () => {
    setIsEditMode(true);
  };

  return (
    <div className="flex justify-center">
      {isEditMode ? (
        <form onSubmit={onSubmit}>
          <Input {...register('category')} />
        </form>
      ) : (
        <Button className="flex justify-center" role="button" onClick={handlePlusIconClick} variant="ghost" size="icon">
          <PlusIcon size={16} />
        </Button>
      )}
    </div>
  );
});
