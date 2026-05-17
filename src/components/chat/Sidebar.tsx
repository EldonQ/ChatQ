"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";

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

  function saveConversation(convId: string) {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;
    const msgs = chatMessages[convId] || [];
    const data = {
      exportedAt: new Date().toISOString(),
      conversation: { id: conv.id, title: conv.title, createdAt: conv.createdAt },
      messages: msgs.map((m: any) => ({
        role: m.role,
        parts: m.parts?.map((p: any) => {
          if (p.type === "text") return { type: "text", text: p.text };
          if (p.type?.startsWith("tool-")) return { type: p.type, state: p.state, input: p.input, output: p.output };
          return p;
        }),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecoq-${conv.title.slice(0, 30).replace(/[^a-zA-Z0-9一-鿿]/g, "_")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!sidebarOpen) {
    return (
      <div className="flex flex-col items-center gap-3 py-3 px-2 border-r border-border bg-sidebar">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-muted-foreground hover:text-foreground"
        >
          <PanelLeft className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={newConversation}
          className="text-primary hover:text-primary"
        >
          <Plus className="size-5" />
        </Button>
        <div className="mt-auto">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-64 flex flex-col border-r border-border bg-sidebar shrink-0">
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <Leaf className="size-5 text-primary" />
          <span className="font-semibold text-sm tracking-tight">EcoQ</span>
        </div>
        <div className="flex items-center gap-1">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="size-3.5" />
              ) : (
                <Moon className="size-3.5" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={toggleSidebar}
          >
            <PanelLeftClose className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="px-3 pb-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          onClick={newConversation}
        >
          <Plus className="size-3.5" />
          New Analysis
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2 py-2">
        <div className="flex flex-col gap-0.5">
          {conversations.map((conv) => (
            <div key={conv.id} className="group flex items-center gap-0">
              <Button
                variant={activeId === conv.id ? "secondary" : "ghost"}
                size="sm"
                className="flex-1 justify-start gap-2 text-xs h-8 px-2 font-normal"
                onClick={() => setActive(conv.id)}
              >
                <MessageSquare className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{conv.title}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md hover:bg-accent">
                  <span className="sr-only">Menu</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <circle cx="3" cy="6" r="1" />
                    <circle cx="6" cy="6" r="1" />
                    <circle cx="9" cy="6" r="1" />
                  </svg>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() => saveConversation(conv.id)}
                  >
                    <Download className="size-3" />
                    Save
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs text-destructive"
                    onClick={() => deleteConversation(conv.id)}
                  >
                    <Trash2 className="size-3" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator />
      <div className="px-3 py-2">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          EcoQ — AI-powered species distribution data assistant
        </p>
      </div>
    </aside>
  );
}
