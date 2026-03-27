export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LifeKitAIAdapter {
  name: string;
  chat(messages: Message[], systemPrompt?: string): Promise<string>;
}
