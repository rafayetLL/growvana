import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Sidebar from './Sidebar.jsx';
import Composer from './Composer.jsx';
import { ChatMessageItem } from './MessageRenderers.jsx';
import ThreadOverridePanel from './ThreadOverridePanel.jsx';
import { streamEmailAgent } from '../lib/emailAgentApi.js';
import { subscribeProgress, buildWebhookRequest } from '../lib/webhookBus.js';
import {
  IconArrowLeft,
  IconSparkle,
  IconCalendar,
  IconDownload,
  IconCheck,
} from './icons.jsx';

// Empty shells for the live email being assembled from webhook events.
// `segmentation_strategy` lives on the EmailOutput root (not on single/sequence)
// since it applies to the whole generation regardless of kind — same as
// `warnings`. It's tracked at the screen level via `liveSegmentationStrategy`
// and is a single string, not a list.
function emptySingleEmail() {
  return {
    metadata: null,
    subject_lines: [],
    body: '',
    ctas: [],
    subject_line_ab_test: null,
    cta_ab_test: null,
  };
}
function emptySequence() {
  return {
    metadata: null,
    steps: {}, // { step_number: { step_metadata, subject_lines, ctas, body, subject_line_ab_test, cta_ab_test } }
  };
}
function emptySequenceStep() {
  return {
    step_metadata: null,
    subject_lines: [],
    ctas: [],
    body: '',
    subject_line_ab_test: null,
    cta_ab_test: null,
  };
}

// The backend's `Sequence.model_dump()` returns `{ metadata, flow: [...] }`,
// while the live shells we build from streaming webhooks use
// `{ metadata, steps: { <step_number>: {...} } }`. SequenceCard and
// SequenceSummary read `sequence.steps`, so we normalize the backend
// shape to the live shape before committing the message and storing
// `latestGeneration`. Pass-through if the shape is already live.
function normalizeSequence(seq) {
  if (!seq) return null;
  if (seq.steps && typeof seq.steps === 'object' && !Array.isArray(seq.steps)) {
    return seq;
  }
  const steps = {};
  for (const step of seq.flow || []) {
    const n = step?.step_metadata?.step_number;
    if (n) steps[n] = step;
  }
  return { metadata: seq.metadata || null, steps };
}

