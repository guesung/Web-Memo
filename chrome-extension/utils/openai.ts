import { OPENAI_API_KEY } from '@extension/shared/constants';
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});
