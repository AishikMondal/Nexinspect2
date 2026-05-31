import React, { useState, useRef, useEffect } from "react";
import type { ChatMessage, AIState } from "../../types/ai";
import { createGeminiNanoSession } from "../../services/geminiNano";

interface AIChatProps {
  aiState: AIState;
  pageContext: string;
}

export const AIChat: React.FC<AIChatProps> = ({ aiState, pageContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Cyber greetings! I'm your local Gemini Nano Advisor. Ask me anything about this page's code structure, network latency, or security posture.",
      timeStamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sending || !aiState.isAvailable) return;

    const userText = inputValue;
    setInputValue("");
    setSending(true);

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2),
      sender: "user",
      text: userText,
      timeStamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const session = await createGeminiNanoSession(
        `You are DevTools Pro on-device AI Advisor. Answer user queries concisely using this page audit context: ${pageContext}`
      );
      const answer = await session.prompt(userText);
      
      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2),
        sender: "ai",
        text: answer,
        timeStamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      session.destroy();
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2),
        sender: "ai",
        text: `Error: ${err.message || "Failed to prompt local AI session."}`,
        timeStamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "300px",
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        fontFamily: "var(--font-sans)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-color)",
          fontSize: "10px",
          textTransform: "uppercase",
          color: "var(--accent-cyan)",
          fontWeight: 700,
        }}
      >
        Dynamic AI Chat Interface
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.map((msg) => {
          const isAi = msg.sender === "ai";
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isAi ? "flex-start" : "flex-end",
                maxWidth: "85%",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                lineHeight: "1.4",
                background: isAi ? "rgba(255, 255, 255, 0.02)" : "rgba(108, 99, 255, 0.1)",
                border: `1px solid ${isAi ? "var(--border-color)" : "rgba(108, 99, 255, 0.2)"}`,
                color: "var(--text-primary)",
              }}
            >
              {msg.text}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          padding: "8px",
          borderTop: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          display: "flex",
          gap: "8px",
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={aiState.isAvailable ? "Ask about performance, CSS contrast, headers..." : "AI not available"}
          disabled={!aiState.isAvailable || sending}
          style={{
            flex: 1,
            padding: "6px 10px",
            fontSize: "11px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-color)",
            borderRadius: "4px",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={!aiState.isAvailable || sending}
          style={{
            padding: "6px 12px",
            fontSize: "11px",
            background: "rgba(0, 212, 255, 0.1)",
            border: "1px solid var(--accent-cyan)",
            borderRadius: "4px",
            color: "var(--accent-cyan)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
};
