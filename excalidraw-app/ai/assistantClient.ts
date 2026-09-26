import { parseSSEStream } from "@excalidraw/excalidraw";
import { safelyParseJSON } from "@excalidraw/common";

import { AI_BACKEND_URL } from "./bridgeClient";

export type AssistantMessage = { role: "user" | "assistant"; content: string };

export type AssistantEvent =
  | { type: "content"; delta: string }
  | { type: "status"; status: "thinking" }
  | {
      type: "tool";
      id: string;
      name: string;
      summary: string;
      state: "running" | "done" | "error";
    }
  | { type: "error"; error: { message: string } }
  | { type: "done"; finishReason: string | null };

/** Stream one assistant turn. Resolves when the stream ends. */
export const streamAssistant = async ({
  messages,
  tabId,
  selectedIds,
  signal,
  onEvent,
}: {
  messages: readonly AssistantMessage[];
  tabId: string;
  selectedIds: readonly string[];
  signal: AbortSignal;
  onEvent: (event: AssistantEvent) => void;
}) => {
  const response = await fetch(
    `${AI_BACKEND_URL}/v1/ai/assistant/chat-streaming`,
    {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, tabId, selectedIds }),
      signal,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(safelyParseJSON(text)?.message || text || "Request failed");
  }
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response stream");
  }

  for await (const data of parseSSEStream(reader)) {
    if (data === "[DONE]") {
      break;
    }
    const event = safelyParseJSON(data) as AssistantEvent | null;
    if (event) {
      onEvent(event);
    }
  }
};