export default function EmailAgentScreen({
  threadId,
  onBack,
  onGoToFoundations,
  onSelectView,
  overrideThreadId,
  setOverrideThreadId,
  effectiveThreadId,
}) {
  const [messages, setMessages] = useState(() => []);
  const [streamingText, setStreamingText] = useState(null);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);
  const [blueprintMissing, setBlueprintMissing] = useState(false);
  // One random task_id per EmailAgentScreen mount; reused across all
  // webhook POSTs and the matching SSE relay subscription. Decouples
  // the webhook routing key from the conversation thread.
  const taskIdRef = useRef(crypto.randomUUID());
  const taskId = taskIdRef.current;

  // Live in-progress email being assembled this turn.
  // kind: 'single' | 'sequence' | null. Cleared at start of each turn.
  const [liveKind, setLiveKind] = useState(null);
  const [liveSingle, setLiveSingle] = useState(null);
  const [liveSequence, setLiveSequence] = useState(null);
  const [liveSegmentationStrategy, setLiveSegmentationStrategy] = useState('');
  const [liveWarnings, setLiveWarnings] = useState([]);

  // Right-rail "Latest Generation" — committed snapshot of the most recent
  // generation in this session. Refreshed every time `done` lands with a
  // non-null `generated_kind`. In-session only (resets on reload).
  const [latestGeneration, setLatestGeneration] = useState(null);

  // `overrideThreadId` / `setOverrideThreadId` / `effectiveThreadId` come
  // from App.jsx so the override survives tab switches and stays in sync
  // even when this screen unmounts/remounts.

  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  // Refs mirror the live state so the `done` handler can commit a
  // synchronous snapshot — React state setters are async, so we can't
  // read the latest values directly inside the SSE loop without these.
  const liveKindRef = useRef(null);
  const liveSingleRef = useRef(null);
  const liveSequenceRef = useRef(null);
  const liveSegmentationStrategyRef = useRef('');
  const liveWarningsRef = useRef([]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingText, liveKind, liveSingle, liveSequence, typing]);

  function setLiveKindBoth(next) {
    liveKindRef.current =
      typeof next === 'function' ? next(liveKindRef.current) : next;
    setLiveKind(next);
  }
  function setLiveSingleBoth(next) {
    liveSingleRef.current =
      typeof next === 'function' ? next(liveSingleRef.current) : next;
    setLiveSingle(next);
  }
  function setLiveSequenceBoth(next) {
    liveSequenceRef.current =
      typeof next === 'function' ? next(liveSequenceRef.current) : next;
    setLiveSequence(next);
  }
  function setLiveSegmentationStrategyBoth(next) {
    liveSegmentationStrategyRef.current =
      typeof next === 'function' ? next(liveSegmentationStrategyRef.current) : next;
    setLiveSegmentationStrategy(next);
  }
  function setLiveWarningsBoth(next) {
    liveWarningsRef.current =
      typeof next === 'function' ? next(liveWarningsRef.current) : next;
    setLiveWarnings(next);
  }

  function resetLive() {
    liveKindRef.current = null;
    liveSingleRef.current = null;
    liveSequenceRef.current = null;
    liveSegmentationStrategyRef.current = '';
    liveWarningsRef.current = [];
    setLiveKind(null);
    setLiveSingle(null);
    setLiveSequence(null);
    setLiveSegmentationStrategy('');
    setLiveWarnings([]);
  }

  function applyWebhookEvent(evt) {
    const stage = evt?.stage;
    const data = evt?.data || {};
    if (!stage) return;

    // Sequence-level (no step_number)
    if (stage === 'email.sequence_metadata') {
      setLiveKindBoth('sequence');
      setLiveSequenceBoth((prev) => ({ ...(prev || emptySequence()), metadata: data.metadata }));
      return;
    }
    // Output-level — applies to the whole generation, regardless of kind.
    // Both single and sequence paths fire `email.segmentation_strategy`
    // since segmentation_strategy lives on the EmailOutput root.
    if (stage === 'email.segmentation_strategy') {
      setLiveSegmentationStrategyBoth(data.segmentation_strategy || '');
      return;
    }
    if (stage === 'email.warnings') {
      setLiveWarningsBoth(data.warnings || []);
      return;
    }

    // step_metadata is the first event for any step in a sequence; for
    // every other per-step event, `data.step_number` rides at the top
    // level of the payload.
    const step =
      stage === 'email.step_metadata'
        ? data.step_metadata?.step_number
        : data.step_number;
    if (step) {
      setLiveKindBoth('sequence');
      setLiveSequenceBoth((prev) => {
        const base = prev || emptySequence();
        const stepObj = { ...(base.steps[step] || emptySequenceStep()) };
        if (stage === 'email.step_metadata') stepObj.step_metadata = data.step_metadata;
        else if (stage === 'email.subject_lines') stepObj.subject_lines = data.subject_lines || [];
        else if (stage === 'email.ctas') stepObj.ctas = data.ctas || [];
        else if (stage === 'email.subject_line_ab_test') stepObj.subject_line_ab_test = data.subject_line_ab_test || null;
        else if (stage === 'email.cta_ab_test') stepObj.cta_ab_test = data.cta_ab_test || null;
        return { ...base, steps: { ...base.steps, [step]: stepObj } };
      });
      return;
    }

    // Single-email element (no step_number)
    setLiveKindBoth((k) => k || 'single');
    setLiveSingleBoth((prev) => {
      const base = prev || emptySingleEmail();
      if (stage === 'email.metadata') return { ...base, metadata: data.metadata };
      if (stage === 'email.subject_lines') return { ...base, subject_lines: data.subject_lines || [] };
      if (stage === 'email.ctas') return { ...base, ctas: data.ctas || [] };
      if (stage === 'email.subject_line_ab_test') return { ...base, subject_line_ab_test: data.subject_line_ab_test || null };
      if (stage === 'email.cta_ab_test') return { ...base, cta_ab_test: data.cta_ab_test || null };
      return base;
    });
  }

  async function runStream({ user_message }) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setBlueprintMissing(false);
    setTyping(true);
    setStreamingText(null);
    resetLive();

    const tid = effectiveThreadId;
    const webhook_request = buildWebhookRequest({
      task_id: taskId,
      event_type: 'workflow.email_agent',
      data: { thread_id: tid, user_message },
    });

    const sub = webhook_request
      ? subscribeProgress(taskId, applyWebhookEvent)
      : null;

    let assistantText = '';
    let bodyAccumByStep = {}; // step_number (or 0 for single) -> string

    try {
      for await (const evt of streamEmailAgent({
        thread_id: tid,
        user_message,
        webhook_request,
        signal: controller.signal,
      })) {
        if (evt.type === 'ai_message_token') {
          if (assistantText === '') setTyping(false);
          assistantText += evt.content;
          setStreamingText(assistantText);
        } else if (evt.type === 'email_generation_started') {
          // Backend signals (via StreamWriter) that this turn is producing
          // either a single email or a sequence. Initialize an empty live
          // shell so the UI shows the 'Drafting…' card immediately, before
          // any structural webhook lands.
          if (evt.kind === 'sequence') {
            setLiveKindBoth('sequence');
            setLiveSequenceBoth((prev) => prev || emptySequence());
          } else {
            setLiveKindBoth('single');
            setLiveSingleBoth((prev) => prev || emptySingleEmail());
          }
        } else if (evt.type === 'email_body_token') {
          const stepKey = evt.step_number || 0;
          bodyAccumByStep[stepKey] = (bodyAccumByStep[stepKey] || '') + evt.content;
          if (stepKey === 0) {
            setLiveKindBoth((k) => k || 'single');
            setLiveSingleBoth((prev) => ({
              ...(prev || emptySingleEmail()),
              body: bodyAccumByStep[0],
            }));
          } else {
            setLiveKindBoth('sequence');
            setLiveSequenceBoth((prev) => {
              const base = prev || emptySequence();
              const stepObj = { ...(base.steps[stepKey] || emptySequenceStep()) };
              stepObj.body = bodyAccumByStep[stepKey];
              return { ...base, steps: { ...base.steps, [stepKey]: stepObj } };
            });
          }
        } else if (evt.type === 'done') {
          if (assistantText) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: assistantText, time: Date.now() },
            ]);
          } else if (evt.ai_message) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: evt.ai_message, time: Date.now() },
            ]);
          }
          if (evt.generated_kind) {
            // Prefer the authoritative payload from the `done` frame
            // (parsed server-side from the full XML buffer); fall back to
            // the live refs if any field is missing for some reason.
            const kind = evt.generated_kind;
            const committedSingle =
              kind === 'single' ? evt.single || liveSingleRef.current : null;
            const committedSequence =
              kind === 'sequence'
                ? normalizeSequence(evt.sequence) || liveSequenceRef.current
                : null;
            const committedSegmentationStrategy =
              evt.segmentation_strategy ?? liveSegmentationStrategyRef.current ?? '';
            const committedWarnings = evt.warnings || liveWarningsRef.current || [];
            const time = Date.now();
            setMessages((prev) => [
              ...prev,
              {
                role: 'email',
                kind,
                single: committedSingle,
                sequence: committedSequence,
                segmentation_strategy: committedSegmentationStrategy,
                warnings: committedWarnings,
                time,
              },
            ]);
            setLatestGeneration({
              kind,
              single: committedSingle,
              sequence: committedSequence,
              segmentation_strategy: committedSegmentationStrategy,
              warnings: committedWarnings,
              time,
            });
            // Now that the snapshot is committed to chat history, clear
            // the live shells so the streaming "Generating" card
            // disappears.
            resetLive();
          }
          setStreamingText(null);
        } else if (evt.type === 'error') {
          setError(evt.message || 'Error');
          if ((evt.message || '').toLowerCase().includes('no blueprint')) {
            setBlueprintMissing(true);
          }
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Stream failed');
    } finally {
      setTyping(false);
      setStreamingText(null);
      sub?.close();
      abortRef.current = null;
    }
  }

  function handleSendText(text) {
    setMessages((prev) => [...prev, { role: 'user', content: text, time: Date.now() }]);
    runStream({ user_message: text });
  }

  function scrollChatToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }

  function handleRegenerate() {
    if (!latestGeneration) return;
    handleSendText(
      'Regenerate the latest email with any improvements you can make to the body, subject lines, and CTAs while keeping the same objective and target segments.'
    );
  }

  function handleStartFresh() {
    handleSendText(
      "Let's start a brand new email. Forget the previous generation — ask me what objective and segment to target."
    );
  }

  const busy = typing || streamingText !== null;

  return (
    <div className="h-screen flex bg-ink-50 dark:bg-slate-950">
      <Sidebar
        foundationPercent={0}
        activeView="execution"
        onSelectView={onSelectView}
      />

      <div className="flex-1 flex min-w-0">
        {/* Center: chat */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
          <header className="px-8 py-4 border-b border-ink-200 dark:border-slate-800 flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 dark:text-slate-400 hover:text-ink-700 dark:hover:text-slate-200 transition"
            >
              <IconArrowLeft width={14} height={14} /> Back to Agents
            </button>
            <div className="h-8 w-px bg-ink-200 dark:bg-slate-700 mx-2" />
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-500/10 grid place-items-center text-rose-500">
              <IconSparkle width={18} height={18} />
            </div>
            <div>
              <h1 className="text-[16px] font-semibold text-ink-900 dark:text-slate-100">
                Email Marketing Agent
              </h1>
              <p className="text-[12px] text-ink-500 dark:text-slate-400">
                Automated email campaigns, newsletters, and drip sequences
              </p>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scroll px-6 md:px-10 py-6">
            <div className="max-w-[900px] mx-auto flex flex-col gap-5">
              {messages.map((m, i) => {
                if (m.role === 'email') {
                  return (
                    <EmailOutputBlock
                      key={i}
                      kind={m.kind}
                      single={m.single}
                      sequence={m.sequence}
                      segmentationStrategy={m.segmentation_strategy || ''}
                      warnings={m.warnings || []}
                    />
                  );
                }
                return <ChatMessageItem key={i} message={m} />;
              })}

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

              {/* Live in-progress card (rendered while streaming, then committed to messages on `done`) */}
              {(liveKind === 'single' && liveSingle) ||
              (liveKind === 'sequence' && liveSequence) ? (
                <EmailOutputBlock
                  kind={liveKind}
                  single={liveSingle}
                  sequence={liveSequence}
                  segmentationStrategy={liveSegmentationStrategy}
                  warnings={liveWarnings}
                  streaming
                />
              ) : null}
            </div>
          </div>

          {error && (
            <div className="mx-10 mb-3 text-[12px] text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2 flex items-start justify-between gap-3">
              <div>{error}</div>
              {blueprintMissing && onGoToFoundations && (
                <button
                  type="button"
                  onClick={onGoToFoundations}
                  className="text-[12px] font-medium px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition shrink-0"
                >
                  Complete Blueprint
                </button>
              )}
            </div>
          )}

          <Composer
            disabled={busy}
            onSend={handleSendText}
            placeholder="Coordinate with your agent…"
          />
        </div>

        {/* Right rail — real, in-session state */}
        <aside className="hidden xl:flex w-[320px] shrink-0 flex-col border-l border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 overflow-y-auto thin-scroll gap-6">
          <ThreadOverridePanel
            value={overrideThreadId}
            onChange={setOverrideThreadId}
            defaultThreadId={threadId}
            effectiveThreadId={effectiveThreadId}
          />

          <LatestGenerationPanel
            generation={latestGeneration}
            onView={scrollChatToBottom}
            onRegenerate={handleRegenerate}
            onStartFresh={handleStartFresh}
            busy={busy}
          />
        </aside>
      </div>
    </div>
  );
}

