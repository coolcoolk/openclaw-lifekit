import type { LifeKitAIAdapter, Message } from "./types";

export class OpenClawAdapter implements LifeKitAIAdapter {
  name = "openclaw";

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    const allMessages: Message[] = [];

    if (systemPrompt) {
      allMessages.push({ role: "system", content: systemPrompt });
    }

    allMessages.push(...messages.filter((m) => m.role !== "system"));

    const body = {
      model: process.env.OPENCLAW_AGENT_ID
        ? `openclaw:${process.env.OPENCLAW_AGENT_ID}`
        : "openclaw:main",
      messages: allMessages,
      max_tokens: 1024,
    };

    const url = process.env.OPENCLAW_GATEWAY_URL
      ? `${process.env.OPENCLAW_GATEWAY_URL}/v1/chat/completions`
      : "http://localhost:18789/v1/chat/completions";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN || ""}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[OpenClaw] API error:", res.status, err);
        return `[AI 오류] OpenClaw API 호출 실패 (${res.status})`;
      }

      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
      };

      return data.choices?.[0]?.message?.content ?? "[AI 오류] 빈 응답";
    } catch (err) {
      console.error("[OpenClaw] Connection error:", err);
      return `[AI 오류] OpenClaw 게이트웨이(${url})에 연결할 수 없습니다. OpenClaw가 실행 중인지 확인해주세요.`;
    }
  }
}
