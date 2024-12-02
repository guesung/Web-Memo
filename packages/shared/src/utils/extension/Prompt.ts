import { DEFAULT_PROMPTS, LANGUAGE_MAP, PROMPT, STORAGE_KEYS } from '@src/constants';
import { Category, Storage } from '@src/utils/extension';

interface GetPromptProps {
  language: string;
  category: Category;
}

export const getPrompt = async ({ language, category }: GetPromptProps) => {
  const youtubePrompts = (await Storage.get(STORAGE_KEYS.youtubePrompts)) ?? DEFAULT_PROMPTS.youtube;
  const webPrompts = (await Storage.get(STORAGE_KEYS.webPrompts)) ?? DEFAULT_PROMPTS.web;

  const languagePrompt = `${PROMPT.language} ${LANGUAGE_MAP[language] ?? 'English'}`;

  if (category === 'youtube') return `${youtubePrompts} ${languagePrompt}`;
  return `${webPrompts} ${languagePrompt}`;
};
