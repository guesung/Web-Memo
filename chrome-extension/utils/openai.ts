import { OPENAI_API_KEY } from '@root/constants';
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});
