import { CONFIG } from "@extension/env";
import OpenAI from "openai";

export const openai = new OpenAI({
	apiKey: CONFIG.openApiKey,
});
