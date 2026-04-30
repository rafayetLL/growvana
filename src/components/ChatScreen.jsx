import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import MilestonesPanel from './MilestonesPanel.jsx';
import MilestoneViewer from './MilestoneViewer.jsx';
import Composer from './Composer.jsx';
import GapQuestions from './GapQuestions.jsx';
import { ChatMessageItem, DraftingActivityCard } from './MessageRenderers.jsx';
import { streamChat } from '../lib/api.js';
import { subscribeProgress, buildWebhookRequest } from '../lib/webhookBus.js';
import { MILESTONE_KEYS, milestoneLabel } from '../lib/milestones.js';

// User-facing states (plus `not_started`):
//   drafting   — milestone node is currently running (highest precedence)
//   drafted    — has a draft, never accepted
//   accepted   — draft matches accepted
//   redrafted  — has a pending draft AND was accepted previously
function deriveMilestoneStatus(key, markdown, pendingApproval, acceptedHistory, drafting) {
  if (drafting.has(key)) return 'drafting';
  if (!markdown[key]) return 'not_started';
  if (pendingApproval.has(key)) {
    return acceptedHistory.has(key) ? 'redrafted' : 'drafted';
  }
  return 'accepted';
}

/**
 * Full chat experience.
 *  - messages[]: durable conversation. Mixed types:
 *      - { role: 'user', content, attachments?, time }
 *      - { role: 'assistant', content, time }
 *      - { role: 'milestone', name, status: 'drafting' | 'drafted', content, time }
 *    Milestone entries are pushed live during streaming so the drafting
 *    cards and their streamed deliverable content persist in history.
 *  - gapQuestions: current batch awaiting submission (rendered inline)
 *  - streamingText: assistant's in-progress reply; null when idle
 *  - milestoneMarkdown: draft markdown per milestone key
 *  - pendingApproval / acceptedHistory: sets used to derive per-milestone status
 */
