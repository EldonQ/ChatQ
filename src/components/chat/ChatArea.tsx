"use client";

import { useEffect } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@assistant-ui/react-ui";
import { DefaultChatTransport } from "ai";
import { useStore } from "@/lib/store";
import { EcoQAttachmentAdapter } from "@/lib/attachment-adapter";
import { SearchSpeciesTool } from "./tools/SearchSpeciesTool";
import { FetchAndCleanTool } from "./tools/FetchAndCleanTool";
import { GenerateMapTool } from "./tools/GenerateMapTool";
import { SearchNewsTool } from "./tools/SearchNewsTool";

const attachmentAdapter = new EcoQAttachmentAdapter();

export function ChatArea() {
  const activeId = useStore((s) => s.activeId);
  const conversationId = activeId ?? "temp";
  const setChatMessages = useStore((s) => s.setChatMessages);

  const runtime = useChatRuntime({
    id: conversationId,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ conversationId }),
    }),
    adapters: {
      attachments: attachmentAdapter,
    },
  });

  useEffect(() => {
    if (!activeId) return;
    const unsubscribe = runtime.thread.subscribe(() => {
      const state = runtime.thread.getState();
      const store = useStore.getState();
      const conv = store.conversations.find((c) => c.id === activeId);
      if (conv && conv.title === "New Analysis") {
        const firstUser = state.messages.find((m) => m.role === "user");
        const textPart = firstUser?.content.find((p) => p.type === "text");
        const text = textPart && "text" in textPart ? textPart.text : undefined;
        if (text) {
          store.updateConversation(activeId, {
            title: String(text).slice(0, 40) + (String(text).length > 40 ? "…" : ""),
          });
        }
      }
    });
    return () => unsubscribe();
  }, [activeId, runtime]);

  useEffect(() => {
    if (!activeId) return;
    const unsubscribe = runtime.thread.subscribe(() => {
      const messages = runtime.thread.getState().messages;
      setChatMessages(activeId, messages as unknown[]);
    });
    return () => unsubscribe();
  }, [activeId, runtime, setChatMessages]);

  if (!activeId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="mx-auto size-14 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <svg
              className="size-7 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25a8.966 8.966 0 0 0-6 2.292m6-2.292a8.966 8.966 0 0 1 6 2.292"
              />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Select or create a conversation to begin</p>
        </div>
      </div>
    );
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread
        welcome={{
          message: "Explore species distribution data",
          suggestions: [
            { prompt: "Search for Panthera tigris and map its distribution", text: "Map tiger distribution" },
            { prompt: "Compare Panthera tigris and Panthera leo distributions", text: "Compare tigers and lions" },
            { prompt: "Find recent news about African elephant conservation", text: "Elephant conservation news" },
            { prompt: "Search for Ursus maritimus and fetch occurrence data", text: "Polar bear occurrence data" },
          ],
        }}
        composer={{ allowAttachments: true }}
        tools={[SearchSpeciesTool, FetchAndCleanTool, GenerateMapTool, SearchNewsTool]}
        strings={{
          welcome: { message: "Welcome to EcoQ" },
          composer: {
            input: { placeholder: "Ask about a species, upload a CSV, or request a distribution map..." },
          },
        }}
      />
    </AssistantRuntimeProvider>
  );
}