function LatestGenerationPanel({ generation, onView, onRegenerate, onStartFresh, busy }) {
  const empty = !generation || (!generation.single && !generation.sequence);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-[14px] font-semibold text-ink-900 dark:text-slate-100">
          Latest Generation
        </div>
        {!empty && (
          <span className="text-[10.5px] text-ink-400 dark:text-slate-500">
            {timeAgo(generation.time)}
          </span>
        )}
      </div>

      {empty ? (
        <div className="mt-3 rounded-lg border border-dashed border-ink-200 dark:border-slate-700 px-3 py-5 text-[12.5px] text-ink-500 dark:text-slate-400 text-center">
          No emails yet — start a conversation to generate one.
        </div>
      ) : generation.kind === 'sequence' ? (
        <SequenceSummary
          sequence={generation.sequence}
          segmentationStrategy={generation.segmentation_strategy || ''}
          warnings={generation.warnings}
        />
      ) : (
        <SingleSummary
          email={generation.single}
          segmentationStrategy={generation.segmentation_strategy || ''}
          warnings={generation.warnings}
        />
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onView}
          disabled={empty}
          className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-md border border-ink-200 dark:border-slate-700 text-[13px] text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconCalendar width={14} height={14} className="text-ink-400 dark:text-slate-500" />
          View in chat
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={empty || busy}
          className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-md border border-ink-200 dark:border-slate-700 text-[13px] text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconDownload width={14} height={14} className="text-ink-400 dark:text-slate-500" />
          Regenerate
        </button>
        <button
          type="button"
          onClick={onStartFresh}
          disabled={busy}
          className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-md border border-ink-200 dark:border-slate-700 text-[13px] text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconCheck width={14} height={14} className="text-ink-400 dark:text-slate-500" />
          Start fresh
        </button>
      </div>
    </div>
  );
}

