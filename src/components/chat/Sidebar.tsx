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
      {theme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );

  if (!sidebarOpen) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 px-1.5 border-r border-border/60 bg-sidebar/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
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
            {conversations.slice(0, 5).map((conv) => (
              <Button
                key={conv.id}
                variant="ghost"
                size="icon"
                onClick={() => setActive(conv.id)}
                className={`size-9 rounded-lg ${
                  activeId === conv.id
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
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
    <aside className="w-72 flex flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur-sm shrink-0" aria-label="Sidebar">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Leaf className="size-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight leading-none">EcoQ</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">Species Distribution</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
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
          className="w-full justify-start gap-2 rounded-lg h-9 text-sm font-medium"
          onClick={newConversation}
        >
          <Plus className="size-3.5" />
          New Analysis
        </Button>
      </div>

      <Separator className="mx-3 w-auto" />

      <ScrollArea className="flex-1 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          {conversations.map((conv) => (
            <div key={conv.id} className="group flex items-center gap-0.5 rounded-lg">
              <Button
                variant={activeId === conv.id ? "secondary" : "ghost"}
                size="sm"
                className={`flex-1 justify-start gap-2.5 text-sm h-9 px-3 rounded-lg font-normal ${
                  activeId === conv.id
                    ? "bg-sidebar-accent/80 text-sidebar-foreground font-medium"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
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
                    className="text-sm"
                    onClick={() => saveConversation(conv.id)}
                  >
                    <Download className="size-3.5 mr-2" />
                    Save
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-sm text-destructive"
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

      <Separator className="mx-3 w-auto" />
      <div className="px-4 py-3">
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          EcoQ — AI-powered species distribution data assistant
        </p>
      </div>
    </aside>
  );
}