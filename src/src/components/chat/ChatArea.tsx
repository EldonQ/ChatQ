"use client";

import { useCallback, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useStore } from "@/lib/store";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

export function ChatArea() {
  const activeId = useStore((s) => s.activeId);
  const addMessage = useStore((s) => s.addMessage);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: activeId ?? undefined,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: () => {
      if (!activeId) return;
      const store = useStore.getState();
      // Sync conversation title
      const conv = store.conversations.find((c) => c.id === activeId);
      if (conv && conv.title === "New Analysis" && conv.messages.length >= 1) {
        const firstUser = conv.messages.find((m) => m.role === "user");
        if (firstUser?.content) {
          store.updateConversation(activeId, {
            title: firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? "…" : ""),
          });
        }
      }
    },
  });

  // Sync AI SDK messages to store for sidebar save/export
  useEffect(() => {
    if (activeId && messages.length > 0) {
      useStore.getState().setChatMessages(activeId, messages);
    }
  }, [activeId, messages]);

  const handleSend = useCallback(
    (text: string, file?: { name: string; content: string; isImage?: boolean }) => {
      if (!activeId || (status !== "ready" && status !== "error")) return;

      const displayText = file?.isImage
        ? "Sent an image"
        : file
          ? `Uploaded: ${file.name}`
          : text || "";

      addMessage(activeId, {
        id: `user_${Date.now()}`,
        role: "user",
        content: displayText.slice(0, 40),
        timestamp: Date.now(),
        progressSteps: [],
      });

      const files: { type: "file"; filename: string; mediaType: string; url: string }[] = [];
      if (file) {
        files.push({
          type: "file" as const,
          filename: file.name,
          mediaType: file.isImage ? `image/${file.name.split(".").pop() || "png"}` : "text/plain",
          url: file.content,
        });
      }

      sendMessage({
        text: text || (file ? `Analyze: ${file.name}` : ""),
        ...(files.length && { files }),
      });
    },
    [activeId, status, sendMessage, addMessage],
  );

  if (!activeId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No conversation selected</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MessageList messages={messages} status={status} error={error?.message} />
      <ChatInput
        onSend={handleSend}
        disabled={status !== "ready" && status !== "error"}
        isStreaming={status === "streaming" || status === "submitted"}
        onStop={stop}
      />
    </div>
  );
}
