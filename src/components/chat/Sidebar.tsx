"use client";

import { useSyncExternalStore } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Leaf,
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Moon,
  Sun,
  Download,
  MoreHorizontal,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { UIMessage } from "@ai-sdk/react";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function Sidebar() {
  const {
    conversations,
    activeId,
    sidebarOpen,
    chatMessages,
    setActive,
    newConversation,
    deleteConversation,
    toggleSidebar,
  } = useStore();

  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  function saveConversation(convId: string) {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;
    const msgs = (chatMessages[convId] as UIMessage[]) || [];
    const data = {
      exportedAt: new Date().toISOString(),
      conversation: {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
      },
      messages: msgs.map((m) => ({
        role: m.role,
        parts: m.parts?.map((p) => {
          if (p.type === "text") return { type: "text", text: p.text };
          if (p.type?.startsWith("tool-")) {
            return {
              type: p.type,
              state: (p as { state?: string }).state,
              input: (p as { input?: unknown }).input,
              output: (p as { output?: unknown }).output,
            };
          }
          return p;
        }),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecoq-${conv.title.slice(0, 30).replace(/[^\p{L}\p{N}]/gu, "_")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const themeToggle = (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 rounded-lg"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );

  if (!sidebarOpen) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 px-1.5 border-r border-border/50 bg-sidebar/60 backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40"
          aria-label="Open sidebar"
        >
          <PanelLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={newConversation}
          className="size-9 rounded-lg text-primary hover:bg-primary/10"
          aria-label="New analysis"
        >
          <Plus className="size-4" />
        </Button>
        <Separator className="my-1 w-5" />
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center gap-1 py-1">
            {conversations.slice(0, 6).map((conv) => (
              <Button
                key={conv.id}
                variant="ghost"
                size="icon"
                onClick={() => setActive(conv.id)}
                className={`size-9 rounded-lg ${
                  activeId === conv.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-sidebar-accent/40"
                }`}
                aria-label={conv.title}
              >
                <MessageSquare className="size-3.5" />
              </Button>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-auto">{mounted && themeToggle}</div>
      </div>
    );
  }

  return (
    <aside
      className="w-[280px] flex flex-col border-r border-border/50 bg-sidebar/60 backdrop-blur-xl shrink-0"
      aria-label="Sidebar"
    >
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <Leaf className="size-4 text-primary" />
          </div>
          <div className="leading-none">
            <h1 className="font-bold text-[15px] tracking-tight">EcoQ</h1>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">Species Distribution</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {mounted && themeToggle}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={toggleSidebar}
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        </div>
      </div>

      <div className="px-3 pb-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 rounded-lg h-9 text-[13px] font-medium border-border/60 hover:bg-accent/40"
          onClick={newConversation}
        >
          <Plus className="size-4" />
          New Analysis
        </Button>
      </div>

      <div className="px-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Conversations
        </p>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="flex flex-col gap-0.5">
          {conversations.map((conv) => (
            <div key={conv.id} className="group flex items-center gap-0.5 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className={`flex-1 justify-start gap-2.5 text-[13px] h-9 px-3 rounded-lg font-normal ${
                  activeId === conv.id
                    ? "bg-primary/8 text-foreground font-medium ring-1 ring-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40"
                }`}
                onClick={() => setActive(conv.id)}
                aria-current={activeId === conv.id ? "page" : undefined}
              >
                <MessageSquare className="size-3.5 shrink-0" />
                <span className="truncate">{conv.title}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      aria-label="Conversation menu"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    className="text-[13px]"
                    onClick={() => saveConversation(conv.id)}
                  >
                    <Download className="size-3.5 mr-2" />
                    Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-[13px] text-destructive"
                    onClick={() => deleteConversation(conv.id)}
                  >
                    <Trash2 className="size-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-border/40">
        <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
          Powered by GBIF · iNaturalist · NewsAPI
        </p>
      </div>
    </aside>
  );
}
