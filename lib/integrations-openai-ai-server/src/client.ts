import OpenAI from "openai";

const baseURL =
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
  "https://api.openai.com/v1";

const apiKey =
  process.env.OPENAI_API_KEY ||
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(
    "No OpenAI API key found. Set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY.",
  );
}

export const openai = new OpenAI({ apiKey, baseURL });
