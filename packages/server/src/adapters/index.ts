import type { LifeKitAIAdapter } from "./types";
import { AnthropicAdapter } from "./anthropic";
import { OllamaAdapter } from "./ollama";

let cachedAdapter: LifeKitAIAdapter | null = null;

export function getAdapter(): LifeKitAIAdapter {
  if (cachedAdapter) return cachedAdapter;

  const adapterName = process.env.LIFEKIT_AI_ADAPTER || "anthropic";

  switch (adapterName) {
    case "ollama":
      cachedAdapter = new OllamaAdapter();
      break;
    case "anthropic":
    default:
      cachedAdapter = new AnthropicAdapter();
      break;
  }

  console.log(`🤖 AI adapter: ${cachedAdapter.name}`);
  return cachedAdapter;
}

export type { LifeKitAIAdapter, Message } from "./types";
