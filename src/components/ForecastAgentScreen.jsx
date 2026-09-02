import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Sidebar from './Sidebar.jsx';
import {
  IconArrowLeft,
  IconArrowRight,
  IconChart,
  IconDownload,
  IconLink,
} from './icons.jsx';
import {
  initForecastThread,
  streamForecastTurn,
  getForecastHistory,
  listForecastOutputs,
  forecastOutputUrl,
  FORECAST_THREAD_ID_RE,
} from '../lib/forecastAgentApi.js';

// Forecast Agent screen — the sixth agent, first on the Claude Agent SDK
// rather than LangGraph. Modeled on EmailAgentSdkScreen.jsx (the SDK wire
// reference) with the forecast deltas:
//
//   - There IS an /init gate: thread_id + foundation_thread_id, once per
//     thread. A 400 ThreadExistsError is treated as "open the existing
//     thread" — the server keeps the whole conversation and /stream simply
//     continues it.
//   - Threads are local files on the server and REOPENABLE BY ID
//     (2026-09-02, user's call): typing an existing id on the start card
//     loads its conversation from GET /history and its files separately
//     from `listForecastOutputs`. There is deliberately no thread list —
//     the user dropped it the same day.
//   - No session_id round-trip: the session is derived server-side from
//     the thread_id. The `done` frame's session_id is informational.
//   - Files attach as pasted URLs, never bytes — the backend downloads
//     each once at turn start (50 MB gate, any MIME). There is no upload
//     endpoint; a URL only needs to be alive when Send is pressed.
//   - Outputs show as an ARTIFACT, the way Claude shows one: a collapsible
//     panel on the right, keyed on `file_name` alone (2026-09-02, reversed
//     again — there is no output URL any more; every file is identified by
//     name and its bytes come ONLY from the backend's
//     `GET /threads/{id}/outputs/{file_name}`, built here by
//     `forecastOutputUrl`). The output LIST itself no longer rides the
//     `done`/`error` frames or `GET /history` (2026-09-02, the user's call:
//     "we only need to stream the messages, the outputs can be sent by get
//     api") — it is read with `listForecastOutputs`, once when a thread
//     opens and once after every turn ends. Rendering is chosen from
//     `mime_type` (the file extension is a fallback used only when the
//     backend sends `application/octet-stream`): a spreadsheet
//     (xlsx/xlsm/csv) is fetched as bytes and rendered CLIENT-SIDE with
//     SheetJS, one tab per sheet, capped at 2,000 rows; a PDF renders in a
//     plain iframe pointed at the download route; text/markdown/JSON is
//     fetched and shown in a `<pre>`, capped at 200 KB; docx/pptx/anything
//     else falls back to a message with Open and Download links and no
//     preview. There is no server-side preview route and no public cloud
//     link of any kind. The panel collapses to a rail of file icons and
//     remembers its open/closed state in localStorage. A rebuild keeps the
//     same `file_name`, so the preview re-fetches whenever the post-turn
//     output list still names the currently-selected file, and never while
//     a turn is running.
//
// Wire contract documented in `lib/forecastAgentApi.js`.

const PANEL_OPEN_KEY = 'growvana.forecast.artifactPanelOpen';

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function newThreadId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'forecast-' + Math.random().toString(36).slice(2, 10);
}

function isLikelyUrl(value) {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

// Display name for an attachment URL — last path segment, decoded. The
// backend derives its own name from Content-Disposition; this is only
// the chip label.
function fileNameFromUrl(url) {
  try {
    const path = new URL(url).pathname;
    const last = path.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : url;
  } catch {
    return url;
  }
}

// The panel's open/collapsed state survives a reload. Every read and write
// is guarded: storage can be absent or throw (private windows, blocked site
// data), and the panel must render correctly with no stored value.
function readPanelOpen() {
  try {
    const stored = window.localStorage.getItem(PANEL_OPEN_KEY);
    return stored === null ? true : stored === '1';
  } catch {
    return true;
  }
}

function writePanelOpen(open) {
  try {
    window.localStorage.setItem(PANEL_OPEN_KEY, open ? '1' : '0');
  } catch {
    /* storage unavailable — the state still lives in React */
  }
}

// GET /history messages → the screen's own message shape. History parts are
// text / attachment_note / tool_use (with an optional attached result), and
// the roles are already user | assistant.
function historyToMessages(history) {
  return (history?.messages || []).map((m) => ({
    id: m.id || newId(),
    role: m.role,
    parts: (m.parts || []).map((p) => {
      if (p.type === 'tool_use') {
        return {
          type: 'tool_use',
          id: p.id,
          name: p.name,
          input: p.input,
          result: p.result || undefined,
        };
      }
      if (p.type === 'attachment_note') {
        return { type: 'attachment_note', text: p.text || '' };
      }
      return { type: 'text', text: p.text || '' };
    }),
  }));
}

function systemNoteMessage(text, error = false) {
  return {
    id: newId(),
    role: 'assistant',
    parts: [{ type: 'system_note', text, error }],
  };
}

function fileExtension(fileName) {
  const idx = (fileName || '').lastIndexOf('.');
  return idx === -1 ? '' : fileName.slice(idx + 1).toLowerCase();
}

// How a file is rendered is decided from `mime_type` — the extension is a
// fallback used ONLY when the backend could not name one
// (`application/octet-stream`).
const SPREADSHEET_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel.sheet.macroEnabled.12', // xlsm
  'text/csv',
]);
const SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xlsm', 'csv']);
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'json']);

