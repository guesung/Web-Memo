import { Button, Form, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@extension/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

export default function Option() {
  const [error, setError] = useState('');

  const youtubeForm = useForm({
    defaultValues: {
      prompts: [{ text: '', language: 'ko' }],
    },
  });

  const webForm = useForm({
    defaultValues: {
      prompts: [{ text: '', language: 'ko' }],
    },
  });

  const handleSubmit = (data: { prompts: Array<{ text: string; language: string }> }) => {
    if (data.prompts[0].text.length > 1000) {
      setError('프롬프트는 최대 1000자까지만 입력할 수 있습니다.');
      return;
    }

    setError('');
  };

  return (
    <div className="container mx-auto space-y-8 p-4">
      <section>
        <h2 className="mb-4 text-xl font-semibold">YouTube 프롬프트 설정</h2>
        <Form {...youtubeForm}>
          <form onSubmit={youtubeForm.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <textarea
                    className="border-input bg-background min-h-[100px] w-full rounded-md border px-3 py-2"
                    placeholder="프롬프트를 입력하세요"
                    {...youtubeForm.register('prompts.0.text')}
                  />
                </div>
                <Select
                  defaultValue="ko"
                  onValueChange={(value: string) => youtubeForm.setValue('prompts.0.language', value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="언어 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit">저장</Button>
          </form>
        </Form>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">웹사이트 프롬프트 설정</h2>
        <Form {...webForm}>
          <form onSubmit={webForm.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <textarea
                    className="border-input bg-background min-h-[100px] w-full rounded-md border px-3 py-2"
                    placeholder="프롬프트를 입력하세요"
                    {...webForm.register('prompts.0.text')}
                  />
                </div>
                <Select
                  defaultValue="ko"
                  onValueChange={(value: string) => webForm.setValue('prompts.0.language', value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="언어 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit">저장</Button>
          </form>
        </Form>
      </section>

      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
