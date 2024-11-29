import { DEFAULT_PROMPTS, PROMPT, STORAGE_KEYS } from '@src/constants';
import { Storage } from '@src/utils/extension';

interface GetPromptProps {
  language: string;
  type: string;
}

export const getPrompt = async ({ language, type }: GetPromptProps) => {
  const youtubePrompts = (await Storage.get(STORAGE_KEYS.youtubePrompts)) ?? DEFAULT_PROMPTS.youtube;
  const webPrompts = (await Storage.get(STORAGE_KEYS.webPrompts)) ?? DEFAULT_PROMPTS.web;

  const languagePrompt = `${PROMPT.language} ${language}`;

  if (type === 'youtube') return youtubePrompts + languagePrompt;
  return webPrompts + languagePrompt;
};