function previewKind(fileName, mimeType) {
  if (mimeType && mimeType !== 'application/octet-stream') {
    if (SPREADSHEET_MIME_TYPES.has(mimeType)) return 'sheet';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text';
    return 'other'; // docx, pptx, and anything else with a stated MIME type
  }
  const ext = fileExtension(fileName);
  if (SPREADSHEET_EXTENSIONS.has(ext)) return 'sheet';
  if (ext === 'pdf') return 'pdf';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  return 'other';
}

// SheetJS reads a sheet's range off its own `!ref` — there is no `range`
// option on `sheet_to_html` — so capping rows means shrinking a CLONE of
// that ref before conversion, never the workbook itself.
const SHEET_PREVIEW_ROW_CAP = 2000;
const SHEET_DOC_HEAD = `<!doctype html><html><head><meta charset="utf-8"/><style>
  body { margin:0; padding:10px; font:12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:#1e293b; background:#fff; }
  table { border-collapse:collapse; width:max-content; min-width:100%; }
  td { border:1px solid #e2e8f0; padding:3px 8px; white-space:nowrap; }
  tr:nth-child(odd) { background:#f8fafc; }
</style></head><body>`;
const SHEET_DOC_FOOT = '</body></html>';

function sheetToCappedHtml(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  const opts = { header: SHEET_DOC_HEAD, footer: SHEET_DOC_FOOT };
  if (!ws || !ws['!ref']) {
    return { html: SHEET_DOC_HEAD + '<table></table>' + SHEET_DOC_FOOT, truncated: false, rowsShown: 0, rowsTotal: 0 };
  }
  const range = XLSX.utils.decode_range(ws['!ref']);
  const rowsTotal = range.e.r - range.s.r + 1;
  const truncated = rowsTotal > SHEET_PREVIEW_ROW_CAP;
  const endRow = truncated ? range.s.r + SHEET_PREVIEW_ROW_CAP - 1 : range.e.r;
  const cappedRef = XLSX.utils.encode_range({ s: range.s, e: { r: endRow, c: range.e.c } });
  const html = XLSX.utils.sheet_to_html({ ...ws, '!ref': cappedRef }, opts);
  return { html, truncated, rowsShown: endRow - range.s.r + 1, rowsTotal };
}

// Approximate — plain text is close enough to 1 byte/char for this cap to
// matter in practice, and exactness is not the point.
const TEXT_PREVIEW_CHAR_CAP = 200 * 1024;

