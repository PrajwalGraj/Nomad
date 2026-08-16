"use client";

import { useState, useRef, type KeyboardEvent, useEffect } from "react";
import { ArrowUp, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useContacts } from "@/hooks/use-contacts";

export function MessageInput({
  value,
  onChange,
  onSend,
  disabled,
  walletConnected = true,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  /** When false, submitting shows a small "connect your wallet" warning instead of sending. */
  walletConnected?: boolean;
  className?: string;
}) {
  const { contacts } = useContacts();
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(16);
  const [showWalletWarning, setShowWalletWarning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, []);

  const filteredContacts = mentionQuery !== null 
    ? contacts.filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  // Measure caret position to align dropdown
  function updateDropdownPosition() {
    if (!textareaRef.current) return;
    const { selectionStart, value: textValue } = textareaRef.current;
    
    const div = document.createElement('div');
    const computed = window.getComputedStyle(textareaRef.current);
    
    for (const prop of Array.from(computed)) {
      div.style[prop as any] = computed.getPropertyValue(prop);
    }
    
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.left = '-9999px';
    div.style.width = computed.width;
    
    const textBefore = textValue.slice(0, selectionStart);
    div.textContent = textBefore;
    const span = document.createElement('span');
    span.textContent = '|';
    div.appendChild(span);
    
    document.body.appendChild(div);
    const { offsetLeft } = span;
    document.body.removeChild(div);
    
    // Add 16px base padding left to match input, cap at container width minus dropdown width
    const containerWidth = textareaRef.current.parentElement?.offsetWidth || 400;
    const maxLeft = Math.max(16, containerWidth - 160); // 160px is approx dropdown width
    setDropdownLeft(Math.min(offsetLeft + 16, maxLeft));
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!walletConnected) {
      setShowWalletWarning(true);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = setTimeout(() => setShowWalletWarning(false), 2200);
      return;
    }
    if (disabled) return;
    onSend(trimmed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && filteredContacts.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredContacts.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredContacts.length) % filteredContacts.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertContact(filteredContacts[selectedIndex].name);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    onChange(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    // Matches @ followed by alphanumeric characters
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setSelectedIndex(0);
      setTimeout(updateDropdownPosition, 0); // calculate pos after render
    } else {
      setMentionQuery(null);
    }
  }

  function insertContact(contactName: string) {
    if (!textareaRef.current) return;
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    
    // Find where the @ starts
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    if (match) {
      const beforeAt = textBeforeCursor.slice(0, match.index);
      const newValue = beforeAt + contactName + " " + textAfterCursor;
      onChange(newValue);
      setMentionQuery(null);
      
      // Restore cursor position after render
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursor = beforeAt.length + contactName.length + 1;
          textareaRef.current.setSelectionRange(newCursor, newCursor);
          textareaRef.current.focus();
        }
      }, 0);
    }
  }

  return (
    <div className={cn("search-glow-border group relative", className)}>
      {showWalletWarning && (
        <div
          role="status"
          className="absolute bottom-[calc(100%+10px)] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-sm animate-fade-in-up"
        >
          Connect your wallet before we start
        </div>
      )}
      {mentionQuery !== null && filteredContacts.length > 0 && (
        <div 
          className="absolute bottom-[calc(100%+12px)] min-w-[140px] bg-background/95 backdrop-blur-md border border-border/80 rounded-[10px] shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50 py-0.5"
          style={{ left: `${dropdownLeft}px` }}
        >
          {filteredContacts.map((c, i) => (
            <button
              key={c.id}
              onClick={(e) => {
                e.preventDefault();
                insertContact(c.name);
              }}
              className={cn(
                "w-full text-left px-2.5 py-1.5 text-[13px] flex items-center gap-2.5 transition-colors",
                i === selectedIndex ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Users className="h-2.5 w-2.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium tracking-tight">{c.name}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-[28px] bg-gradient-to-r from-brand/50 via-brand/20 to-primary/50 opacity-0 blur-lg transition-opacity duration-300 group-focus-within:animate-glow-pulse group-focus-within:opacity-100"
      />
      <div className="relative flex items-end gap-2 rounded-3xl bg-background p-2 pl-4 shadow-sm">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask Nomad to send, swap, launch a token, or check your wallet…"
          className="max-h-40 min-h-9 resize-none border-none bg-transparent px-0 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
          rows={1}
        />
        <Button
          onClick={submit}
          disabled={disabled || !value.trim()}
          size="icon"
          className="mb-0.5 shrink-0 rounded-full bg-gradient-to-br from-brand to-primary text-white transition-transform duration-150 ease-out hover:scale-105 disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
          aria-label="Send message"
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  );
}
