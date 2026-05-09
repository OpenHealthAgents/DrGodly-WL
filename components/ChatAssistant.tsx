"use client";

import { useChat } from "@ai-sdk/react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";
  const shouldHideAssistant = pathname === "/intake";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  if (shouldHideAssistant) {
    return null;
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={toggleChat}
        style={{ zIndex: 99999 }}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl transition-transform hover:scale-110 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{ zIndex: 99998 }}
          className="fixed bottom-24 right-6 flex h-[500px] w-[350px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:w-[380px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-zinc-900 px-6 py-4 text-white dark:bg-zinc-800">
            <div>
              <h3 className="text-sm font-bold">Wellora Assistant</h3>
              <p className="text-[10px] text-zinc-400">Ask us about our plans and medications</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:opacity-70">
              <X className="h-5 w-5 text-zinc-400" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center p-8 space-y-2">
                <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                  <MessageCircle className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  How can I help you today?
                </p>
                <p className="text-xs text-zinc-500">
                  Try asking &quot;What is Semaglutide?&quot;
                </p>
              </div>
            )}
            
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {messages.map((m: any) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col gap-1",
                  m.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                    m.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  )}
                >
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(m as any).content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-1 p-2 text-zinc-400">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "200ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "400ms" }} />
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-[10px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error.message || "Failed to connect to AI. Please check your OPENAI_API_KEY."}
              </div>
            )}
          </div>

          {/* Input */}
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if (!input || isLoading) return;
              const val = input;
              setInput("");
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await sendMessage(val as any);
              } catch (err) {
                console.error("Chat Error:", err);
              }
            }} 
            className="border-t border-zinc-100 p-4 dark:border-zinc-800"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
              <button
                type="submit"
                disabled={isLoading || !input}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-center text-zinc-400">
              Personalized health guidance.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
