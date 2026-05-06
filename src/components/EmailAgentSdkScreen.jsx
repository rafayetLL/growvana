import React, { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import { streamEmailAgentSdk } from '../lib/emailAgentSdkApi.js';

// Standalone email-agent screen powered by the Anthropic Agent SDK.
// Independent of the phase-1 blueprint flow: no thread_id from init,
// no checkpointer, no webhook relay. Session continuity is purely the
// `session_id` the SDK returns on the first turn.
//
// Wire format from /email-agent-sdk/stream is documented in
// `lib/emailAgentSdkApi.js`. Each turn produces one composite assistant
// message that may carry text segments interleaved with tool use/result
// pairs; we render them top-down in the order they streamed in.

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

// VITE_API_BASE_URL is e.g. "http://localhost:8000/api/v1". For iframe
// `src` we want the API origin (so the relative `/api/v1/...` URL the
// backend ships works). We strip the path and use the origin only.
const API_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_API_BASE_URL).origin;
  } catch {
    return '';
  }
})();

export default function EmailAgentSdkScreen({ activeView, onSelectView }) {
  const [messages, setMessages] = useState([]); // {id, role, parts: [...]}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  // Email files the agent has written this session, keyed by filename
  // so re-writes (Edit tool) update the existing iframe without piling
  // up duplicates. Newest-first when rendered.
  const [emailFiles, setEmailFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const sessionIdRef = useRef(null);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || busy) return;

    const userMsg = { id: newId(), role: 'user', parts: [{ type: 'text', text: trimmed }] };
    const assistantMsg = { id: newId(), role: 'assistant', parts: [] };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const evt of streamEmailAgentSdk({
        user_message: trimmed,
        session_id: sessionIdRef.current,
        signal: controller.signal,
      })) {
        if (evt.type === 'session') {
          setSessionId(evt.session_id);
        } else if (evt.type === 'text_delta') {
          setMessages((prev) => appendToAssistant(prev, assistantMsg.id, (parts) => {
            const last = parts[parts.length - 1];
            if (last && last.type === 'text') {
              return [
                ...parts.slice(0, -1),
                { ...last, text: last.text + evt.content },
              ];
            }
            return [...parts, { type: 'text', text: evt.content }];
          }));
        } else if (evt.type === 'tool_use') {
          setMessages((prev) => appendToAssistant(prev, assistantMsg.id, (parts) => [
            ...parts,
            {
              type: 'tool_use',
              id: evt.id,
              name: evt.name,
              input: evt.input,
            },
          ]));
        } else if (evt.type === 'tool_result') {
          setMessages((prev) => appendToAssistant(prev, assistantMsg.id, (parts) => {
            const idx = parts.findIndex(
              (p) => p.type === 'tool_use' && p.id === evt.tool_use_id,
            );
            if (idx === -1) {
              return [
                ...parts,
                {
                  type: 'tool_result',
                  tool_use_id: evt.tool_use_id,
                  content: evt.content,
                  is_error: evt.is_error,
                },
              ];
            }
            const next = [...parts];
            next[idx] = {
              ...next[idx],
              result: { content: evt.content, is_error: evt.is_error },
            };
            return next;
          }));
        } else if (evt.type === 'text_final') {
          // Canonical aggregated text for the turn — already shown via
          // `text_delta`. Nothing to render; deltas built the same string.
        } else if (evt.type === 'email_file') {
          setEmailFiles((prev) => {
            const without = prev.filter((f) => f.filename !== evt.filename);
            // Cache-bust by appending a timestamp so iframe reloads on
            // re-write. Newest first.
            const stamped = `${API_ORIGIN}${evt.url}?t=${Date.now()}`;
            return [
              { filename: evt.filename, path: evt.path, url: stamped, at: Date.now() },
              ...without,
            ];
          });
          setActiveFile((prev) => prev || evt.filename);
        } else if (evt.type === 'done') {
          if (evt.session_id) setSessionId(evt.session_id);
          if (evt.subtype !== 'success') {
            setMessages((prev) => appendToAssistant(prev, assistantMsg.id, (parts) => [
              ...parts,
              {
                type: 'system_note',
                text: `Stopped: ${evt.subtype}${
                  typeof evt.total_cost_usd === 'number'
                    ? ` · $${evt.total_cost_usd.toFixed(4)}`
                    : ''
                } · ${evt.num_turns} turns`,
              },
            ]));
          }
        } else if (evt.type === 'error') {
          setMessages((prev) => appendToAssistant(prev, assistantMsg.id, (parts) => [
            ...parts,
            { type: 'system_note', text: `Error: ${evt.message}`, error: true },
          ]));
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setMessages((prev) => appendToAssistant(prev, assistantMsg.id, (parts) => [
          ...parts,
          { type: 'system_note', text: `Stream failed: ${e.message}`, error: true },
        ]));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function resetSession() {
    cancel();
    setSessionId(null);
    setMessages([]);
    setEmailFiles([]);
    setActiveFile(null);
  }

  const activeEmailFile =
    emailFiles.find((f) => f.filename === activeFile) || null;

  return (
    <div className="h-screen flex bg-ink-50 dark:bg-slate-950">
      <Sidebar activeView={activeView} onSelectView={onSelectView} />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-6 flex items-center justify-between border-b border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div>
            <h1 className="text-[15px] font-semibold text-ink-900 dark:text-slate-100">
              Email Agent (Anthropic SDK)
            </h1>
            <div className="text-[11px] text-ink-400 dark:text-slate-500">
              {sessionId ? `Session ${sessionId.slice(0, 8)}…` : 'New session'}
            </div>
          </div>
          <button
            type="button"
            onClick={resetSession}
            disabled={busy}
            className="text-[12px] px-3 py-1.5 rounded-md border border-ink-200 dark:border-slate-700 text-ink-600 dark:text-slate-300 hover:bg-ink-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            New session
          </button>
        </header>

        <div className="flex-1 flex min-h-0">
          <div ref={scrollRef} className={['overflow-auto px-6 py-6', emailFiles.length > 0 ? 'w-1/2 border-r border-ink-200 dark:border-slate-800' : 'flex-1'].join(' ')}>
            <div className={emailFiles.length > 0 ? 'flex flex-col gap-4' : 'max-w-3xl mx-auto flex flex-col gap-4'}>
              {messages.length === 0 && (
                <EmptyState />
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {busy && (
                <div className="text-[12px] text-ink-400 dark:text-slate-500 italic">
                  Agent working…
                </div>
              )}
            </div>
          </div>
          {emailFiles.length > 0 && (
            <EmailPreviewPanel
              files={emailFiles}
              active={activeEmailFile}
              onSelect={setActiveFile}
            />
          )}
        </div>

        <footer className="border-t border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask the email agent (Cmd/Ctrl+Enter to send)…"
              rows={2}
              className="flex-1 resize-none rounded-md border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[13px] text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              disabled={busy}
            />
            {busy ? (
              <button
                type="button"
                onClick={cancel}
                className="px-4 py-2 rounded-md bg-rose-600 text-white text-[13px] font-medium hover:bg-rose-700"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={send}
                disabled={!input.trim()}
                className="px-4 py-2 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                Send
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

function appendToAssistant(messages, id, transform) {
  return messages.map((m) =>
    m.id === id && m.role === 'assistant' ? { ...m, parts: transform(m.parts) } : m,
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="text-[14px] font-semibold text-ink-700 dark:text-slate-200 mb-1">
        Email Agent (SDK)
      </div>
      <p className="text-[13px] text-ink-500 dark:text-slate-400 max-w-md mx-auto">
        Independent autonomous agent backed by the Claude Agent SDK. It has
        the marketing-CMO, email-content, and email-design skills, plus
        web search and full filesystem access in its workspace.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2 text-[12px] text-ink-500 dark:text-slate-400">
        <Suggestion>Draft a re-engagement email for lapsed users</Suggestion>
        <Suggestion>As a CMO, audit my GTM for a B2B SaaS launch</Suggestion>
        <Suggestion>Write and design a Black Friday email</Suggestion>
      </div>
    </div>
  );
}

function EmailPreviewPanel({ files, active, onSelect }) {
  return (
    <aside className="w-1/2 flex flex-col bg-ink-50 dark:bg-slate-950 min-w-0">
      <div className="border-b border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2">
        <div className="text-[11px] uppercase tracking-wider text-ink-400 dark:text-slate-500 mb-1.5">
          Rendered emails
        </div>
        <div className="flex flex-wrap gap-1.5">
          {files.map((f) => {
            const isActive = active && f.filename === active.filename;
            return (
              <button
                key={f.filename}
                type="button"
                onClick={() => onSelect(f.filename)}
                className={[
                  'text-[11.5px] px-2.5 py-1 rounded-md font-mono',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-ink-100 dark:bg-slate-800 text-ink-600 dark:text-slate-300 hover:bg-ink-200 dark:hover:bg-slate-700',
                ].join(' ')}
                title={f.path}
              >
                {f.filename}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0 p-3">
        {active ? (
          <iframe
            key={active.url}
            src={active.url}
            title={active.filename}
            className="w-full h-full rounded-md bg-white shadow-sm border border-ink-200 dark:border-slate-700"
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="h-full grid place-items-center text-[12px] text-ink-400 dark:text-slate-500">
            Select an email to preview
          </div>
        )}
      </div>
    </aside>
  );
}

function Suggestion({ children }) {
  return (
    <span className="px-3 py-1 rounded-full border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      {children}
    </span>
  );
}

function MessageBubble({ message }) {
  if (message.role === 'user') {
    return (
      <div className="self-end max-w-[80%]">
        <div className="rounded-2xl rounded-br-sm bg-brand-600 text-white px-4 py-2.5 text-[13.5px] whitespace-pre-wrap">
          {message.parts.map((p, i) => (p.type === 'text' ? <span key={i}>{p.text}</span> : null))}
        </div>
      </div>
    );
  }

  return (
    <div className="self-start max-w-[90%] flex flex-col gap-2">
      {message.parts.map((p, i) => {
        if (p.type === 'text') {
          return (
            <div
              key={i}
              className="rounded-2xl rounded-bl-sm bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 px-4 py-3 text-[13.5px] text-ink-900 dark:text-slate-100 whitespace-pre-wrap"
            >
              {p.text}
            </div>
          );
        }
        if (p.type === 'tool_use') {
          return <ToolCall key={i} call={p} />;
        }
        if (p.type === 'tool_result') {
          return <ToolResult key={i} result={p} />;
        }
        if (p.type === 'system_note') {
          return (
            <div
              key={i}
              className={[
                'text-[12px] italic',
                p.error ? 'text-rose-600 dark:text-rose-400' : 'text-ink-500 dark:text-slate-400',
              ].join(' ')}
            >
              {p.text}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function ToolCall({ call }) {
  const [open, setOpen] = useState(false);
  const summary =
    call.name === 'Skill'
      ? `Skill · ${call.input?.name || '?'}`
      : call.name;
  const status = call.result
    ? call.result.is_error
      ? 'error'
      : 'ok'
    : 'pending';
  return (
    <div className="rounded-md border border-ink-200 dark:border-slate-800 bg-ink-50 dark:bg-slate-900 text-[12px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-ink-100 dark:hover:bg-slate-800"
      >
        <span className="flex items-center gap-2">
          <span
            className={[
              'inline-block w-2 h-2 rounded-full',
              status === 'pending'
                ? 'bg-amber-500 animate-pulse'
                : status === 'error'
                  ? 'bg-rose-500'
                  : 'bg-emerald-500',
            ].join(' ')}
          />
          <span className="font-mono text-ink-700 dark:text-slate-200">{summary}</span>
        </span>
        <span className="text-ink-400 dark:text-slate-500">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-ink-200 dark:border-slate-800 space-y-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-400 dark:text-slate-500 mb-1">
              Input
            </div>
            <pre className="text-[11px] bg-white dark:bg-slate-950 p-2 rounded border border-ink-200 dark:border-slate-800 overflow-auto max-h-60">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>
          {call.result && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-400 dark:text-slate-500 mb-1">
                Result {call.result.is_error ? '(error)' : ''}
              </div>
              <pre className="text-[11px] bg-white dark:bg-slate-950 p-2 rounded border border-ink-200 dark:border-slate-800 overflow-auto max-h-80 whitespace-pre-wrap">
                {typeof call.result.content === 'string'
                  ? call.result.content
                  : JSON.stringify(call.result.content, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolResult({ result }) {
  return (
    <div className="text-[11px] text-ink-400 dark:text-slate-500 italic">
      [orphan tool_result {result.tool_use_id?.slice(0, 6)}]
    </div>
  );
}
