import { CONFIG } from "@web-memo/env";
import OpenAI from "openai";

export const openai = new OpenAI({
	apiKey: CONFIG.openApiKey,
});