function SingleSummary({ email, segmentationStrategy, warnings }) {
  const md = email?.metadata;
  return (
    <div className="mt-3 rounded-lg border border-ink-200 dark:border-slate-700 px-3 py-3">
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Single email
      </div>
      {md?.email_type && (
        <div className="mt-1.5 text-[11px] inline-flex items-center px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300">
          {md.email_type}
        </div>
      )}
      {md?.objective && (
        <div className="mt-2 text-[12.5px] text-ink-900 dark:text-slate-100 leading-snug">
          {md.objective}
        </div>
      )}
      {segmentationStrategy && (
        <div className="mt-2 text-[11.5px] text-violet-700 dark:text-violet-300 leading-snug line-clamp-3">
          {segmentationStrategy}
        </div>
      )}
      {warnings && warnings.length > 0 && (
        <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
          {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

function SequenceSummary({ sequence, segmentationStrategy, warnings }) {
  const md = sequence?.metadata;
  const stepCount = Object.keys(sequence?.steps || {}).length;
  const total = md?.total_emails && md.total_emails > 0 ? md.total_emails : stepCount;
  return (
    <div className="mt-3 rounded-lg border border-ink-200 dark:border-slate-700 px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-violet-700 dark:text-violet-400">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          Sequence
        </div>
        <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-ink-50 dark:bg-slate-800 text-ink-500 dark:text-slate-400">
          {stepCount}/{total}
        </span>
      </div>
      {md?.sequence_type && (
        <div className="mt-1.5 text-[11px] inline-flex items-center px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300">
          {md.sequence_type}
        </div>
      )}
      {md?.objective && (
        <div className="mt-2 text-[12.5px] text-ink-900 dark:text-slate-100 leading-snug">
          {md.objective}
        </div>
      )}
      {segmentationStrategy && (
        <div className="mt-2 text-[11.5px] text-violet-700 dark:text-violet-300 leading-snug line-clamp-3">
          {segmentationStrategy}
        </div>
      )}
      {warnings && warnings.length > 0 && (
        <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
          {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SectionTitle({ children }) {
  return (
    <div className="text-[10.5px] tracking-wider uppercase text-ink-400 dark:text-slate-500 font-semibold mb-1.5">
      {children}
    </div>
  );
}

function MetadataRow({ metadata }) {
  if (!metadata) return null;
  return (
    <div className="flex flex-wrap gap-2 text-[11.5px]">
      {metadata.email_type && (
        <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300">
          {metadata.email_type}
        </span>
      )}
      {metadata.objective && (
        <span className="px-2 py-0.5 rounded bg-ink-50 dark:bg-slate-800 text-ink-700 dark:text-slate-300">
          {metadata.objective}
        </span>
      )}
    </div>
  );
}

function ConceptBlock({ concept }) {
  if (!concept) return null;
  return (
    <div>
      <SectionTitle>Concept</SectionTitle>
      <div className="rounded-md border border-ink-200 dark:border-slate-700 px-3 py-2 text-[12.5px] text-ink-700 dark:text-slate-300 leading-relaxed">
        {concept}
      </div>
    </div>
  );
}

function SubjectLines({ variants }) {
  if (!variants || variants.length === 0) return null;
  return (
    <div>
      <SectionTitle>Subject Lines ({variants.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {variants.map((v, i) => (
          <div key={i} className="rounded-md border border-ink-200 dark:border-slate-700 px-3 py-2">
            <div className="flex items-center gap-2 text-[10.5px] text-ink-400 dark:text-slate-500 uppercase tracking-wider">
              {v.angle}
            </div>
            <div className="text-[13px] font-medium text-ink-900 dark:text-slate-100 mt-0.5">{v.subject}</div>
            <div className="text-[12px] text-ink-500 dark:text-slate-400 mt-0.5">{v.preview_text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaList({ ctas }) {
  if (!ctas || ctas.length === 0) return null;
  return (
    <div>
      <SectionTitle>CTAs ({ctas.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {ctas.map((c, i) => (
          <div key={i} className="flex items-start justify-between gap-3 rounded-md border border-ink-200 dark:border-slate-700 px-3 py-2">
            <div>
              <div className="text-[13px] font-medium text-ink-900 dark:text-slate-100">{c.copy}</div>
              <div className="text-[11.5px] text-ink-500 dark:text-slate-400 mt-0.5">
                {c.placement} · {c.style}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AbTestBlock({ title, test }) {
  if (!test) return null;
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <div className="rounded-md border border-sky-200 dark:border-sky-500/40 bg-sky-50/60 dark:bg-sky-500/10 px-3 py-2 text-[12.5px] text-sky-900 dark:text-sky-200 leading-relaxed flex flex-col gap-1.5">
        {test.success_metric && (
          <div>
            <span className="text-[10.5px] uppercase tracking-wider text-sky-700/80 dark:text-sky-300/80">Success metric</span>
            <div className="font-medium">{test.success_metric}</div>
          </div>
        )}
        {test.hypothesis && (
          <div>
            <span className="text-[10.5px] uppercase tracking-wider text-sky-700/80 dark:text-sky-300/80">Hypothesis</span>
            <div>{test.hypothesis}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SegmentationStrategyBlock({ strategy }) {
  if (!strategy) return null;
  return (
    <div>
      <SectionTitle>Segmentation Strategy</SectionTitle>
      <div className="rounded-md border border-violet-200 dark:border-violet-500/40 bg-violet-50/60 dark:bg-violet-500/10 px-3 py-2 text-[12.5px] text-violet-900 dark:text-violet-200 leading-relaxed">
        {strategy}
      </div>
    </div>
  );
}

function WarningsList({ warnings }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div>
      <SectionTitle>Warnings</SectionTitle>
      <div className="flex flex-col gap-1.5">
        {warnings.map((w, i) => (
          <div
            key={i}
            className="text-[12px] rounded-md border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-2"
          >
            <span className="font-medium">{w.type}</span>
            <span className="text-amber-600 dark:text-amber-400"> · {w.severity}</span>
            <div className="mt-0.5">{w.warning_message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BodyMarkdown({ body }) {
  if (!body) return null;
  return (
    <div>
      <SectionTitle>Body</SectionTitle>
      <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-ink-200 dark:border-slate-700 px-4 py-3 bg-ink-25 dark:bg-slate-950/50">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </div>
  );
}

function CardShell({ title, badge, streaming, children }) {
  return (
    <div className="rounded-xl border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4 max-w-[760px]">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-rose-50 dark:bg-rose-500/15 grid place-items-center text-rose-500">
            <IconSparkle width={13} height={13} />
          </div>
          <div className="text-[14px] font-semibold text-ink-900 dark:text-slate-100">{title}</div>
          {badge}
        </div>
        {streaming ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400">
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-violet-500" />
            Generating
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <IconCheck width={11} height={11} /> Generated
          </span>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

// Renders one EmailOutput as: the email/sequence card, then the
// generation-level `<segmentation_strategy>` and `<warnings>` blocks as
// SIBLINGS — mirroring the XML hierarchy where these two live inside
// `<email_output>` alongside `<email>` / `<sequence>`, not nested inside
// them. Each render site (committed messages, live streaming) goes
// through this so the layout stays consistent.
function EmailOutputBlock({ kind, single, sequence, segmentationStrategy, warnings, streaming }) {
  const hasOutputDetails =
    (segmentationStrategy && segmentationStrategy.length > 0) ||
    (warnings && warnings.length > 0);
  return (
    <div className="flex flex-col gap-4 max-w-[760px]">
      {kind === 'sequence' && sequence && (
        <SequenceCard sequence={sequence} streaming={streaming} />
      )}
      {kind === 'single' && single && (
        <SingleEmailCard email={single} streaming={streaming} />
      )}
      {hasOutputDetails && (
        <div className="rounded-xl border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4 flex flex-col gap-4">
          <SegmentationStrategyBlock strategy={segmentationStrategy} />
          <WarningsList warnings={warnings} />
        </div>
      )}
    </div>
  );
}

function SingleEmailCard({ email, streaming }) {
  return (
    <CardShell title="Email" streaming={streaming}>
      <MetadataRow metadata={email.metadata} />
      <ConceptBlock concept={email.metadata?.campaign_concept} />
      <SubjectLines variants={email.subject_lines} />
      <AbTestBlock title="Subject Line A/B Test" test={email.subject_line_ab_test} />
      <BodyMarkdown body={email.body} />
      <CtaList ctas={email.ctas} />
      <AbTestBlock title="CTA A/B Test" test={email.cta_ab_test} />
    </CardShell>
  );
}

function SequenceCard({ sequence, streaming }) {
  const stepNumbers = Object.keys(sequence.steps || {})
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  const total =
    sequence.metadata?.total_emails && sequence.metadata.total_emails > 0
      ? sequence.metadata.total_emails
      : stepNumbers.length;
  const [activeStep, setActiveStep] = useState(stepNumbers[0] || 1);

  // If a new step lands and we don't have an active one yet, snap to the first.
  useEffect(() => {
    if (!stepNumbers.includes(activeStep) && stepNumbers.length > 0) {
      setActiveStep(stepNumbers[0]);
    }
  }, [stepNumbers.join(','), activeStep]);

  const activeStepObj = sequence.steps?.[activeStep];

  return (
    <CardShell
      title={
        sequence.metadata?.sequence_type
          ? `Sequence — ${sequence.metadata.sequence_type}`
          : 'Email Sequence'
      }
      badge={
        <span className="text-[10.5px] px-2 py-0.5 rounded bg-ink-50 dark:bg-slate-800 text-ink-500 dark:text-slate-400">
          {stepNumbers.length}/{total} emails
        </span>
      }
      streaming={streaming}
    >
      {sequence.metadata?.objective && (
        <div className="text-[12.5px] text-ink-600 dark:text-slate-300 italic">
          {sequence.metadata.objective}
        </div>
      )}
      {(sequence.metadata?.total_duration || sequence.metadata?.exit_criteria) && (
        <div className="flex flex-col gap-1.5 rounded-md border border-ink-200 dark:border-slate-700 px-3 py-2 text-[12px]">
          {sequence.metadata?.total_duration && (
            <div className="text-ink-500 dark:text-slate-400">
              <span className="font-medium text-ink-700 dark:text-slate-300">Duration:</span>{' '}
              {sequence.metadata.total_duration}
            </div>
          )}
          {sequence.metadata?.exit_criteria && (
            <div className="text-ink-500 dark:text-slate-400">
              <span className="font-medium text-ink-700 dark:text-slate-300">Exit criteria:</span>{' '}
              {sequence.metadata.exit_criteria}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-ink-200 dark:border-slate-700">
        <div className="flex gap-1 -mb-px overflow-x-auto thin-scroll">
          {Array.from({ length: total }).map((_, i) => {
            const n = i + 1;
            const present = stepNumbers.includes(n);
            const active = n === activeStep;
            return (
              <button
                key={n}
                type="button"
                onClick={() => present && setActiveStep(n)}
                disabled={!present}
                className={[
                  'px-3 py-2 text-[12.5px] border-b-2 transition whitespace-nowrap',
                  active
                    ? 'border-rose-500 text-rose-600 dark:text-rose-400 font-medium'
                    : present
                    ? 'border-transparent text-ink-500 dark:text-slate-400 hover:text-ink-700 dark:hover:text-slate-200 cursor-pointer'
                    : 'border-transparent text-ink-300 dark:text-slate-600 cursor-not-allowed',
                ].join(' ')}
              >
                Email {n}
                {!present && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-ink-300 dark:bg-slate-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeStepObj ? (
        <div className="flex flex-col gap-4">
          {activeStepObj.step_metadata && (
            <div className="flex flex-col gap-1.5 rounded-md border border-ink-200 dark:border-slate-700 px-3 py-2 text-[12px]">
              {activeStepObj.step_metadata.trigger && (
                <div className="text-ink-500 dark:text-slate-400">
                  <span className="font-medium text-ink-700 dark:text-slate-300">Trigger:</span>{' '}
                  {activeStepObj.step_metadata.trigger}
                </div>
              )}
              {activeStepObj.step_metadata.delay_from_previous && (
                <div className="text-ink-500 dark:text-slate-400">
                  <span className="font-medium text-ink-700 dark:text-slate-300">Delay:</span>{' '}
                  {activeStepObj.step_metadata.delay_from_previous}
                </div>
              )}
              {activeStepObj.step_metadata.branch_logic && (
                <div className="text-ink-500 dark:text-slate-400">
                  <span className="font-medium text-ink-700 dark:text-slate-300">Branch logic:</span>{' '}
                  {activeStepObj.step_metadata.branch_logic}
                </div>
              )}
            </div>
          )}
          <MetadataRow metadata={activeStepObj.step_metadata} />
          <ConceptBlock concept={activeStepObj.step_metadata?.campaign_concept} />
          <SubjectLines variants={activeStepObj.subject_lines} />
          <AbTestBlock title="Subject Line A/B Test" test={activeStepObj.subject_line_ab_test} />
          <BodyMarkdown body={activeStepObj.body} />
          <CtaList ctas={activeStepObj.ctas} />
          <AbTestBlock title="CTA A/B Test" test={activeStepObj.cta_ab_test} />
        </div>
      ) : (
        <div className="text-[12.5px] text-ink-400 dark:text-slate-500 italic">
          Email {activeStep} not yet generated…
        </div>
      )}
    </CardShell>
  );
}
