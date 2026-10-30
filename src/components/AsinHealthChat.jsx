import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IconChevronRight, IconPlus, IconPulse, IconSend } from './icons.jsx';
import { initAsinChat, streamAsinChat } from '../lib/asinHealthApi.js';

// The ASIN Health chat column — our TEST screen's chat (see asinHealthApi.js for the
// wire), laid out like the concept's "Chat with ASIN Health Checker" panel.
//
// One thread per company, opened on the first question and kept while the screen is
// open; "New chat" starts the company over. Only the agent's answer is shown — the
// data-read chips are commented out with the backend's `data_query` frame (2026-10-30).

const SUGGESTIONS = [
  'Which 3 products sold the most last week?',
  'Which products lost the buy box in the last 7 days?',
  'How much stock do we have in our own warehouses?',
];

const NAVY = 'bg-[#0D1B4B]';

function timeLabel(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// /** A data read as a short call: `sales(all ASINs, 2026-10-19..2026-10-25, week)`. */
// function queryLabel(q) {
//   const parts = [q.asins?.length ? `${q.asins.length} ASIN${q.asins.length > 1 ? 's' : ''}` : 'all ASINs'];
//   if (q.date_from || q.date_to) parts.push(`${q.date_from || '…'}..${q.date_to || 'latest'}`);
//   if (q.grain && q.grain !== 'day') parts.push(q.grain);
//   if (q.open_only) parts.push('open only');
//   if (q.warehouse) parts.push(q.warehouse);
//   if (q.fields?.length) parts.push(`${q.fields.length} field${q.fields.length > 1 ? 's' : ''}`);
//   return `${q.dataset}(${parts.join(', ')})`;
// }

function AgentAvatar() {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E9F9F1] text-[#067a4a] dark:bg-emerald-500/15 dark:text-emerald-300">
      <IconPulse width={18} height={18} />
    </span>
  );
}