export default function ChatScreen({ initResult, activeView = 'foundations', onSelectView }) {
  const threadId = initResult.thread_id;
  const companyName = initResult.company_name;
  // One random task_id per ChatScreen mount; reused across all webhook
  // POSTs and the matching SSE relay subscription. Decouples the
  // webhook routing key from the conversation thread.
  const taskIdRef = useRef(crypto.randomUUID());
  const taskId = taskIdRef.current;

  const [messages, setMessages] = useState(() => {
    const base = [];
    if (initResult.ai_message) {
      base.push({ role: 'assistant', content: initResult.ai_message, time: Date.now() });
    }
    return base;
  });
  const [gapQuestions, setGapQuestions] = useState(() => initResult.gap_questions || []);
  const [streamingText, setStreamingText] = useState(null);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  const [milestoneMarkdown, setMilestoneMarkdown] = useState({});
  // Keys currently in pending_approval (draft != accepted). Authoritative — backend
  // sends the full list every turn, so we replace rather than merge.
  const [pendingApproval, setPendingApproval] = useState(() => new Set());
  // Keys that have ever been accepted. Used to distinguish a fresh draft from a
  // redraft-after-acceptance — both sit in `pending_approval`, only history tells
  // them apart.
  const [acceptedHistory, setAcceptedHistory] = useState(() => new Set());
  // Keys whose node is currently running. Set on `drafting` SSE event, cleared
  // when the matching `milestone` event lands or on done/error. Used only for
  // right-panel status derivation; the inline drafting card lives in `messages`.
  const [drafting, setDrafting] = useState(() => new Set());
  // Streaming web-search UI (disabled) — see docs/streaming-search-results.md.
  // Per-milestone web search activity shown alongside the drafting card:
  //   { [name]: { queries: [string], sources: [{url, title}] } }
  // Populated by web_search_started (query), web_search_results (sources),
  // and web_search_grounding (both, from Gemini post-hoc). Cleared on
  // `done` / error / abort.
  // const [milestoneWebSearch, setMilestoneWebSearch] = useState({});
  const [activeMilestone, setActiveMilestone] = useState(null);

  const milestoneStatus = useMemo(
    () =>
      Object.fromEntries(
        MILESTONE_KEYS.map((k) => [
          k,
          deriveMilestoneStatus(k, milestoneMarkdown, pendingApproval, acceptedHistory, drafting),
        ])
      ),
    [milestoneMarkdown, pendingApproval, acceptedHistory, drafting]
  );

  // Each milestone = 20%. Partial states contribute a fraction so the bar moves
  // while drafts are in progress, but a full 20% only lands on `accepted`.
  const overallProgress = useMemo(() => {
    const PER = 100 / MILESTONE_KEYS.length; // 20
    let total = 0;
    for (const k of MILESTONE_KEYS) {
      const s = milestoneStatus[k];
      if (s === 'accepted') total += PER;
      else if (s === 'redrafted') total += PER * 0.7;
      else if (s === 'drafted') total += PER * 0.5;
      else if (s === 'drafting') total += PER * 0.25;
    }
    return Math.round(total);
  }, [milestoneStatus]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Open ONE relay subscription for the lifetime of this ChatScreen mount.
  // The backend fires milestone lifecycle webhooks (currently only
  // `drafting_completed`) into the relay keyed by thread_id; we demux
  // here into the same state updates the old `milestone` SSE frame used
  // to drive. `drafting_started` still arrives on /chat/stream via
  // StreamWriter to preserve ordering with the token stream.
  useEffect(() => {
    const sub = subscribeProgress(taskId, (evt) => {
      if (evt?.stage !== 'drafting_completed') return;
      const name = evt.data?.milestone_name;
      const markdown = evt.data?.markdown;
      if (!name || typeof markdown !== 'string') return;

      setMilestoneMarkdown((prev) => ({ ...prev, [name]: markdown }));
      // Optimistic — real authoritative list lands on the `done` SSE frame.
      setPendingApproval((prev) => {
        if (prev.has(name)) return prev;
        const next = new Set(prev);
        next.add(name);
        return next;
      });
      setDrafting((prev) => {
        if (!prev.has(name)) return prev;
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
      // Flip the most recent in-history milestone message from 'drafting' to
      // 'drafted' and replace its streamed content with the authoritative
      // markdown (matters for blueprint, where the streamed exec summary is
      // a subset of the composed final document).
      setMessages((prev) => {
        let idx = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === 'milestone' && prev[i].name === name && prev[i].status === 'drafting') {
            idx = i;
            break;
          }
        }
        if (idx === -1) return prev;
        const next = prev.slice();
        next[idx] = { ...next[idx], status: 'drafted', content: markdown };
        return next;
      });
    });
    return () => sub.close();
  }, [taskId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, streamingText, gapQuestions, typing]);

  async function runStream({ user_message, gap_answers, file_urls }) {
    setError(null);
    setTyping(true);
    setStreamingText('');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Build webhook_request so milestone nodes fire `drafting_completed`
      // webhooks. The relay routes them back to this screen's
      // `subscribeProgress` handler above.
      const webhook_request = buildWebhookRequest({
        task_id: taskId,
        event_type: 'workflow.milestone',
        data: {
          thread_id: threadId,
          ...(user_message !== undefined ? { user_message } : {}),
          ...(gap_answers !== undefined ? { gap_answers } : {}),
        },
      });

      const iter = streamChat({
        thread_id: threadId,
        user_message,
        gap_answers,
        file_urls,
        webhook_request,
        signal: controller.signal,
      });

      let assembled = '';
      for await (const evt of iter) {
        if (evt.type === 'ai_message_token') {
          assembled += evt.content || '';
          setStreamingText(assembled);
        } else if (evt.type === 'deliverable_token') {
          // Live <deliverable_markdown> tokens from a milestone node. Append
          // into the matching in-history milestone message.
          setMessages((prev) => {
            let idx = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
              if (prev[i].role === 'milestone' && prev[i].name === evt.name && prev[i].status === 'drafting') {
                idx = i;
                break;
              }
            }
            if (idx === -1) return prev;
            const next = prev.slice();
            next[idx] = { ...next[idx], content: (next[idx].content || '') + (evt.content || '') };
            return next;
          });
        } else if (evt.type === 'milestone_drafting') {
          // Milestone node just started — flush whatever assistant text was
          // streamed so far into history as its own message, then push the
          // milestone entry. Both persist; nothing gets cleared on done.
          if (assembled) {
            const flushed = assembled;
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: flushed, time: Date.now() },
            ]);
            assembled = '';
            setStreamingText(null);
          }
          setMessages((prev) => {
            if (prev.some((m) => m.role === 'milestone' && m.name === evt.name && m.status === 'drafting')) {
              return prev;
            }
            return [
              ...prev,
              { role: 'milestone', name: evt.name, status: 'drafting', content: '', time: Date.now() },
            ];
          });
          setDrafting((prev) => {
            if (prev.has(evt.name)) return prev;
            const next = new Set(prev);
            next.add(evt.name);
            return next;
          });
        /* Streaming web-search UI (disabled) — see docs/streaming-search-results.md.
        } else if (evt.type === 'web_search_started') {
          setMilestoneWebSearch((prev) => {
            const cur = prev[evt.name] || { queries: [], sources: [] };
            if (cur.queries.includes(evt.query)) return prev;
            return {
              ...prev,
              [evt.name]: { ...cur, queries: [...cur.queries, evt.query] },
            };
          });
        } else if (evt.type === 'web_search_results') {
          setMilestoneWebSearch((prev) => {
            const cur = prev[evt.name] || { queries: [], sources: [] };
            const known = new Set(cur.sources.map((s) => s.url));
            const incoming = (evt.results || []).filter((r) => r && r.url && !known.has(r.url));
            if (incoming.length === 0) return prev;
            return {
              ...prev,
              [evt.name]: { ...cur, sources: [...cur.sources, ...incoming] },
            };
          });
        } else if (evt.type === 'web_search_grounding') {
          setMilestoneWebSearch((prev) => ({
            ...prev,
            [evt.name]: {
              queries: evt.queries || [],
              sources: (evt.sources || []).filter((s) => s && s.url),
            },
          }));
        */
        } else if (evt.type === 'done') {
          // `evt.ai_message` is `final_messages[-1].text` — i.e., ONLY the
          // most recent assistant message (Pass 2 on multi-pass turns,
          // Pass 1 on single-pass turns). Pass 1 was already pushed at
          // `milestone_drafting` on multi-pass turns, so this push is the
          // post-milestone reply. Falling back to `assembled` only if the
          // backend didn't return ai_message.
          const finalContent = (evt.ai_message || assembled || '').trim();
          if (finalContent) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: finalContent, time: Date.now() },
            ]);
          }
          // setMilestoneWebSearch({}); // streaming web-search UI disabled
          const updated = evt.updated_milestones || {};
          const pending = new Set(evt.pending_approval || []);
          const newlyAccepted = new Set(evt.newly_accepted || []);

          setMilestoneMarkdown((prev) => ({ ...prev, ...updated }));
          // pending_approval is authoritative — backend sends the full list each turn.
          setPendingApproval(pending);
          if (newlyAccepted.size > 0) {
            setAcceptedHistory((prev) => {
              const next = new Set(prev);
              for (const k of newlyAccepted) next.add(k);
              return next;
            });
          }
          // Backfill any milestone messages still 'drafting' (the webhook
          // might not have arrived for them) using the authoritative
          // updated_milestones map from the done frame.
          setMessages((prev) => {
            let changed = false;
            const next = prev.map((m) => {
              if (m.role === 'milestone' && m.status === 'drafting' && updated[m.name]) {
                changed = true;
                return { ...m, status: 'drafted', content: updated[m.name] };
              }
              return m;
            });
            return changed ? next : prev;
          });

          // Do NOT auto-open the milestone viewer — it would cover the
          // composer. User can click a milestone in the right panel to open it.
        } else if (evt.type === 'error') {
          setError(evt.message || 'Streaming error');
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message || 'Network error');
      }
    } finally {
      setStreamingText(null);
      setTyping(false);
      // Safety: if the backend ended without emitting a matching `milestone`
      // for a drafting key, don't leave the sidebar stuck on "Drafting".
      setDrafting((prev) => (prev.size ? new Set() : prev));
      // On error/abort the matching webhook may never arrive — flip any
      // milestone messages still in 'drafting' to 'drafted' so they stop
      // spinning. Whatever was streamed so far stays as their content.
      setMessages((prev) => {
        let changed = false;
        const next = prev.map((m) => {
          if (m.role === 'milestone' && m.status === 'drafting') {
            changed = true;
            return { ...m, status: 'drafted' };
          }
          return m;
        });
        return changed ? next : prev;
      });
      // setMilestoneWebSearch((prev) => (Object.keys(prev).length ? {} : prev)); // streaming web-search UI disabled
      abortRef.current = null;
    }
  }

  function handleSendText(text, file_urls) {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text, attachments: file_urls, time: Date.now() },
    ]);
    runStream({ user_message: text, file_urls });
  }

  function handleAcceptMilestones(keys) {
    if (!keys || keys.length === 0) return;
    const names = keys.map((k) => milestoneLabel(k));
    handleSendText(`Accept ${names.join(', ')}`);
  }

  function handleSubmitGapAnswers(answers) {
    const summary = gapQuestions
      .map((q, i) => {
        const picks = answers[i] || [];
        if (picks.length === 0) return `• ${q.question}\n  _(skipped)_`;
        return `• ${q.question}\n  → ${picks.join(', ')}`;
      })
      .join('\n\n');
    setMessages((prev) => [...prev, { role: 'user', content: summary, time: Date.now() }]);
    setGapQuestions([]);
    runStream({ gap_answers: answers });
  }

  const busy = typing || streamingText !== null;

  return (
    <div className="h-screen flex bg-ink-50 dark:bg-slate-950">
      <Sidebar
        foundationPercent={overallProgress}
        activeView={activeView}
        onSelectView={onSelectView}
      />

      <div className="flex-1 relative flex flex-col bg-white dark:bg-slate-900 min-w-0">
        <header className="h-14 px-8 flex items-center justify-between border-b border-ink-200 dark:border-slate-800">
          <div>
            <h1 className="text-[15px] font-semibold text-ink-900 dark:text-slate-100 leading-tight tracking-tight">
              {companyName ? `${companyName} — Foundational Knowledge Base` : 'Foundational Knowledge Base'}
            </h1>
            <p className="text-[11.5px] text-ink-500 dark:text-slate-400 leading-tight mt-0.5">
              Building your company blueprint through conversation
            </p>
          </div>
          <div className="text-[11.5px] text-ink-400 dark:text-slate-500">
            Thread <span className="font-mono text-ink-500 dark:text-slate-400">{threadId.slice(0, 8)}…</span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scroll px-6 md:px-10 py-6">
          <div className="max-w-[900px] mx-auto flex flex-col gap-5">
            {messages.map((m, i) => {
              if (m.role === 'milestone') {
                return (
                  <DraftingActivityCard
                    key={i}
                    label={milestoneLabel(m.name)}
                    status={m.status}
                    content={m.content || ''}
                  />
                );
              }
              return <ChatMessageItem key={i} message={m} />;
            })}

            {gapQuestions.length > 0 && !busy && (
              <GapQuestions
                questions={gapQuestions}
                disabled={busy}
                onSubmit={handleSubmitGapAnswers}
              />
            )}

            {streamingText !== null && (
              <ChatMessageItem
                message={{ role: 'assistant', content: streamingText, time: null }}
                streaming
              />
            )}
            {typing && streamingText === null && (
              <ChatMessageItem
                message={{ role: 'assistant', content: '', time: null }}
                streaming
              />
            )}
          </div>
        </div>

        {error && (
          <div className="mx-10 mb-3 text-[12px] text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Composer disabled={busy || gapQuestions.length > 0} onSend={handleSendText} />

        {activeMilestone && (
          <MilestoneViewer
            milestoneKey={activeMilestone}
            markdown={milestoneMarkdown[activeMilestone]}
            status={milestoneStatus[activeMilestone]}
            onClose={() => setActiveMilestone(null)}
          />
        )}
      </div>

      <MilestonesPanel
        milestoneStatus={milestoneStatus}
        milestoneMarkdown={milestoneMarkdown}
        activeKey={activeMilestone}
        onSelect={setActiveMilestone}
        onAccept={handleAcceptMilestones}
        acceptDisabled={busy || gapQuestions.length > 0}
        overallProgress={overallProgress}
      />
    </div>
  );
}