export default function ForecastAgentScreen({
  activeView,
  onSelectView,
  foundationThreadId,
  projectName,
  onNewProject,
  // Standalone entry (campaign chooser): no foundation session backs the
  // thread, so the Foundations / Execution tabs are hidden.
  hideFoundation = false,
}) {
  // null until a thread is opened — the start card shows until then.
  const [threadId, setThreadId] = useState(null);
  const [threadInput, setThreadInput] = useState(() => newThreadId());
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  const [messages, setMessages] = useState([]); // {id, role, parts: [...]}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  // Attachment URLs staged for the NEXT send; cleared on send.
  // Shape: [{ id, url }]
  const [pendingUrls, setPendingUrls] = useState([]);
  const [urlDraft, setUrlDraft] = useState('');
  // running_total_cost_usd off the latest `done` frame (or the history when
  // a thread is reopened).
  const [spend, setSpend] = useState(null);

  // The artifact panel. `outputs` is the thread's whole output list, newest
  // first, as read from `GET /threads/{id}/outputs`:
  // [{ file_name, mime_type }]. `selectedFile` is the file_name currently
  // shown. `outputsRevision` bumps every time that list is re-read after a
  // turn ends — a rebuild keeps the same `file_name`, so this is what tells
  // the panel to re-fetch a preview that otherwise looks unchanged.
  const [outputs, setOutputs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [outputsRevision, setOutputsRevision] = useState(0);
  const [panelOpen, setPanelOpen] = useState(readPanelOpen);

  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  // Mirrors `threadId` for the async output-list read in
  // `refreshOutputsAfterTurn`, which can resolve after the user has already
  // reset to a different (or no) thread.
  const threadIdRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  useEffect(() => {
    writePanelOpen(panelOpen);
  }, [panelOpen]);

  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  // Replace the output list, keeping the selection where it still exists.
  function applyOutputs(next) {
    setOutputs(next);
    setSelectedFile((current) =>
      current && next.some((o) => o.file_name === current)
        ? current
        : next[0]?.file_name || null,
    );
  }

  function showArtifact(file_name) {
    setSelectedFile(file_name);
    setPanelOpen(true);
  }

  // Open a thread — fresh or existing. The server holds the conversation,
  // so earlier turns come back from GET /history and the thread's files
  // come back separately from `listForecastOutputs`; `note` is shown first
  // when there is something to say about how the thread was reached.
  async function openThread(tid, note) {
    setThreadId(tid);
    setMessages(note ? [systemNoteMessage(note)] : []);
    setOutputs([]);
    setSelectedFile(null);
    setSpend(null);
    try {
      const history = await getForecastHistory(tid);
      setMessages((prev) => [...historyToMessages(history), ...prev]);
      if (typeof history?.total_cost_usd === 'number') setSpend(history.total_cost_usd);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        systemNoteMessage(`Could not load this thread's earlier turns: ${e.message}`, true),
      ]);
    }
    // History no longer carries the output list (2026-09-02) — seed the
    // panel from its own GET. Do NOT append chat cards for these: they
    // belong to past turns, and the history's own messages already render
    // whatever the agent said about them. A listing failure must not break
    // the reopened thread; the panel is simply empty until the next turn.
    try {
      const { outputs: list } = await listForecastOutputs(tid);
      applyOutputs(list || []);
    } catch (e) {
      console.error('forecast-agent: failed to list outputs for thread', tid, e);
    }
  }

  async function start() {
    const tid = threadInput.trim();
    if (!FORECAST_THREAD_ID_RE.test(tid)) {
      setStartError(
        'Thread id must start with a letter or digit and use only letters, digits, dots, dashes and underscores (max 128 chars).',
      );
      return;
    }
    if (!foundationThreadId) {
      setStartError('No foundation session is available to link this thread to.');
      return;
    }
    setStarting(true);
    setStartError(null);
    try {
      await initForecastThread({
        thread_id: tid,
        foundation_thread_id: foundationThreadId,
      });
      await openThread(tid);
    } catch (e) {
      if (e.status === 'ThreadExistsError') {
        await openThread(tid, `Opened existing thread ${tid}.`);
      } else {
        setStartError(e.message || 'Failed to start the forecast thread.');
      }
    } finally {
      setStarting(false);
    }
  }

  function addPendingUrl() {
    const url = urlDraft.trim();
    if (!isLikelyUrl(url)) return;
    setPendingUrls((prev) =>
      prev.some((p) => p.url === url) ? prev : [...prev, { id: newId(), url }],
    );
    setUrlDraft('');
  }

  function removePendingUrl(id) {
    setPendingUrls((prev) => prev.filter((p) => p.id !== id));
  }

  // Called once per turn, after the turn is over, with the thread's whole
  // output list read back from `GET /threads/{id}/outputs` — outputs no
  // longer ride the `done`/`error` frames themselves. Updates the panel and
  // appends one card per file to the turn's assistant message — whatever
  // the backend sends, the screen just shows. Bumping `outputsRevision`
  // unconditionally (even on an empty list) is what lets the panel notice a
  // file rebuilt under the same name.
  function handleOutputs(assistantMsgId, list) {
    applyOutputs(list);
    setOutputsRevision((r) => r + 1);
    if (list.length === 0) return;
    setMessages((prev) => appendToAssistant(prev, assistantMsgId, (parts) => [
      ...parts,
      ...list.map((o) => ({ type: 'output_file', file_name: o.file_name, mime_type: o.mime_type })),
    ]));
  }

  // The one place a turn's files are discovered now that they no longer
  // ride the SSE frames — called from `send()`'s `finally` block whatever
  // the turn's outcome (success, error frame, thrown exception, or
  // cancellation). `forTid` is captured at the top of that turn's `send()`
  // call; the guard against `threadIdRef` drops a stale reply that resolves
  // after the user has already reset to a different thread. A listing
  // failure must not disturb the turn's own rendering — it just logs and
  // leaves the previous list standing.
  async function refreshOutputsAfterTurn(forTid, assistantMsgId) {
    if (!forTid) return;
    try {
      const { outputs: list } = await listForecastOutputs(forTid);
      if (threadIdRef.current !== forTid) return;
      handleOutputs(assistantMsgId, list || []);
    } catch (e) {
      console.error('forecast-agent: failed to list outputs after turn', e);
    }
  }

  async function send() {
    const trimmed = input.trim();
    if ((!trimmed && pendingUrls.length === 0) || busy || !threadId) return;

    // Snapshot the staged URLs and clear the tray — they belong to THIS
    // turn only. The backend keeps the files on the thread afterwards,
    // so a later turn never needs to re-attach them.
    const turnUrls = pendingUrls;
    setPendingUrls([]);

    const userParts = [];
    if (trimmed) userParts.push({ type: 'text', text: trimmed });
    for (const p of turnUrls) {
      userParts.push({
        type: 'attachment',
        url: p.url,
        name: fileNameFromUrl(p.url),
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
      for await (const evt of streamForecastTurn({
        thread_id: threadId,
        user_message: trimmed || '(file attachment)',
        attachment_urls: turnUrls.map((p) => p.url),
        signal: controller.signal,
      })) {
        if (evt.type === 'text_delta') {
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
            { type: 'tool_use', id: evt.id, name: evt.name, input: evt.input },
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
          // Canonical aggregated text — already shown via `text_delta`.
        } else if (evt.type === 'done') {
          if (typeof evt.running_total_cost_usd === 'number') {
            setSpend(evt.running_total_cost_usd);
          }
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
          // Every runtime failure — an attachment refusal (the message
          // names the file), a busy thread, a timeout, a crashed turn —
          // lands here as a plain message. The error frame carries no
          // output list any more (2026-09-02) — a turn that died may still
          // have written files, and the `finally` block below reads them
          // back with `listForecastOutputs`, same as a successful turn.
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
      // The turn is over, whatever its outcome (success, error frame,
      // thrown exception, or cancellation) — outputs no longer ride the SSE
      // frames, so this is the one place that reads a turn's files back.
      refreshOutputsAfterTurn(threadId, assistantMsg.id);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function resetThread() {
    cancel();
    setThreadId(null);
    setThreadInput(newThreadId());
    setStartError(null);
    setMessages([]);
    setPendingUrls([]);
    setUrlDraft('');
    setSpend(null);
    setOutputs([]);
    setSelectedFile(null);
  }

  const hasOutputs = Boolean(threadId) && outputs.length > 0;
  const panelExpanded = hasOutputs && panelOpen;

  return (
    <div className="h-screen flex bg-ink-50 dark:bg-slate-950">
      <Sidebar
        projectName={projectName}
        activeView={activeView}
        onSelectView={onSelectView}
        onNewProject={onNewProject}
        hideFoundation={hideFoundation}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-6 flex items-center justify-between border-b border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div>
            <h1 className="text-[15px] font-semibold text-ink-900 dark:text-slate-100">
              Forecast Agent
            </h1>
            <div className="text-[11px] text-ink-400 dark:text-slate-500">
              {threadId
                ? `Thread ${threadId.slice(0, 8)}…${
                    typeof spend === 'number' ? ` · $${spend.toFixed(4)} spent` : ''
                  }${outputs.length > 0 ? ` · ${outputs.length} file${outputs.length === 1 ? '' : 's'}` : ''}`
                : 'New thread'}
            </div>
          </div>
          {threadId && (
            <button
              type="button"
              onClick={resetThread}
              disabled={busy}
              className="text-[12px] px-3 py-1.5 rounded-md border border-ink-200 dark:border-slate-700 text-ink-600 dark:text-slate-300 hover:bg-ink-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              New thread
            </button>
          )}
        </header>

        {!threadId ? (
          <StartCard
            threadInput={threadInput}
            onThreadInput={setThreadInput}
            onStart={start}
            starting={starting}
            error={startError}
          />
        ) : (
          <>
            <div className="flex-1 flex min-h-0">
              <div
                ref={scrollRef}
                className={[
                  'overflow-auto px-6 py-6 min-w-0',
                  panelExpanded ? 'flex-1 border-r border-ink-200 dark:border-slate-800' : 'flex-1',
                ].join(' ')}
              >
                <div className={panelExpanded ? 'flex flex-col gap-4' : 'max-w-3xl mx-auto flex flex-col gap-4'}>
                  {messages.length === 0 && <EmptyState />}
                  {messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      onOpenArtifact={showArtifact}
                      threadId={threadId}
                    />
                  ))}
                  {busy && (
                    <div className="text-[12px] text-ink-400 dark:text-slate-500 italic">
                      Forecast agent working…
                    </div>
                  )}
                </div>
              </div>
              {hasOutputs && panelOpen && (
                <ArtifactPanel
                  outputs={outputs}
                  selectedFile={selectedFile}
                  onSelect={showArtifact}
                  onCollapse={() => setPanelOpen(false)}
                  threadId={threadId}
                  busy={busy}
                  refreshTick={outputsRevision}
                />
              )}
              {hasOutputs && !panelOpen && (
                <ArtifactRail
                  outputs={outputs}
                  selectedFile={selectedFile}
                  onExpand={() => setPanelOpen(true)}
                  onSelect={showArtifact}
                />
              )}
            </div>

            <footer className="border-t border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3">
              <div className="max-w-3xl mx-auto flex flex-col gap-2">
                {pendingUrls.length > 0 && (
                  <PendingUrlStrip urls={pendingUrls} onRemove={removePendingUrl} />
                )}
                <div className="flex gap-2 items-center">
                  <span className="text-ink-400 dark:text-slate-500">
                    <IconLink width={14} height={14} />
                  </span>
                  <input
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPendingUrl();
                      }
                    }}
                    placeholder="Attach a file by URL (https://…) — sales exports, PO history, price lists"
                    className="flex-1 rounded-md border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-[12px] text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={addPendingUrl}
                    disabled={busy || !isLikelyUrl(urlDraft)}
                    className="text-[12px] px-3 py-1.5 rounded-md border border-ink-200 dark:border-slate-700 text-ink-600 dark:text-slate-300 hover:bg-ink-50 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    Add file
                  </button>
                </div>
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Ask the forecast agent (Enter to send, Shift+Enter for a new line)…"
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
                      disabled={!input.trim() && pendingUrls.length === 0}
                      className="h-[46px] px-4 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                      Send
                    </button>
                  )}
                </div>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

function appendToAssistant(messages, id, transform) {
  return messages.map((m) =>
    m.id === id && m.role === 'assistant' ? { ...m, parts: transform(m.parts) } : m,
  );
}

function StartCard({ threadInput, onThreadInput, onStart, starting, error }) {
  return (
    <div className="flex-1 overflow-auto px-6 py-10">
      <div className="mx-auto w-full max-w-md flex flex-col gap-5">
        <div className="rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-6">
          <div className="text-[15px] font-semibold text-ink-900 dark:text-slate-100 mb-1">
            Start a forecast thread
          </div>
          <p className="text-[12.5px] text-ink-500 dark:text-slate-400 leading-relaxed mb-4">
            One thread is one continuous forecasting conversation for one brand.
            Attach real sales files, agree on a plan in chat, and the agent builds
            a verified Excel workbook you can read right here beside the conversation.
            Paste the id of an earlier thread to pick it up where it left off.
          </p>
          <label className="block text-[11px] uppercase tracking-wider text-ink-400 dark:text-slate-500 mb-1">
            Thread id
          </label>
          <input
            value={threadInput}
            onChange={(e) => onThreadInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onStart();
              }
            }}
            className="w-full font-mono rounded-md border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[12.5px] text-ink-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            disabled={starting}
          />
          {error && (
            <div className="mt-2 text-[12px] text-rose-600 dark:text-rose-400">{error}</div>
          )}
          <button
            type="button"
            onClick={onStart}
            disabled={starting || !threadInput.trim()}
            className="mt-4 w-full h-[40px] rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {starting ? 'Opening…' : 'Start or open thread'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="text-[14px] font-semibold text-ink-700 dark:text-slate-200 mb-1">
        Forecast Agent
      </div>
      <p className="text-[13px] text-ink-500 dark:text-slate-400 max-w-md mx-auto">
        Sales forecasting for 1P Vendor Central, grounded in your real files.
        Attach exports by URL, describe what you need, confirm the plan the
        agent proposes in chat — the finished workbook opens in a panel beside
        this conversation and updates whenever the agent revises it.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2 text-[12px] text-ink-500 dark:text-slate-400">
        <Suggestion>Attach PO history and ask what it shows</Suggestion>
        <Suggestion>Build a 12-month sell-in forecast</Suggestion>
        <Suggestion>What files do you need from me?</Suggestion>
      </div>
    </div>
  );
}

