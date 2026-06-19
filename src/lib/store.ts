import { create } from "zustand";
import type { Conversation } from "./types";

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  sidebarOpen: boolean;
  chatMessages: Record<string, unknown[]>;

  setActive: (id: string) => void;
  newConversation: () => void;
  deleteConversation: (id: string) => void;
  toggleSidebar: () => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  setChatMessages: (id: string, msgs: unknown[]) => void;
}

let nextId = 0;
function genId(): string {
  nextId++;
  return `conv_${Date.now()}_${nextId}`;
}

function createConversation(): Conversation {
  return {
    id: genId(),
    title: "New Analysis",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const initialConv = createConversation();

export const useStore = create<ChatState>((set) => ({
  conversations: [initialConv],
  activeId: initialConv.id,
  sidebarOpen: true,
  chatMessages: {},

  setActive: (id) => set({ activeId: id }),

  newConversation: () => {
    const conv = createConversation();
    set((s) => ({
      conversations: [conv, ...s.conversations],
      activeId: conv.id,
    }));
  },

  deleteConversation: (id) =>
    set((s) => {
      const filtered = s.conversations.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const conv = createConversation();
        return { conversations: [conv], activeId: conv.id };
      }
      return {
        conversations: filtered,
        activeId: s.activeId === id ? filtered[0].id : s.activeId,
      };
    }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  updateConversation: (id, updates) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c,
      ),
    })),

  setChatMessages: (id, msgs) =>
    set((s) => ({
      chatMessages: { ...s.chatMessages, [id]: msgs },
    })),
}));
