"use client";

import { useState, useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, ImageIcon, Square, Plus, Sparkles } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string, file?: { name: string; content: string; isImage?: boolean }) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
}

const SKILLS = [
  { id: "searchSpecies", label: "Search Species", desc: "GBIF taxonomy lookup", icon: "🔍" },
  { id: "fetchAndClean", label: "Fetch & Clean Data", desc: "Multi-source + cleaning", icon: "📊" },
  { id: "generateMap", label: "Generate Map", desc: "Distribution visualization", icon: "🗺️" },
];

export function ChatInput({ onSend, disabled, isStreaming, onStop }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [file, setFile] = useState<{ name: string; content: string; isImage?: boolean } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const skillRef = useRef<HTMLDivElement>(null);

  function handleSend() {
    const text = input.trim();
    if (!text && !file) return;
    onSend(text || "Analyze this file", file ?? undefined);
    setInput("");
    setFile(null);
    setMenuOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) handleSend();
    }
  }

  function readFile(f: File, isImage: boolean) {
    const reader = new FileReader();
    reader.onload = () => setFile({ name: f.name, content: (reader.result as string) || "", isImage });
    if (isImage) reader.readAsDataURL(f);
    else reader.readAsText(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) {
    const f = e.target.files?.[0];
    if (!f) return;
    readFile(f, isImage);
    setMenuOpen(false);
    if (e.target) e.target.value = "";
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (!blob) continue;
        const ext = items[i].type.split("/")[1] || "png";
        const reader = new FileReader();
        reader.onload = () => setFile({ name: `pasted-image.${ext}`, content: reader.result as string, isImage: true });
        reader.readAsDataURL(blob);
        break;
      }
    }
  }

  return (
    <div className="border-t border-border/60 bg-gradient-to-t from-background via-background to-transparent px-4 pt-2 pb-4">
      {/* File preview */}
      {file && (
        <div className="mb-2 px-1 animate-in fade-in slide-in-from-bottom-1">
          {file.isImage ? (
            <div className="relative inline-block">
              <img src={file.content} alt="Attached" className="max-h-32 max-w-[200px] rounded-xl border border-border/60 object-cover shadow-sm" />
              <button onClick={() => setFile(null)} className="absolute -top-2 -right-2 size-5 rounded-full bg-foreground/80 text-background flex items-center justify-center shadow hover:bg-foreground transition-colors">
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg px-2.5 py-1.5 border border-emerald-200 dark:border-emerald-800">
              <Paperclip className="size-3" /> {file.name}
              <button onClick={() => setFile(null)} className="ml-0.5 hover:text-destructive transition-colors"><X className="size-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" accept=".csv,.json,.geojson,.tsv,.txt" className="hidden" onChange={(e) => handleFileChange(e, false)} />
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, true)} />

      {/* Main input bar */}
      <div className="flex items-end gap-1.5 bg-card border border-border/80 rounded-2xl shadow-sm focus-within:shadow-md focus-within:border-emerald-500/40 transition-all duration-200 px-2 py-1.5">
        {/* + Menu button */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            onClick={() => { setMenuOpen(!menuOpen); setSkillOpen(false); }}
            disabled={isStreaming}
            title="Add file or image"
          >
            <Plus className="size-5" />
          </Button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-48 bg-popover border border-border rounded-xl shadow-lg p-1.5 animate-in fade-in slide-in-from-bottom-2 z-50">
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
                onClick={() => { imageRef.current?.click(); }}
              >
                <ImageIcon className="size-4 text-emerald-500" />
                <div>
                  <div className="font-medium">Upload Image</div>
                  <div className="text-[10px] text-muted-foreground">Paste or select</div>
                </div>
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
                onClick={() => { fileRef.current?.click(); }}
              >
                <Paperclip className="size-4 text-sky-500" />
                <div>
                  <div className="font-medium">Upload File</div>
                  <div className="text-[10px] text-muted-foreground">CSV, GeoJSON, TXT</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Skill selector */}
        <div className="relative" ref={skillRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            onClick={() => { setSkillOpen(!skillOpen); setMenuOpen(false); }}
            disabled={isStreaming}
            title="Select skill"
          >
            <Sparkles className="size-4" />
          </Button>
          {skillOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-popover border border-border rounded-xl shadow-lg p-1.5 animate-in fade-in slide-in-from-bottom-2 z-50">
              <div className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Available Tools</div>
              {SKILLS.map((s) => (
                <button
                  key={s.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setInput((prev) => prev + (prev ? " " : "") + s.id + " ");
                    setSkillOpen(false);
                    textareaRef.current?.focus();
                  }}
                >
                  <span className="text-sm">{s.icon}</span>
                  <div>
                    <div className="font-medium text-xs">{s.label}</div>
                    <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            const ta = e.target;
            ta.style.height = "auto";
            ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isStreaming ? "EcoQ is responding…" : "Ask about any species, or upload a file…"}
          disabled={isStreaming}
          rows={1}
          className="flex-1 min-h-10 max-h-[200px] resize-none bg-transparent border-0 shadow-none text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 py-1.5"
        />

        {/* Send / Stop */}
        {isStreaming ? (
          <Button size="icon" variant="destructive" className="h-9 w-9 rounded-xl shrink-0 shadow-sm" onClick={onStop}>
            <Square className="size-3.5" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-9 w-9 rounded-xl shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all duration-200"
            onClick={handleSend}
            disabled={disabled || (!input.trim() && !file)}
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
