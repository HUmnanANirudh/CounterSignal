import { useMutation } from "@tanstack/react-query";
import {BattlecardResult} from "@/types";

async function fetchBattlecard(competitor: string): Promise<BattlecardResult> {
  const response = await fetch("/api/battlecard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ competitorName: competitor }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  let markdown = "";
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "chunk" && parsed.content) {
            markdown += parsed.content;
          }
          if (parsed.type === "error") {
            throw new Error(parsed.message || "Pipeline error");
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }

  if (!markdown) {
    return { markdown: "", error: "No content received" };
  }

  return { markdown };
}

export function useBattlecard() {
  return useMutation({
    mutationFn: fetchBattlecard,
  });
}