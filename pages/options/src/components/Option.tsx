import { STORAGE_KEYS } from '@extension/shared/constants';
import { useDidMount } from '@extension/shared/hooks';
import { Storage } from '@extension/shared/utils/extension';
import { Button, Form, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@extension/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

export default function Option() {
  const [error, setError] = useState('');

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      youtubePrompt: '',
      webPrompt: '',
      language: 'ko',
    },
  });

  const onSubmit = handleSubmit(data => {
    if (data.youtubePrompt.length > 1000 || data.webPrompt.length > 1000) {
      setError('프롬프트는 최대 1000자까지만 입력할 수 있습니다.');
      return;
    }

    Storage.set(STORAGE_KEYS.youtubePrompts, data.youtubePrompt);
    Storage.set(STORAGE_KEYS.webPrompts, data.webPrompt);
    setError('');
  });

  useDidMount(async () => {
    const language = await Storage.get<string>(STORAGE_KEYS.language);
    const youtubePrompts = await Storage.get<string>(STORAGE_KEYS.youtubePrompts);
    const webPrompts = await Storage.get<string>(STORAGE_KEYS.webPrompts);

    setValue('language', language);
    setValue('youtubePrompt', youtubePrompts);
    setValue('webPrompt', webPrompts);
  });

  return (
    <div className="container mx-auto space-y-8 p-4">
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">언어 설정</h2>
        <Select defaultValue="ko" onValueChange={value => setValue('language', value)} value={watch('language')}>
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
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex-1">
              <textarea
                className="border-input bg-background min-h-[400px] w-full rounded-md border px-3 py-2"
                placeholder="프롬프트를 입력하세요"
                {...register('youtubePrompt')}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">웹사이트 프롬프트 설정</h2>
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex-1">
              <textarea
                className="border-input bg-background min-h-[400px] w-full rounded-md border px-3 py-2"
                placeholder="프롬프트를 입력하세요"
                {...register('webPrompt')}
              />
            </div>
          </div>
        </section>

        <Button type="submit">저장</Button>
      </form>

      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
