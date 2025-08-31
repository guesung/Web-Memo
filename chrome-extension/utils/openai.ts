import { SERVER_CONFIG } from '@web-memo/env';
import OpenAI from "openai";

export const openai = new OpenAI({
	apiKey: SERVER_CONFIG.openApiKey,
});
