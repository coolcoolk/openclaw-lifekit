import type { LifeKitAIAdapter, Message } from "./types";

export class OllamaAdapter implements LifeKitAIAdapter {
  name = "ollama";
  private model: string;
  private baseUrl: string;

  constructor() {
    this.model = process.env.OLLAMA_MODEL || "llama3.2";
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    const ollamaMessages: Message[] = [];

    if (systemPrompt) {
      ollamaMessages.push({ role: "system", content: systemPrompt });
    }

    ollamaMessages.push(...messages.filter((m) => m.role !== "system"));

    try {
      const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: ollamaMessages,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[Ollama] API error:", res.status, err);
        return `[AI 오류] Ollama API 호출 실패 (${res.status}). Ollama가 실행 중인지 확인해주세요.`;
      }

      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
      };

      return data.choices[0]?.message?.content ?? "[AI 오류] 빈 응답";
    } catch (err) {
      console.error("[Ollama] Connection error:", err);
      return `[AI 오류] Ollama 서버(${this.baseUrl})에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요.`;
    }
  }
}
