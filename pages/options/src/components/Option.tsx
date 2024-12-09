import { STORAGE_KEYS } from '@extension/shared/constants';
import { useDidMount } from '@extension/shared/hooks';
import { Storage } from '@extension/shared/utils/extension';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@extension/ui';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

export default function Option() {
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      youtubePrompt: '',
      webPrompt: '',
      language: 'ko',
    },
  });

  const onSubmit = handleSubmit(async data => {
    await Storage.set(STORAGE_KEYS.youtubePrompts, data.youtubePrompt);
    await Storage.set(STORAGE_KEYS.webPrompts, data.webPrompt);
    await Storage.set(STORAGE_KEYS.language, data.language);

    toast({
      title: '설정이 저장되었습니다.',
    });
  });

  useEffect(() => {
    const fetchStorage = async () => {
      const language = await Storage.get<string>(STORAGE_KEYS.language);
      const youtubePrompts = await Storage.get<string>(STORAGE_KEYS.youtubePrompts);
      const webPrompts = await Storage.get<string>(STORAGE_KEYS.webPrompts);

      setValue('language', language);
      setValue('youtubePrompt', youtubePrompts);
      setValue('webPrompt', webPrompts);
    };

    fetchStorage();
  }, [setValue]);

  return (
    <div className="container mx-auto space-y-8 p-4">
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">언어 설정</h2>
        <Select value={watch('language')} onValueChange={value => setValue('language', value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="언어 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ko">한국어</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <form onSubmit={onSubmit} className="space-y-8">
        <section>
          <h2 className="mb-4 text-xl font-semibold">YouTube 프롬프트 설정</h2>
          <div className="space-y-2 rounded-lg p-4">
            <div className="flex-1">
              <Textarea placeholder="프롬프트를 입력하세요" {...register('youtubePrompt')} className="min-h-[200px]" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">웹사이트 프롬프트 설정</h2>
          <div className="space-y-2 rounded-lg p-4">
            <div className="flex-1">
              <Textarea placeholder="프롬프트를 입력하세요" {...register('webPrompt')} className="min-h-[200px]" />
            </div>
          </div>
        </section>

        <Button type="submit">저장</Button>
      </form>
    </div>
  );
}