function AgentMessage({ message }) {
  return (
    <div className="flex items-start gap-3">
      <AgentAvatar />
      <div className="min-w-0 flex-1 rounded-2xl bg-ink-100 px-4 py-3 text-[14px] leading-relaxed text-ink-800 dark:bg-slate-800 dark:text-slate-200">
        {/* The data-read chips, until 2026-10-30:
        {message.queries.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-500 dark:text-slate-400">
            <span>Read</span>
            {message.queries.map((q, i) => (
              <span
                key={i}
                title={JSON.stringify(q)}
                className="rounded-md border border-[#e7e4da] bg-[#f4f2eb] px-2 py-0.5 font-mono text-[11px] text-[#0D1B4B] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
              >
                {queryLabel(q)}
              </span>
            ))}
          </div>
        )} */}
        {message.text ? (
          <div className="md overflow-x-auto text-[14px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
          </div>
        ) : (
          !message.error && <span className="text-ink-400 dark:text-slate-500">Thinking…</span>
        )}
        {message.streaming && message.text && (
          <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-[#0D1B4B] align-middle dark:bg-slate-300" />
        )}
        {message.error && <div className="text-[13px] text-rose-600 dark:text-rose-400">{message.error}</div>}
        <span className="mt-2 block text-right text-[11px] text-ink-400 dark:text-slate-500">{timeLabel(message.at)}</span>
      </div>
    </div>
  );
}

function UserMessage({ message }) {
  return (
    <div className={`ml-auto max-w-[85%] rounded-2xl rounded-br-md ${NAVY} px-4 py-2.5 text-[14px] leading-relaxed text-white`}>
      {message.text}
    </div>
  );
}

export default function AsinHealthChat({ companies, selected }) {
  const [open, setOpen] = useState(true);
  const [accountId, setAccountId] = useState(selected);
  const [threads, setThreads] = useState({}); // account_id → { threadId, messages }
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const abort = useRef(null);
  const scroller = useRef(null);

  // Follow the screen's company; with "All companies" keep the chat's own pick.
  useEffect(() => {
    if (selected) setAccountId(selected);
  }, [selected]);
  useEffect(() => {
    if (!accountId && companies.length) setAccountId(companies[0].account_id);
  }, [accountId, companies]);

  useEffect(() => () => abort.current?.abort(), []);

  const thread = threads[accountId] || { threadId: null, messages: [] };
  const company = companies.find((c) => c.account_id === accountId);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [thread.messages]);

  function update(id, change) {
    setThreads((all) => {
      const t = all[id] || { threadId: null, messages: [] };
      return { ...all, [id]: { ...t, ...change(t) } };
    });
  }

  // Changes the last message of a company's thread: the answer being streamed. A thread
  // "New chat" cleared meanwhile is left alone.
  function updateAnswer(id, change) {
    update(id, (t) => {
      const last = t.messages.at(-1);
      if (last?.role !== 'agent') return {};
      return { messages: [...t.messages.slice(0, -1), { ...last, ...change(last) }] };
    });
  }

  async function send(text) {
    const question = text.trim();
    if (!question || busy || !accountId) return;
    const id = accountId;
    const now = new Date().toISOString();
    setDraft('');
    setBusy(true);
    update(id, (t) => ({
      messages: [
        ...t.messages,
        { role: 'user', text: question, at: now },
        { role: 'agent', text: '', streaming: true, at: now },
      ],
    }));
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      let threadId = thread.threadId;
      if (!threadId) {
        threadId = `asin-chat-${id}-${Date.now()}`;
        await initAsinChat(threadId, id, ctrl.signal);
        update(id, () => ({ threadId }));
      }
      for await (const frame of streamAsinChat(threadId, question, ctrl.signal)) {
        if (frame.type === 'ai_message_token') {
          updateAnswer(id, (m) => ({ text: m.text + (frame.content || '') }));
        // } else if (frame.type === 'data_query') {
        //   updateAnswer(id, (m) => ({ queries: [...m.queries, frame.query] }));
        } else if (frame.type === 'done') {
          updateAnswer(id, (m) => ({ text: frame.ai_message || m.text, at: new Date().toISOString() }));
        } else if (frame.type === 'error') {
          updateAnswer(id, () => ({ error: frame.message || 'The chat failed.' }));
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') updateAnswer(id, () => ({ error: e.message }));
    } finally {
      updateAnswer(id, () => ({ streaming: false }));
      setBusy(false);
    }
  }

  function newChat() {
    abort.current?.abort();
    setThreads((all) => ({ ...all, [accountId]: { threadId: null, messages: [] } }));
  }

  if (!open) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-ink-200 bg-white py-3 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <IconChevronRight width={16} height={16} />
        </button>
        <AgentAvatar />
      </aside>
    );
  }

  return (
    <aside className="flex w-[420px] shrink-0 flex-col border-r border-ink-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-ink-200 px-5 py-3 dark:border-slate-800">
        <h2 className="text-[15px] font-semibold text-ink-900 dark:text-slate-100">Chat with ASIN Health Checker</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Collapse chat"
          className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <IconChevronRight width={15} height={15} className="rotate-180" />
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-2 dark:border-slate-800">
        <label htmlFor="asin-chat-company" className="text-[12px] text-ink-500 dark:text-slate-400">
          Company
        </label>
        <select
          id="asin-chat-company"
          value={accountId || ''}
          onChange={(e) => setAccountId(e.target.value)}
          disabled={busy}
          className="min-w-0 flex-1 rounded-md border border-ink-200 bg-white px-2 py-1 text-[13px] text-ink-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {companies.map((c) => (
            <option key={c.account_id} value={c.account_id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={newChat}
          disabled={busy || !thread.messages.length}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-ink-600 hover:bg-ink-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <IconPlus width={13} height={13} /> New chat
        </button>
      </div>

      <div ref={scroller} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        {thread.messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <AgentAvatar />
              <div className="rounded-2xl bg-ink-100 px-4 py-3 text-[14px] leading-relaxed text-ink-800 dark:bg-slate-800 dark:text-slate-200">
                Ask me about {company?.name || 'this company'}'s sales, buy box, prices, stock, purchase orders or
                listings. I read the data for every answer.
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={!accountId}
                  className="rounded-2xl border border-ink-200 px-3.5 py-2 text-left text-[13px] text-ink-700 hover:bg-ink-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          thread.messages.map((m, i) =>
            m.role === 'user' ? <UserMessage key={i} message={m} /> : <AgentMessage key={i} message={m} />,
          )
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-2 border-t border-ink-200 px-5 py-3 dark:border-slate-800"
      >
        <label htmlFor="asin-chat-input" className="sr-only">
          Ask anything
        </label>
        <input
          id="asin-chat-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything…"
          disabled={!accountId}
          className="min-h-11 flex-1 bg-transparent text-[15px] text-ink-800 outline-none placeholder:text-ink-400 dark:text-slate-200 dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={busy || !draft.trim()}
          className={`grid h-11 w-11 place-items-center rounded-full ${NAVY} text-white transition hover:opacity-90 disabled:opacity-40`}
        >
          <IconSend width={17} height={17} />
        </button>
      </form>
    </aside>
  );
}
