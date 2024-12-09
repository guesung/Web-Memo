import { DEFAULT_PROMPTS, LANGUAGE_MAP, PROMPT, STORAGE_KEYS } from '@src/constants';
import { Category, Storage } from '@src/utils/extension';

interface GetSystemPromptProps {
  language: string;
  category: Category;
}

export const getSystemPrompt = async ({ language, category }: GetSystemPromptProps) => {
  const youtubePrompts = (await Storage.get(STORAGE_KEYS.youtubePrompts)) ?? DEFAULT_PROMPTS.youtube;
  const webPrompts = (await Storage.get(STORAGE_KEYS.webPrompts)) ?? DEFAULT_PROMPTS.web;

  const languagePrompt = `${PROMPT.language} ${LANGUAGE_MAP[language] ?? 'Korean'}`.repeat(3);

  if (category === 'youtube') return `${youtubePrompts} ${languagePrompt} ${PROMPT.default}`;
  return `${webPrompts} ${languagePrompt} ${PROMPT.default}`;
};
