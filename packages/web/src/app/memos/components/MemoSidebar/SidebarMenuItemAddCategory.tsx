'use client';

import { useCategoryPostMutation } from '@extension/shared/hooks';
import { Input } from '@src/components/ui/input';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface Input {
  category: string;
}

export default function SidebarMenuItemAddCategory() {
  const [isEditMode, setIsEditMode] = useState(false);
  const { register, handleSubmit } = useForm<Input>({
    defaultValues: {
      category: '',
    },
  });

  const { mutate: mutateCategoryPost } = useCategoryPostMutation({ supabaseClient: getSupabaseClient() });

  const onSubmit = handleSubmit(({ category }) => {
    mutateCategoryPost({ name: category });
  });

  const handlePlusIconClick = () => {
    setIsEditMode(true);
  };

  if (isEditMode)
    return (
      <form onSubmit={onSubmit}>
        <Input {...register('category')} />
      </form>
    );
  return (
    <p className="flex cursor-pointer justify-center">
      <PlusIcon size={16} onClick={handlePlusIconClick} />
    </p>
  );
}
