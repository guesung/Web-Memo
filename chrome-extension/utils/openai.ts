import { CONFIG } from "@extension/shared/constants";
import OpenAI from "openai";

export const openai = new OpenAI({
	apiKey: CONFIG.openApiKey,
});
