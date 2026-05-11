import React, { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import { streamEmailAgentSdk } from '../lib/emailAgentSdkApi.js';

// Standalone email-agent screen powered by the Anthropic Agent SDK.
// Independent of the phase-1 blueprint flow: no thread_id from init,
// no checkpointer, no webhook relay. Session continuity is purely the
// `session_id` the SDK returns on the first turn.
//
// Wire format (multipart/form-data + SSE) is documented in
// `lib/emailAgentSdkApi.js`. Each turn produces one composite assistant
// message that may carry text segments interleaved with tool use/result
// pairs; we render them top-down in the order they streamed in.
//
// Image attachments: the user can attach images per-turn via the
// paperclip button. Files attach to `pendingImages` until Send, at
// which point they ship with the request and clear from the input.
// The agent receives them as multimodal vision blocks AND as URLs it
// can drop into design-phase HTML.

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

const ACCEPTED_IMAGE_MIMES =
  'image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml';

export default function EmailAgentSdkScreen({ activeView, onSelectView }) {
  const [messages, setMessages] = useState([]); // {id, role, parts: [...]}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  // Files staged for the NEXT send. Cleared on send (each turn re-uploads
  // if needed — there's no persistent gallery).
  // Shape: [{ file: File, previewUrl: string, id: string }]
  const [pendingImages, setPendingImages] = useState([]);
  // Phase artifacts the agent has written this session. One entry per
  // file; re-writes (Edit) replace the existing entry by filename so
  // the iframe / JSON viewer reloads rather than piling up duplicates.
  // Shape: [{ filename, rel_path, kind, url, at }]
  const [emailFiles, setEmailFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const sessionIdRef = useRef(null);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  // Revoke any outstanding object URLs on unmount so we don't leak
  // memory when the user navigates away mid-attachment.
  useEffect(() => {
    return () => {
      pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilePick(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const next = files.map((file) => ({
      id: newId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingImages((prev) => [...prev, ...next]);
    // Reset the input so picking the same file twice in a row still
    // fires onChange.
    e.target.value = '';
  }

  function removePendingImage(id) {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function send() {
    const trimmed = input.trim();
    if ((!trimmed && pendingImages.length === 0) || busy) return;

    // Snapshot the staged images and clear the picker — they belong to
    // THIS turn only and shouldn't leak into a follow-up if the user
    // forgets they're attached.
    const turnImages = pendingImages;
    setPendingImages([]);

    const userParts = [];
    if (trimmed) userParts.push({ type: 'text', text: trimmed });
    // Render thumbnails immediately from the local object URLs — no
    // wait for the server `user_image` event. The event still arrives
    // (we handle it below) but by then the bubble is already painted.
    for (const p of turnImages) {
      userParts.push({
        type: 'image',
        url: p.previewUrl,
        name: p.file.name,
        mime_type: p.file.type,
        local: true,
      });
    }

    const userMsg = { id: newId(), role: 'user', parts: userParts };
    const assistantMsg = { id: newId(), role: 'assistant', parts: [] };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const evt of streamEmailAgentSdk({
        user_message: trimmed || '(image attachment)',
        session_id: sessionIdRef.current,
        images: turnImages.map((p) => p.file),
        signal: controller.signal,
      })) {
        if (evt.type === 'session') {
          setSessionId(evt.session_id);
        } else if (evt.type === 'user_image') {
          // Server confirms an image was persisted. Swap our local
          // object-URL preview for the server-served URL so the
          // bubble keeps rendering even after the local URL is
          // revoked. Match by filename — first unmatched local image
          // gets the server URL.
          setMessages((prev) => prev.map((m) => {
            if (m.id !== userMsg.id) return m;
            let swapped = false;
            const parts = m.parts.map((part) => {
              if (
                !swapped
                && part.type === 'image'
                && part.local
                && part.name === evt.name
              ) {
                swapped = true;
                URL.revokeObjectURL(part.url);
                return { ...part, url: `${API_ORIGIN}${evt.url}`, local: false };
              }
              return part;
            });
            return { ...m, parts };
          }));
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
          // Phase artifact — branch by kind. Cache-bust by appending
          // a timestamp so iframe / JSON refetch reloads on re-write.
          const stamped = `${API_ORIGIN}${evt.url}?t=${Date.now()}`;
          setEmailFiles((prev) => {
            const without = prev.filter((f) => f.filename !== evt.filename);
            return [
              {
                filename: evt.filename,
                rel_path: evt.rel_path,
                kind: evt.kind,
                url: stamped,
                at: Date.now(),
              },
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
    pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingImages([]);
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

        <footer className="border-t border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3">
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
            {pendingImages.length > 0 && (
              <PendingImageStrip
                images={pendingImages}
                onRemove={removePendingImage}
              />
            )}
            <div className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_MIMES}
                multiple
                className="hidden"
                onChange={handleFilePick}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                title="Attach image(s)"
                className="h-[46px] w-10 flex items-center justify-center rounded-md border border-ink-200 dark:border-slate-700 text-ink-500 dark:text-slate-400 hover:bg-ink-50 dark:hover:bg-slate-800 disabled:opacity-40"
                aria-label="Attach image"
              >
                <PaperclipIcon />
              </button>
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
                  className="h-[46px] px-4 rounded-md bg-rose-600 text-white text-[13px] font-medium hover:bg-rose-700"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={send}
                  disabled={!input.trim() && pendingImages.length === 0}
                  className="h-[46px] px-4 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  Send
                </button>
              )}
            </div>
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
        Independent autonomous agent backed by the Claude Agent SDK. It walks
        you through Plan → Content → Design phases, grounded in the brand
        Blueprint. Attach images with the paperclip — the agent can both
        view them and embed them in the rendered email.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2 text-[12px] text-ink-500 dark:text-slate-400">
        <Suggestion>Plan a re-engagement email for lapsed users</Suggestion>
        <Suggestion>Draft a Black Friday sequence (3 emails)</Suggestion>
        <Suggestion>Design a welcome email — I'll attach the hero image</Suggestion>
      </div>
    </div>
  );
}

function PendingImageStrip({ images, onRemove }) {
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((p) => (
        <div
          key={p.id}
          className="relative group h-14 w-14 rounded-md overflow-hidden border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          title={p.file.name}
        >
          <img
            src={p.previewUrl}
            alt={p.file.name}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(p.id)}
            className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function EmailPreviewPanel({ files, active, onSelect }) {
  return (
    <aside className="w-1/2 flex flex-col bg-ink-50 dark:bg-slate-950 min-w-0">
      <div className="border-b border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2">
        <div className="text-[11px] uppercase tracking-wider text-ink-400 dark:text-slate-500 mb-1.5">
          Phase artifacts
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
                  'text-[11.5px] px-2.5 py-1 rounded-md font-mono inline-flex items-center gap-1.5',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-ink-100 dark:bg-slate-800 text-ink-600 dark:text-slate-300 hover:bg-ink-200 dark:hover:bg-slate-700',
                ].join(' ')}
                title={f.rel_path || f.filename}
              >
                <KindBadge kind={f.kind} active={isActive} />
                {f.filename}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0 p-3">
        {active ? (
          active.kind === 'html' ? (
            <iframe
              key={active.url}
              src={active.url}
              title={active.filename}
              className="w-full h-full rounded-md bg-white shadow-sm border border-ink-200 dark:border-slate-700"
              sandbox="allow-same-origin"
            />
          ) : (
            <JsonPreview key={active.url} url={active.url} filename={active.filename} />
          )
        ) : (
          <div className="h-full grid place-items-center text-[12px] text-ink-400 dark:text-slate-500">
            Select an artifact to preview
          </div>
        )}
      </div>
    </aside>
  );
}

function KindBadge({ kind, active }) {
  // Tiny pill so users can tell plan/content/html apart at a glance
  // even when filenames are similar (e.g. shared slug).
  const label = kind === 'plan' ? 'PLAN' : kind === 'content' ? 'COPY' : 'HTML';
  return (
    <span
      className={[
        'inline-block px-1 rounded text-[9px] font-semibold tracking-wide',
        active
          ? 'bg-white/20 text-white'
          : kind === 'plan'
            ? 'bg-amber-200 text-amber-900'
            : kind === 'content'
              ? 'bg-sky-200 text-sky-900'
              : 'bg-emerald-200 text-emerald-900',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function JsonPreview({ url, filename }) {
  // Fetches the JSON file from the backend and pretty-prints it. Read-
  // only viewer — to mutate the JSON, ask the agent to edit it.
  const [state, setState] = useState({ status: 'loading', text: '', error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', text: '', error: null });
    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return text;
        }
      })
      .then((pretty) => {
        if (!cancelled) setState({ status: 'ok', text: pretty, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ status: 'error', text: '', error: err.message || String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.status === 'loading') {
    return (
      <div className="h-full grid place-items-center text-[12px] text-ink-400 dark:text-slate-500">
        Loading {filename}…
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="h-full grid place-items-center text-[12px] text-rose-500 dark:text-rose-400">
        Failed to load {filename}: {state.error}
      </div>
    );
  }
  return (
    <pre className="w-full h-full overflow-auto rounded-md bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-700 p-3 text-[12px] leading-snug font-mono text-ink-800 dark:text-slate-200 whitespace-pre">
      {state.text}
    </pre>
  );
}

function Suggestion({ children }) {
  return (
    <span className="px-3 py-1 rounded-full border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      {children}
    </span>
  );
}

function PaperclipIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function MessageBubble({ message }) {
  if (message.role === 'user') {
    const textParts = message.parts.filter((p) => p.type === 'text');
    const imageParts = message.parts.filter((p) => p.type === 'image');
    return (
      <div className="self-end max-w-[80%] flex flex-col items-end gap-1.5">
        {imageParts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {imageParts.map((p, i) => (
              <img
                key={i}
                src={p.url}
                alt={p.name}
                className="h-20 w-20 object-cover rounded-md border border-ink-200 dark:border-slate-700 bg-white"
                title={p.name}
              />
            ))}
          </div>
        )}
        {textParts.length > 0 && (
          <div className="rounded-2xl rounded-br-sm bg-brand-600 text-white px-4 py-2.5 text-[13.5px] whitespace-pre-wrap">
            {textParts.map((p, i) => (
              <span key={i}>{p.text}</span>
            ))}
          </div>
        )}
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
