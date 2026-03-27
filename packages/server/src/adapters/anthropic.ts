import type { LifeKitAIAdapter, Message } from "./types";

export class AnthropicAdapter implements LifeKitAIAdapter {
  name = "anthropic";
  private apiKey: string;
  private model = "claude-3-haiku-20240307";

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
    }
    this.apiKey = key;
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 1024,
      messages: anthropicMessages,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[Anthropic] API error:", res.status, err);
        return `[AI 오류] Anthropic API 호출 실패 (${res.status}). 잠시 후 다시 시도해주세요.`;
      }

      const data = (await res.json()) as {
        content: { type: string; text: string }[];
      };

      return data.content[0]?.text ?? "[AI 오류] 빈 응답";
    } catch (err) {
      console.error("[Anthropic] Network error:", err);
      return "[AI 오류] Anthropic API에 연결할 수 없습니다. 네트워크를 확인해주세요.";
    }
  }
}