function Suggestion({ children }) {
  return (
    <span className="px-3 py-1 rounded-full border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      {children}
    </span>
  );
}

function PendingUrlStrip({ urls, onRemove }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {urls.map((p) => (
        <span
          key={p.id}
          title={p.url}
          className="inline-flex items-center gap-1.5 max-w-[280px] rounded-md border border-ink-200 dark:border-slate-700 bg-ink-50 dark:bg-slate-800 px-2 py-1 text-[11.5px] text-ink-600 dark:text-slate-300"
        >
          <IconLink width={12} height={12} />
          <span className="truncate">{fileNameFromUrl(p.url)}</span>
          <button
            type="button"
            onClick={() => onRemove(p.id)}
            className="text-ink-400 dark:text-slate-500 hover:text-ink-700 dark:hover:text-slate-200"
            aria-label="Remove attachment"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

// ---- The artifact panel ---------------------------------------------------
//
// Every output is `{ file_name, mime_type }` — no URL of any kind. A file's
// bytes come only from `forecastOutputUrl(threadId, file_name)`, the
// backend's own download-by-name route, and every renderer below either
// points an iframe at that route or fetches it.

// The collapsed panel: a narrow rail with one icon per output. Clicking an
// icon expands the panel on that file.
function ArtifactRail({ outputs, selectedFile, onExpand, onSelect }) {
  return (
    <aside className="w-12 shrink-0 flex flex-col items-center gap-1 py-2 border-l border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={onExpand}
        title="Show artifacts"
        aria-label="Show artifacts"
        className="w-8 h-8 rounded-md grid place-items-center text-ink-500 dark:text-slate-400 hover:bg-ink-100 dark:hover:bg-slate-800"
      >
        <IconArrowLeft width={14} height={14} />
      </button>
      <div className="w-6 border-t border-ink-200 dark:border-slate-800 my-1" />
      {outputs.map((out) => {
        const active = out.file_name === selectedFile;
        return (
          <button
            key={out.file_name}
            type="button"
            onClick={() => onSelect(out.file_name)}
            title={out.file_name}
            aria-label={`Open ${out.file_name}`}
            className={[
              'w-8 h-8 rounded-md grid place-items-center',
              active
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'text-ink-500 dark:text-slate-400 hover:bg-ink-100 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            <IconChart width={15} height={15} />
          </button>
        );
      })}
    </aside>
  );
}

// The expanded panel: one tab per output file, a download from the backend's
// download-by-name route, a collapse control, then the rendering below.
function ArtifactPanel({ outputs, selectedFile, onSelect, onCollapse, threadId, busy, refreshTick }) {
  const selected = outputs.find((o) => o.file_name === selectedFile) || outputs[0];
  return (
    <aside className="w-1/2 min-w-[420px] shrink-0 flex flex-col bg-ink-50 dark:bg-slate-950">
      <div className="flex items-center gap-2 border-b border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto">
          {outputs.map((out) => {
            const active = selected && out.file_name === selected.file_name;
            return (
              <button
                key={out.file_name}
                type="button"
                onClick={() => onSelect(out.file_name)}
                title={out.file_name}
                className={[
                  'shrink-0 max-w-[220px] inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md border',
                  active
                    ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : 'border-ink-200 dark:border-slate-700 text-ink-600 dark:text-slate-300 hover:bg-ink-50 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                <IconChart width={13} height={13} />
                <span className="truncate">{out.file_name}</span>
              </button>
            );
          })}
        </div>
        {selected && (
          <a
            href={forecastOutputUrl(threadId, selected.file_name)}
            download={selected.file_name}
            className="shrink-0 inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700"
          >
            <IconDownload width={13} height={13} />
            Download
          </a>
        )}
        <button
          type="button"
          onClick={onCollapse}
          title="Collapse"
          aria-label="Collapse artifacts"
          className="shrink-0 w-8 h-8 rounded-md grid place-items-center text-ink-500 dark:text-slate-400 hover:bg-ink-100 dark:hover:bg-slate-800"
        >
          <IconArrowRight width={14} height={14} />
        </button>
      </div>
      <div className="flex-1 min-h-0 p-3">
        {selected ? (
          <ArtifactView output={selected} threadId={threadId} busy={busy} refreshTick={refreshTick} />
        ) : (
          <div className="h-full grid place-items-center text-[12px] text-ink-400 dark:text-slate-500">
            No file selected
          </div>
        )}
      </div>
    </aside>
  );
}

// One output's rendering, chosen from `mime_type` (extension only as a
// fallback for `application/octet-stream`). Remounts `FilePreview` on every
// `file_name` change so its internal fetch state always starts clean.
function ArtifactView({ output, threadId, busy, refreshTick }) {
  return (
    <FilePreview
      key={output.file_name}
      output={output}
      threadId={threadId}
      busy={busy}
      refreshTick={refreshTick}
    />
  );
}

const ARTIFACT_SHELL =
  'h-full flex flex-col min-h-0 rounded-md bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-700 overflow-hidden';

// Fetches and renders ONE file. `busy` holds off every fetch until the
// current turn ends (a rebuild may still be mid-flight); `refreshTick`
// forces a re-fetch when a `done`/`error` names this same file again, since
// a rebuilt file keeps its file_name and would otherwise look unchanged.
function FilePreview({ output, threadId, busy, refreshTick }) {
  const { file_name, mime_type } = output;
  const kind = previewKind(file_name, mime_type);
  const downloadUrl = forecastOutputUrl(threadId, file_name);

  const [loading, setLoading] = useState(kind === 'sheet' || kind === 'text');
  const [error, setError] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [text, setText] = useState('');
  const [textTruncated, setTextTruncated] = useState(false);

  useEffect(() => {
    if (busy) return; // the file behind this name may be mid-rewrite
    if (kind !== 'sheet' && kind !== 'text') return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        if (kind === 'sheet') {
          const buf = await res.arrayBuffer();
          const wb = XLSX.read(buf, { type: 'array', cellStyles: false });
          if (cancelled) return;
          setWorkbook(wb);
          setSheetIndex(0);
        } else {
          const full = await res.text();
          if (cancelled) return;
          const capped = full.length > TEXT_PREVIEW_CHAR_CAP;
          setText(capped ? full.slice(0, TEXT_PREVIEW_CHAR_CAP) : full);
          setTextTruncated(capped);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [downloadUrl, kind, refreshTick, busy]);

  if (kind === 'pdf') {
    return (
      <div className={ARTIFACT_SHELL}>
        <iframe
          title={file_name}
          src={downloadUrl}
          className="block w-full flex-1 min-h-0 bg-white"
          style={{ border: 0 }}
        />
      </div>
    );
  }

  if (kind === 'other') {
    return (
      <div className={`${ARTIFACT_SHELL} grid place-items-center gap-2 text-[12px] text-ink-400 dark:text-slate-500 text-center px-6`}>
        <div>No preview is available for {file_name}.</div>
        <div className="flex items-center gap-3">
          <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">
            Open
          </a>
          <a href={downloadUrl} download={file_name} className="text-brand-600 dark:text-brand-400 hover:underline">
            Download
          </a>
        </div>
      </div>
    );
  }

  if (busy) {
    return (
      <div className={`${ARTIFACT_SHELL} grid place-items-center text-[12px] text-ink-400 dark:text-slate-500`}>
        Waiting for the turn to finish…
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${ARTIFACT_SHELL} grid place-items-center text-[12px] text-ink-400 dark:text-slate-500`}>
        Loading {file_name}…
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${ARTIFACT_SHELL} grid place-items-center gap-2 text-[12px] text-rose-600 dark:text-rose-400 text-center px-6`}>
        <div>Could not load {file_name}: {error}</div>
        <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">
          Open directly
        </a>
      </div>
    );
  }

  if (kind === 'sheet') {
    if (!workbook) return null;
    const sheetNames = workbook.SheetNames;
    const activeIndex = Math.min(sheetIndex, sheetNames.length - 1);
    const activeName = sheetNames[activeIndex];
    const { html, truncated, rowsShown, rowsTotal } = sheetToCappedHtml(workbook, activeName);
    return (
      <div className={ARTIFACT_SHELL}>
        {sheetNames.length > 1 && (
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-ink-200 dark:border-slate-800 overflow-x-auto shrink-0">
            {sheetNames.map((name, i) => (
              <button
                key={name}
                type="button"
                onClick={() => setSheetIndex(i)}
                className={[
                  'shrink-0 text-[11.5px] px-2.5 py-1 rounded-md border',
                  i === activeIndex
                    ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : 'border-ink-200 dark:border-slate-700 text-ink-600 dark:text-slate-300 hover:bg-ink-50 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {truncated && (
          <div className="px-3 py-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-b border-ink-200 dark:border-slate-800 shrink-0">
            Showing first {rowsShown.toLocaleString()} of {rowsTotal.toLocaleString()} rows.
          </div>
        )}
        <iframe
          title={`${file_name} — ${activeName}`}
          srcDoc={html}
          sandbox=""
          className="block w-full flex-1 min-h-0 bg-white"
          style={{ border: 0 }}
        />
      </div>
    );
  }

  // kind === 'text'
  return (
    <div className={`${ARTIFACT_SHELL} overflow-auto p-3`}>
      {textTruncated && (
        <div className="mb-2 text-[11px] text-amber-700 dark:text-amber-400">
          Showing the first 200 KB of {file_name}.
        </div>
      )}
      <pre className="text-[12px] whitespace-pre-wrap break-words text-ink-800 dark:text-slate-200">{text}</pre>
    </div>
  );
}

// Folds RUNS of adjacent `tool_use` parts sharing one `name` into a single
// group item for display only — `message.parts` itself is never touched, so
// grouping is recomputed fresh on every render and is pure rendering, not a
// state transform. A run breaks on any non-`tool_use` part or a change of
// tool name; a run of exactly one call is left as that bare part, so a lone
// call renders exactly as it always has.
function groupToolCalls(parts) {
  const grouped = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (part.type === 'tool_use') {
      let end = i + 1;
      while (
        end < parts.length &&
        parts[end].type === 'tool_use' &&
        parts[end].name === part.name
      ) {
        end++;
      }
      const run = parts.slice(i, end);
      grouped.push(run.length > 1 ? { type: 'tool_use_group', calls: run } : run[0]);
      i = end;
    } else {
      grouped.push(part);
      i++;
    }
  }
  return grouped;
}

function MessageBubble({ message, onOpenArtifact, threadId }) {
  if (message.role === 'user') {
    const textParts = message.parts.filter((p) => p.type === 'text');
    const attachmentParts = message.parts.filter((p) => p.type === 'attachment');
    const noteParts = message.parts.filter((p) => p.type === 'attachment_note');
    return (
      <div className="self-end max-w-[80%] flex flex-col items-end gap-1.5">
        {attachmentParts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {attachmentParts.map((p, i) => (
              <a
                key={i}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                title={p.url}
                className="inline-flex items-center gap-1.5 max-w-[240px] rounded-md border border-brand-300 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-500/10 px-2 py-1 text-[11.5px] text-brand-700 dark:text-brand-500"
              >
                <IconLink width={12} height={12} />
                <span className="truncate">{p.name}</span>
              </a>
            ))}
          </div>
        )}
        {noteParts.length > 0 && (
          <div className="flex flex-col items-end gap-0.5">
            {noteParts.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[11px] text-ink-500 dark:text-slate-400 italic"
              >
                <IconLink width={11} height={11} />
                {p.text}
              </span>
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
      {groupToolCalls(message.parts).map((p, i) => {
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
        if (p.type === 'tool_use_group') {
          // Keyed by the run's first call id (stable — see `groupToolCalls`)
          // so this component's own `open` state survives a call joining the
          // run mid-stream instead of resetting or forcing open.
          return <ToolCallGroup key={p.calls[0].id} calls={p.calls} />;
        }
        if (p.type === 'tool_use') {
          return <ToolCall key={i} call={p} />;
        }
        if (p.type === 'tool_result') {
          return <ToolResult key={i} result={p} />;
        }
        if (p.type === 'output_file') {
          return <DeliverableCard key={i} deliverable={p} threadId={threadId} onOpen={onOpenArtifact} />;
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

// A delivered file as a chat card — file name, and Open + Download links to
// the backend's download-by-name route. Every listed file is downloadable,
// so there is no failure state here any more. Clicking the name or icon
// focuses the artifact panel on the file.
function DeliverableCard({ deliverable, threadId, onOpen }) {
  const { file_name } = deliverable;
  const downloadUrl = forecastOutputUrl(threadId, file_name);
  return (
    <div className="rounded-md border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 flex items-center gap-3 max-w-md">
      <button
        type="button"
        onClick={() => onOpen(file_name)}
        title="Open in the artifact panel"
        className="shrink-0 w-8 h-8 rounded-md bg-emerald-100 dark:bg-emerald-500/20 grid place-items-center text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30"
      >
        <IconChart width={16} height={16} />
      </button>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onOpen(file_name)}
          className="block w-full text-left text-[12.5px] font-medium text-ink-900 dark:text-slate-100 truncate hover:underline"
          title={file_name}
        >
          {file_name}
        </button>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          Open
        </a>
        <a
          href={downloadUrl}
          download={file_name}
          className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700"
        >
          <IconDownload width={13} height={13} />
          Download
        </a>
      </div>
    </div>
  );
}

// Display label for one tool call — shared by the single-call row and the
// collapsed group row so the two never drift apart.
function toolCallLabel(call) {
  return call.name === 'Skill' ? `Skill · ${call.input?.name || '?'}` : call.name;
}

// pending | ok | error for one call, from whether/how its result landed.
function toolCallStatus(call) {
  if (!call.result) return 'pending';
  return call.result.is_error ? 'error' : 'ok';
}

// A run's status: any child error wins; otherwise pending until every child
// has a result, then ok. "otherwise normal styling" from the brief covers
// both ok and pending here, the same way a single in-flight call already
// reads as its own (non-error) pending dot.
function groupStatus(calls) {
  if (calls.some((c) => c.result?.is_error)) return 'error';
  if (calls.every((c) => c.result)) return 'ok';
  return 'pending';
}

function StatusDot({ status }) {
  return (
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
  );
}

function ToolCall({ call }) {
  const [open, setOpen] = useState(false);
  const summary = toolCallLabel(call);
  const status = toolCallStatus(call);
  return (
    <div className="rounded-md border border-ink-200 dark:border-slate-800 bg-ink-50 dark:bg-slate-900 text-[12px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-ink-100 dark:hover:bg-slate-800"
      >
        <span className="flex items-center gap-2">
          <StatusDot status={status} />
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

// A run of 2+ consecutive `tool_use` calls sharing one `name` (see
// `groupToolCalls`), collapsed into one row by default. Expanding renders
// every call in order with the unchanged `ToolCall`, so the detail view is
// identical to today's — only the stacking above it collapses. The parent
// keys this component by the run's first call's `id`, which stays the same
// as later same-name calls join the run mid-stream, so `open` here survives
// every re-render without resetting and without ever being forced open.
function ToolCallGroup({ calls }) {
  const [open, setOpen] = useState(false);
  const label = toolCallLabel(calls[0]);
  const status = groupStatus(calls);
  return (
    <div className="rounded-md border border-ink-200 dark:border-slate-800 bg-ink-50 dark:bg-slate-900 text-[12px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-ink-100 dark:hover:bg-slate-800"
      >
        <span className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className="font-mono text-ink-700 dark:text-slate-200">{label}</span>
          <span className="inline-flex items-center rounded-full bg-ink-200 dark:bg-slate-700 text-ink-600 dark:text-slate-300 text-[10.5px] font-medium px-1.5 py-0.5">
            x{calls.length}
          </span>
        </span>
        <span className="text-ink-400 dark:text-slate-500">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-ink-200 dark:border-slate-800 space-y-1.5">
          {calls.map((call) => (
            <ToolCall key={call.id} call={call} />
          ))}
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
