import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, FileText, X } from "lucide-react";
import PageShell from "../components/PageShell";
import { api } from "../api/client";

const QUICK_PROMPTS = [
  "Can you summarize my health?",
  "What should I ask my doctor?",
  "Which of my values need attention?",
];

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportId = searchParams.get("report");
  const [reportName, setReportName] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I'm HealthOS. Ask about symptoms, medications, or trends, and I'll do my best to help.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!reportId) {
      setReportName(null);
      return;
    }
    api
      .getReport(reportId)
      .then((r) =>
        setReportName(
          new Date(r.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        )
      )
      .catch(() => setReportName(null));
  }, [reportId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);
    try {
      const res = await api.sendChat(trimmed, reportId || undefined);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Something went wrong on my end. Please try asking again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function clearReportContext() {
    setSearchParams({});
  }

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-2xl font-semibold">Chat with HealthOS</h1>
        </div>
        <p className="text-text-muted text-sm mb-4">
          Ask about symptoms, medications, or trends.
        </p>

        {reportId && (
          <div className="flex items-center justify-between bg-surface-raised border border-border-strong rounded-full pl-3 pr-1.5 py-1.5 mb-4 w-fit">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <FileText className="w-3.5 h-3.5 text-accent" />
              Discussing report{reportName ? ` from ${reportName}` : ""}
            </div>
            <button
              onClick={clearReportContext}
              className="ml-2 text-text-faint hover:text-text transition-colors"
              aria-label="Clear report context"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="bg-surface border border-border rounded-2xl flex flex-col h-[60vh]">
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-accent text-bg"
                      : "bg-surface-raised text-text border border-border"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-surface-raised border border-border rounded-2xl px-4 py-2.5 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-text-faint animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-5 pb-3 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-xs px-3 py-1.5 rounded-full bg-surface-raised border border-border-strong text-text-muted hover:text-text hover:border-accent transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something…"
              className="flex-1 bg-surface-raised border border-border-strong rounded-full px-4 py-2.5 text-sm placeholder:text-text-faint focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="w-10 h-10 rounded-full bg-accent text-bg flex items-center justify-center disabled:opacity-40 hover:brightness-110 transition shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
