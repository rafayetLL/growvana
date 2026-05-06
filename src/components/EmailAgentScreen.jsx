import React, { useEffect, useMemo, useRef, useState } from 'react';
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
//
// `ctas` is a list of `CtaSlot` — `{ name, variants: [Cta, ...] }`. Slots
// match body_html tokens by NAME via `{{CTA_<NAME>_LABEL}}` /
// `{{CTA_<NAME>_HREF}}`. `cta_ab_tests` is a list of `CtaAbTest` keyed by
// `slot_name` (no None-padding by slot index). `placeholders` is the
// regex-extracted distinct `{{TOKEN}}` list the design node attaches to
// the body_html.
function emptySingleEmail() {
  return {
    metadata: null,
    subject_lines: [],
    body: '',
    body_html: '',
    placeholders: [],
    ctas: [],            // list of CtaSlot { name, variants }
    subject_line_ab_test: null,
    cta_ab_tests: [],    // list of CtaAbTest { slot_name, hypothesis, success_metric }
  };
}
function emptySequence() {
  return {
    metadata: null,
    steps: {}, // { step_number: emptySequenceStep() }
  };
}
function emptySequenceStep() {
  return {
    step_metadata: null,
    subject_lines: [],
    body: '',
    body_html: '',
    placeholders: [],
    ctas: [],
    subject_line_ab_test: null,
    cta_ab_tests: [],
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
  // `placeholder → data_uri` map written by the `generate_email_images`
  // tool and surfaced via the SSE `done` frame's `generated_images`
  // field. Keys are full literal `{{IMAGE_<NAME>}}` tokens (the LLM
  // commits to the same braced string in the tool call AND in body_html);
  // we substitute by direct `replaceAll` at render time — backend never
  // substitutes, frontend never concatenates.
  const [liveGeneratedImages, setLiveGeneratedImages] = useState({});

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
  const liveGeneratedImagesRef = useRef({});

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
  function setLiveGeneratedImagesBoth(next) {
    liveGeneratedImagesRef.current =
      typeof next === 'function' ? next(liveGeneratedImagesRef.current) : next;
    setLiveGeneratedImages(next);
  }

  function resetLive() {
    liveKindRef.current = null;
    liveSingleRef.current = null;
    liveSequenceRef.current = null;
    liveSegmentationStrategyRef.current = '';
    liveWarningsRef.current = [];
    liveGeneratedImagesRef.current = {};
    setLiveKind(null);
    setLiveSingle(null);
    setLiveSequence(null);
    setLiveSegmentationStrategy('');
    setLiveWarnings([]);
    setLiveGeneratedImages({});
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

    // `email.images` is a slim notification — the backend tool fires it
    // with `image_count` and `slots` ONLY (never the data URIs, which
    // are huge). We don't need to mutate any live state here; the
    // actual `slot → data_uri` map arrives via the SSE `done` frame's
    // `generated_images` field. This branch is a no-op intentionally,
    // but it stops the event from accidentally falling through into
    // the per-step / single-email element matchers below.
    if (stage === 'email.images') {
      return;
    }

    // step_metadata is the first event for any step in a sequence; for
    // every other per-step event, `data.step_number` rides at the top
    // level of the payload. `email.body_html` is intentionally NOT a
    // webhook stage — body HTML arrives via the SSE
    // `email_body_html_token` stream and the final `done` frame.
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
        else if (stage === 'email.cta_ab_tests') stepObj.cta_ab_tests = data.cta_ab_tests || [];
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
      if (stage === 'email.cta_ab_tests') return { ...base, cta_ab_tests: data.cta_ab_tests || [] };
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
        } else if (evt.type === 'email_body_html_token') {
          const stepKey = evt.step_number || 0;
          bodyAccumByStep[stepKey] = (bodyAccumByStep[stepKey] || '') + evt.content;
          if (stepKey === 0) {
            setLiveKindBoth((k) => k || 'single');
            setLiveSingleBoth((prev) => ({
              ...(prev || emptySingleEmail()),
              body_html: bodyAccumByStep[0],
            }));
          } else {
            setLiveKindBoth('sequence');
            setLiveSequenceBoth((prev) => {
              const base = prev || emptySequence();
              const stepObj = { ...(base.steps[stepKey] || emptySequenceStep()) };
              stepObj.body_html = bodyAccumByStep[stepKey];
              return { ...base, steps: { ...base.steps, [stepKey]: stepObj } };
            });
          }
        } else if (evt.type === 'done') {
          // Chat reply is fully assembled from the `ai_message_token`
          // stream emitted live during the orchestrator's pass — the
          // backend no longer echoes it on the done frame.
          if (assistantText) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: assistantText, time: Date.now() },
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
            // `generated_images` is the `placeholder → data_uri` map
            // written by the `generate_email_images` tool — keyed by full
            // literal `{{IMAGE_<NAME>}}` tokens. Empty `{}` on turns that
            // didn't generate any raster images. The frontend uses it to
            // substitute body_html placeholders at render time via direct
            // `replaceAll(token, dataUri)` — no regex build, no
            // concatenation.
            const committedGeneratedImages =
              evt.generated_images || liveGeneratedImagesRef.current || {};
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
                generated_images: committedGeneratedImages,
                time,
              },
            ]);
            setLatestGeneration({
              kind,
              single: committedSingle,
              sequence: committedSequence,
              segmentation_strategy: committedSegmentationStrategy,
              warnings: committedWarnings,
              generated_images: committedGeneratedImages,
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
                      generatedImages={m.generated_images || {}}
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
                  generatedImages={liveGeneratedImages}
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

// `ctas` is a list of CtaSlot — `{ name, variants: [Cta, ...] }`. Each
// slot's `name` (SCREAMING_SNAKE_CASE: `HERO`, `FOOTER`, `OFFER_CARD`,
// …) matches the `{{CTA_<NAME>_LABEL}}` / `{{CTA_<NAME>_HREF}}` tokens
// in body_html. `variants` lists CTAs competing in this slot's A/B
// test (or a single-element list for slots not under test). Each
// backend variant carries `{ text, placement, style }`; the frontend
// synthesizes a per-variant `href` from `ctaHrefs` (user input keyed
// by `${slot.name}:${variantIdx}`) and merges it onto the variant in
// `effectiveCtas` before passing the list down here.
function CtaList({ ctas }) {
  if (!ctas || ctas.length === 0) return null;
  const slotCount = ctas.length;
  return (
    <div>
      <SectionTitle>CTAs ({slotCount} {slotCount === 1 ? 'slot' : 'slots'})</SectionTitle>
      <div className="flex flex-col gap-3">
        {ctas.map((slot) => {
          if (!slot || typeof slot.name !== 'string') return null;
          const variants = Array.isArray(slot.variants) ? slot.variants : [];
          if (variants.length === 0) return null;
          const placement = variants[0]?.placement || slot.name;
          return (
            <div
              key={slot.name}
              className="rounded-md border border-ink-200 dark:border-slate-700 px-3 py-2"
            >
              <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wider text-ink-400 dark:text-slate-500">
                <span className="font-semibold text-ink-700 dark:text-slate-300">{slot.name}</span>
                <span className="text-ink-300 dark:text-slate-600">·</span>
                <span>{placement}</span>
                {variants.length > 1 && (
                  <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-semibold">
                    A/B · {variants.length} variants
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                {variants.map((v, varIdx) => (
                  <div
                    key={varIdx}
                    className="flex items-center justify-between gap-3 rounded-sm bg-ink-25 dark:bg-slate-950/40 px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-ink-900 dark:text-slate-100 truncate">
                        {v.text}
                      </div>
                      <div className="text-[11px] text-ink-500 dark:text-slate-400 mt-0.5">
                        {v.style}
                        {v.href ? (
                          <>
                            <span className="text-ink-300 dark:text-slate-600"> · </span>
                            <span className="text-ink-700 dark:text-slate-300 break-all">{v.href}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-ink-300 dark:text-slate-600"> · </span>
                            <span className="italic text-amber-600 dark:text-amber-400">URL not set</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Render one CTA A/B test descriptor per entry. `tests` is a list of
// `CtaAbTest` keyed by `slot_name` (only slots actually under test
// have entries — no None-padding by slot index). Each test has
// `{ slot_name, hypothesis, success_metric }`. Renders nothing when
// the list is empty.
function CtaAbTestsBlock({ tests }) {
  if (!Array.isArray(tests) || tests.length === 0) return null;
  return (
    <>
      {tests.map((test, i) => (
        <AbTestBlock
          key={test?.slot_name || i}
          title={
            tests.length > 1
              ? `CTA A/B Test — ${test?.slot_name || `Slot ${i + 1}`}`
              : 'CTA A/B Test'
          }
          test={test}
        />
      ))}
    </>
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

// Escape a value for safe injection into HTML text content.
function escapeHtmlText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Escape a value for safe injection into an HTML attribute (e.g., href).
function escapeHtmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Walk the body_html and return every UPPERCASE `{{NAME}}` token whose
// FULL braced form ISN'T already covered by the structured backend data
// (CTA `slot.label_token` / `slot.href_token`, image `generatedImages`
// keys). These remaining tokens are "system tokens" — every other
// UPPERCASE placeholder the user fills in the UI before send
// (`UNSUBSCRIBE_URL`, `COMPANY_ADDRESS`, `FIRST_NAME`, `ORDER_ID`,
// etc.). The catalog is open: the LLM picks descriptive
// SCREAMING_SNAKE_CASE names per email; we discover them from the
// rendered HTML and surface them as editable inputs.
//
// All placeholders are UPPERCASE — there is no Liquid lowercase escape
// hatch. Lowercase `{{...}}` tokens are not part of the contract and
// will not be detected here.
//
// Classification is set-membership, not regex pattern matching: we ask
// the backend's structured data "is this exact token yours?" rather
// than guessing from the token's name shape. Side benefit: orphan
// tokens (e.g. `{{CTA_GHOST_LABEL}}` written into body_html with no
// matching `<slot><name>GHOST</name>`) fall through and surface as
// fillable inputs — the user sees the misalignment instead of a silent
// literal `{{...}}` in the preview.
function detectSystemTokens(html, ctas = [], generatedImages = {}) {
  if (!html) return [];

  const knownTokens = new Set();
  for (const slot of Array.isArray(ctas) ? ctas : []) {
    if (slot?.label_token) knownTokens.add(slot.label_token);
    if (slot?.href_token) knownTokens.add(slot.href_token);
  }
  if (generatedImages && typeof generatedImages === 'object') {
    for (const token of Object.keys(generatedImages)) {
      knownTokens.add(token);
    }
  }

  const seen = new Set();
  const re = /\{\{\s*([A-Z][A-Z0-9_]*)\s*\}\}/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const fullToken = m[0];
    const name = m[1];
    if (knownTokens.has(fullToken)) continue;
    seen.add(name);
  }
  return Array.from(seen).sort();
}

// Swap the {{…}} placeholder tokens emitted by the email LLM with their
// resolved values. Strings are escaped before injection so user/LLM
// content can't break out of the surrounding HTML.
//
// All placeholders are UPPERCASE — three categories:
//
//   {{CTA_<NAME>_LABEL}}     ← chosen variant text for the CTA slot
//                              whose `name` equals NAME — looked up via
//                              `slot.label_token` (backend pre-builds
//                              the full braced string)
//   {{CTA_<NAME>_HREF}}      ← chosen variant href for that slot
//                              (defaults '#') — looked up via
//                              `slot.href_token`
//   {{IMAGE_<NAME>}}         ← data URI from `generatedImages` map (set
//                              as raw URL inside `<img src="…">`); map
//                              keys are the FULL braced token strings,
//                              so substitution is direct `replaceAll`
//                              with no name surgery. Unmatched IMAGE
//                              tokens stay literal.
//   {{<SYSTEM_TOKEN>}}       ← any other UPPERCASE {{…}} token (e.g.
//                              `UNSUBSCRIBE_URL`, `COMPANY_ADDRESS`,
//                              `FIRST_NAME`, `ORDER_ID`), looked up in
//                              `systemTokens` map. Unfilled tokens stay
//                              visible as `{{NAME}}` so the user can
//                              spot what's still missing.
//
// The preheader (inbox preview text) is NOT a body_html placeholder —
// the frontend renders it separately in the UI alongside the chosen
// subject line. There's no PREHEADER substitution here.
//
// `ctas` is a list of CtaSlot `{ name, label_token, href_token,
// variants }`. `chosenVariants` is a `slot.name → variantIndex` map
// (defaults to 0 if missing).
function swapEmailTokens(
  html,
  {
    ctas = [],
    chosenVariants = {},
    systemTokens = {},
    generatedImages = {},
  } = {}
) {
  if (!html) return '';
  let out = html;

  // CTA placeholders — backend ships `slot.label_token` /
  // `slot.href_token` as full literal strings ('{{CTA_HERO_LABEL}}',
  // '{{CTA_HERO_HREF}}'), so we never have to concatenate
  // `CTA_${name}_<suffix>` ourselves. Substitute by direct `replaceAll`
  // against the chosen variant's text + user-typed href.
  (Array.isArray(ctas) ? ctas : []).forEach((slot) => {
    if (!slot || typeof slot.name !== 'string') return;
    const variants = Array.isArray(slot.variants) ? slot.variants : [];
    if (variants.length === 0) return;
    const idx = chosenVariants[slot.name];
    const variant = variants[Number.isInteger(idx) ? idx : 0] || variants[0];
    const label = variant?.text || '';
    const href = variant?.href || '#';
    if (slot.label_token) {
      out = out.replaceAll(slot.label_token, escapeHtmlText(label));
    }
    if (slot.href_token) {
      out = out.replaceAll(slot.href_token, escapeHtmlAttr(href));
    }
  });

  // IMAGE placeholders — substitute data URIs from the placeholder map
  // written by the `generate_email_images` tool. Keys are full literal
  // `{{IMAGE_<NAME>}}` tokens (the LLM commits to one braced string and
  // uses it identically in body_html + the tool call); we substitute by
  // direct `replaceAll`, no regex build, no name surgery. Unmatched
  // placeholders stay literal so the user sees what's missing.
  if (generatedImages && typeof generatedImages === 'object') {
    for (const [token, dataUri] of Object.entries(generatedImages)) {
      if (!token || !dataUri) continue;
      out = out.replaceAll(token, escapeHtmlAttr(dataUri));
    }
  }

  // System tokens — escape with the attr-safe escaper since the same
  // token may appear in either an `href="…"` context or a text-content
  // context and the attr escaper is a strict superset of the text one.
  if (systemTokens && typeof systemTokens === 'object') {
    for (const [name, value] of Object.entries(systemTokens)) {
      if (!value) continue;
      if (!/^[A-Z][A-Z0-9_]*$/.test(name)) continue;
      const re = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g');
      out = out.replace(re, escapeHtmlAttr(value));
    }
  }
  return out;
}

// Sandboxed iframe preview of one rendered email body. The body_html
// emitted by the LLM is a self-contained HTML fragment with inline
// styles only; we wrap it in a minimal iframe shell and swap tokens
// for this card's variant. The iframe auto-resizes to its content
// height on every srcdoc change.
function EmailPreview({ html, tokens }) {
  const iframeRef = useRef(null);
  const [height, setHeight] = useState(320);
  const swapped = useMemo(() => swapEmailTokens(html, tokens), [html, tokens]);

  // `<base target="_blank">` makes every <a> in the rendered email open
  // in a new tab instead of navigating the iframe itself, so a click on
  // a CTA / footer link doesn't replace the preview with the linked
  // page. The sandbox needs `allow-popups` (and
  // `allow-popups-to-escape-sandbox` so the new tab is a normal,
  // non-sandboxed page).
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html,body{margin:0;padding:0;background:#FFFFFF;}body{font-family:Inter,system-ui,sans-serif;color:#111827;}a{color:inherit;}</style></head><body>${swapped}</body></html>`;

  function onLoad() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    setHeight(doc.body.scrollHeight + 16);
    // Belt-and-suspenders: even with `<base target="_blank">` set, some
    // links in the LLM-generated HTML may declare an explicit
    // `target="_self"` (or none in older clients). Force every link to
    // open in a new tab and add rel attributes for security.
    const links = doc.querySelectorAll('a[href]');
    links.forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  }

  return (
    <iframe
      ref={iframeRef}
      title="Email preview"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      onLoad={onLoad}
      style={{
        width: '100%',
        height,
        border: 0,
        background: '#FFFFFF',
        display: 'block',
      }}
    />
  );
}

// Open-message chrome — mimics what an email looks like AFTER the
// reader clicks into it (Gmail / Outlook reading pane), not what shows
// in the inbox list. Big subject heading, sender row with avatar
// initial + name + address, "to me" recipient line, and a relative
// timestamp. Preview text is intentionally NOT rendered here — it only
// appears in inbox lists, not when an email is open.
function EmailPreviewChrome({ subject, senderName = 'Brand Marketing', senderEmail = 'hello@brand.com' }) {
  const initial = (senderName || 'B').trim().charAt(0).toUpperCase() || 'B';
  return (
    <div className="px-5 pt-5 pb-4 border-b border-slate-200 bg-white">
      <div className="text-[20px] font-normal text-slate-900 leading-snug mb-4 break-words">
        {subject || 'Untitled subject'}
      </div>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 grid place-items-center text-[14px] font-semibold shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 text-[13px] flex-wrap">
            <span className="font-semibold text-slate-900">{senderName}</span>
            <span className="text-slate-500 truncate">&lt;{senderEmail}&gt;</span>
          </div>
          <div className="text-[12px] text-slate-500 mt-0.5">to me</div>
        </div>
        <div className="text-[12px] text-slate-500 shrink-0 whitespace-nowrap">just now</div>
      </div>
    </div>
  );
}

// Carousel that shows one variant card at a time with prev/next arrows
// and a dot indicator. Cards translate horizontally; only the active
// card occupies the visible viewport. Used for both subject-variant
// and CTA-variant preview decks so a single, well-known interaction
// pattern handles both.
function EmailVariantCarousel({ items, renderCard }) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  useEffect(() => {
    if (index >= count) setIndex(Math.max(0, count - 1));
  }, [count, index]);

  if (count === 0) return null;

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(count - 1, i + 1));

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((item, i) => (
            <div key={i} className="w-full shrink-0">
              {renderCard(item, i)}
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            aria-label="Previous variant"
            className="absolute top-1/2 -translate-y-1/2 -left-3 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:bg-slate-50 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            disabled={index === count - 1}
            aria-label="Next variant"
            className="absolute top-1/2 -translate-y-1/2 -right-3 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:bg-slate-50 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ›
          </button>
          <div className="flex justify-center items-center gap-1.5 mt-3">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to variant ${i + 1}`}
                className={[
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-5 bg-slate-700' : 'w-1.5 bg-slate-300 hover:bg-slate-400',
                ].join(' ')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Truncate strings for compact display in <select> option labels.
function truncateLabel(s, n = 50) {
  const str = String(s ?? '');
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

// Test-combination builder + carousel.
//
// The user composes A/B test combinations themselves: pick one subject
// variant + one variant per CTA slot, click "Add to deck", and that
// combination renders as a card in the carousel. The deck is seeded
// with one default combination (subject 0 + variant 0 of each slot) so
// the preview is never empty.
//
// A combination is `{ subjectIdx: number, ctaVariants: { [slotName]: number } }`.
// `ctaVariants` is keyed by slot.name (NOT slot index) so combos stay
// stable when slots are reordered or renamed across regens.
function EmailDesignSection({ bodyHtml, subjectLines, ctas, systemTokens, generatedImages }) {
  const ctasArr = Array.isArray(ctas) ? ctas : [];
  const subjects = Array.isArray(subjectLines) ? subjectLines : [];
  const slotNames = ctasArr.map((slot) => slot?.name).filter(Boolean);
  const subjectCount = subjects.length;

  function defaultCtaVariants() {
    const map = {};
    for (const name of slotNames) map[name] = 0;
    return map;
  }

  // Default = first subject + first variant of each slot. Used both as
  // the deck seed and the builder reset target whenever the upstream
  // data shape changes (a new generation lands).
  const defaultCombo = useMemo(
    () => ({ subjectIdx: 0, ctaVariants: defaultCtaVariants() }),
    // Re-seed only when the set of slot names changes — variant counts
    // inside a slot don't invalidate the existing default 0-index pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slotNames.join('|')]
  );

  const [combos, setCombos] = useState(() => [defaultCombo]);
  const [draftSubjectIdx, setDraftSubjectIdx] = useState(0);
  const [draftCtaVariants, setDraftCtaVariants] = useState(() => defaultCtaVariants());

  // When upstream data reshapes (new generation, slot set change),
  // reset the deck and the builder so stale combinations don't dangle
  // referencing dropped slots/subjects.
  useEffect(() => {
    const seed = defaultCtaVariants();
    setCombos([{ subjectIdx: 0, ctaVariants: { ...seed } }]);
    setDraftSubjectIdx(0);
    setDraftCtaVariants({ ...seed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotNames.join('|'), subjectCount]);

  if (!bodyHtml) return null;

  function setDraftCtaAt(slotName, variantIdx) {
    setDraftCtaVariants((prev) => ({ ...prev, [slotName]: variantIdx }));
  }

  function combosEqual(a, b) {
    if (a.subjectIdx !== b.subjectIdx) return false;
    const ak = Object.keys(a.ctaVariants || {});
    const bk = Object.keys(b.ctaVariants || {});
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if ((a.ctaVariants?.[k] ?? 0) !== (b.ctaVariants?.[k] ?? 0)) return false;
    }
    return true;
  }

  function addCombo() {
    const next = {
      subjectIdx: draftSubjectIdx,
      ctaVariants: { ...draftCtaVariants },
    };
    if (combos.some((c) => combosEqual(c, next))) return;
    setCombos((prev) => [...prev, next]);
  }

  function removeCombo(idx) {
    setCombos((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  const senderNameFromTokens =
    (systemTokens && (systemTokens.COMPANY_NAME || systemTokens.SENDER_NAME)) || undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Builder */}
      <div>
        <SectionTitle>Build test combination</SectionTitle>
        <div className="rounded-md border border-ink-200 dark:border-slate-700 bg-ink-25 dark:bg-slate-950/40 px-3 py-3 flex flex-col gap-3">
          {subjectCount > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] uppercase tracking-wider text-ink-400 dark:text-slate-500 font-semibold">
                Subject line
              </span>
              <select
                value={draftSubjectIdx}
                onChange={(e) => setDraftSubjectIdx(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 rounded-md border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12.5px] text-ink-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
              >
                {subjects.map((s, i) => (
                  <option key={i} value={i}>
                    Subject {i + 1}
                    {s.angle ? ` — ${s.angle}` : ''}
                    {s.subject ? ` — ${truncateLabel(s.subject, 50)}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {ctasArr.map((slot) => {
            if (!slot || typeof slot.name !== 'string') return null;
            const variants = Array.isArray(slot.variants) ? slot.variants : [];
            if (variants.length === 0) return null;
            const placement = variants[0]?.placement || slot.name;
            return (
              <label key={slot.name} className="flex flex-col gap-1">
                <span className="text-[10.5px] uppercase tracking-wider text-ink-400 dark:text-slate-500 font-semibold">
                  CTA · {slot.name}
                  <span className="normal-case tracking-normal text-ink-400 dark:text-slate-500"> · {placement}</span>
                </span>
                <select
                  value={draftCtaVariants[slot.name] ?? 0}
                  onChange={(e) => setDraftCtaAt(slot.name, parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 rounded-md border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12.5px] text-ink-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                >
                  {variants.map((v, vi) => (
                    <option key={vi} value={vi}>
                      Variant {vi + 1}
                      {v?.text ? ` — ${truncateLabel(v.text, 50)}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}

          <button
            type="button"
            onClick={addCombo}
            className="self-start mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-500 text-white text-[12.5px] font-medium hover:bg-rose-600 transition"
          >
            + Add to test deck
          </button>
        </div>
      </div>

      {/* Carousel of built combinations */}
      <div>
        <SectionTitle>
          Test deck ({combos.length} {combos.length === 1 ? 'combination' : 'combinations'})
        </SectionTitle>
        <EmailVariantCarousel
          items={combos}
          renderCard={(combo, comboIdx) => {
            const subject = subjects[combo.subjectIdx] || subjects[0] || {};
            return (
              <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm mx-1">
                {combos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCombo(comboIdx)}
                    aria-label="Remove combination"
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white border border-slate-200 shadow text-slate-600 hover:text-rose-600 hover:border-rose-300 grid place-items-center text-[14px] leading-none transition"
                  >
                    ×
                  </button>
                )}
                <EmailPreviewChrome
                  subject={subject.subject}
                  senderName={senderNameFromTokens}
                />
                <EmailPreview
                  html={bodyHtml}
                  tokens={{
                    ctas: ctasArr,
                    chosenVariants: combo.ctaVariants,
                    systemTokens,
                    generatedImages,
                  }}
                />
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>Subject {combo.subjectIdx + 1}</span>
                  {slotNames.map((name) => (
                    <span key={name}>
                      {name} · V{(combo.ctaVariants?.[name] ?? 0) + 1}
                    </span>
                  ))}
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}

// Editor for the per-email link slots that don't come pre-filled by the
// LLM. Two groups:
//   1. CTA URLs — one input PER VARIANT (a slot's A/B variants can
//      legitimately point at different destinations, e.g. comparing a
//      product page against a customer-stories page; the editor mirrors
//      that flexibility instead of forcing a single shared URL). Inputs
//      are keyed by slot.name to stay stable across regens.
//   2. System tokens — every UPPERCASE `{{NAME}}` token in `body_html`
//      outside the well-known CTA_<NAME>_LABEL / CTA_<NAME>_HREF /
//      IMAGE_<NAME> vocabulary. The catalog is open (the LLM picks
//      descriptive names per email), so we discover them dynamically
//      from the rendered HTML and surface one input per token. All
//      placeholders are UPPERCASE — there is no lowercase Liquid escape
//      hatch; the user fills every system token in the UI before send.
function EmailLinksEditor({
  ctas,
  ctaHrefs,
  onCtaHrefChange,
  detectedTokens,
  systemTokens,
  onSystemTokenChange,
}) {
  const slotCount = Array.isArray(ctas) ? ctas.length : 0;
  const tokenCount = Array.isArray(detectedTokens) ? detectedTokens.length : 0;
  if (slotCount === 0 && tokenCount === 0) return null;

  return (
    <div>
      <SectionTitle>Links to fill</SectionTitle>
      <div className="rounded-md border border-ink-200 dark:border-slate-700 bg-ink-25 dark:bg-slate-950/40 px-3 py-3 flex flex-col gap-4">
        {slotCount > 0 && (
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-ink-400 dark:text-slate-500 font-semibold mb-2">
              CTA URLs · one per variant
            </div>
            <div className="flex flex-col gap-3">
              {ctas.map((slot) => {
                if (!slot || typeof slot.name !== 'string') return null;
                const variants = Array.isArray(slot.variants) ? slot.variants : [];
                if (variants.length === 0) return null;
                const placement = variants[0]?.placement || slot.name;
                return (
                  <div key={slot.name} className="flex flex-col gap-2">
                    <div className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-slate-400 flex items-center gap-2">
                      <span className="font-semibold text-ink-700 dark:text-slate-300">{slot.name}</span>
                      <span className="text-ink-300 dark:text-slate-600">·</span>
                      <span className="normal-case tracking-normal">{placement}</span>
                      {variants.length > 1 && (
                        <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-semibold">
                          A/B · {variants.length} variants
                        </span>
                      )}
                    </div>
                    {variants.map((variant, vi) => {
                      const key = `${slot.name}:${vi}`;
                      const value = ctaHrefs?.[key] ?? '';
                      const labelPreview = variant?.text || '';
                      return (
                        <label key={vi} className="flex flex-col gap-1 pl-2 border-l-2 border-ink-200 dark:border-slate-700">
                          <span className="text-[11.5px] text-ink-700 dark:text-slate-300">
                            Variant {vi + 1}
                            {labelPreview && (
                              <span className="text-ink-400 dark:text-slate-500"> · "{labelPreview}"</span>
                            )}
                          </span>
                          <input
                            type="url"
                            placeholder="https://example.com/landing"
                            value={value}
                            onChange={(e) => onCtaHrefChange(slot.name, vi, e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-md border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12.5px] text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                          />
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tokenCount > 0 && (
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-ink-400 dark:text-slate-500 font-semibold mb-2">
              System tokens · footer / boilerplate
            </div>
            <div className="flex flex-col gap-2">
              {detectedTokens.map((name) => {
                const isUrl = /_URL$/.test(name);
                return (
                  <label key={name} className="flex flex-col gap-1">
                    <span className="text-[11.5px] font-mono text-ink-700 dark:text-slate-300">
                      {`{{${name}}}`}
                    </span>
                    <input
                      type={isUrl ? 'url' : 'text'}
                      placeholder={isUrl ? 'https://…' : 'value'}
                      value={systemTokens?.[name] ?? ''}
                      onChange={(e) => onSystemTokenChange(name, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12.5px] text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Wraps everything that depends on user-supplied link state for one
// email body: the CTA list (so it shows the live href), the CTA A/B
// tests block, the URL/system-token editor, and the rendered preview
// carousels. Local state is kept here so it's scoped to this email
// instance — different emails on the same screen don't share their
// link inputs.
//
// `ctaHrefs` keys are composite `"${slotName}:${variantIdx}"` strings
// so each variant's URL is independently editable (A/B variants in the
// same slot can legitimately point at different destinations) AND keys
// stay stable across regens (slot positions can shift but slot.name
// doesn't).
function EditableEmailBody({ bodyHtml, subjectLines, ctas, ctaAbTests, generatedImages }) {
  const [ctaHrefs, setCtaHrefs] = useState({});
  const [systemTokens, setSystemTokens] = useState({});

  const ctasArr = Array.isArray(ctas) ? ctas : [];

  // Project per-variant user-entered hrefs into the ctas tree so
  // CtaList renders the live URL and swapEmailTokens substitutes the
  // chosen variant's href into the iframe preview.
  const effectiveCtas = useMemo(
    () =>
      ctasArr.map((slot) => {
        if (!slot || typeof slot.name !== 'string') return slot;
        const variants = Array.isArray(slot.variants) ? slot.variants : [];
        return {
          ...slot,
          variants: variants.map((v, vi) => {
            const userHref = ctaHrefs[`${slot.name}:${vi}`];
            return {
              ...v,
              href: userHref && userHref.length > 0 ? userHref : null,
            };
          }),
        };
      }),
    [ctasArr, ctaHrefs]
  );

  const detectedTokens = useMemo(
    () => detectSystemTokens(bodyHtml || '', ctasArr, generatedImages),
    [bodyHtml, ctasArr, generatedImages]
  );

  return (
    <>
      <CtaList ctas={effectiveCtas} />
      <CtaAbTestsBlock tests={ctaAbTests} />
      <EmailLinksEditor
        ctas={effectiveCtas}
        ctaHrefs={ctaHrefs}
        onCtaHrefChange={(slotName, variant, href) =>
          setCtaHrefs((prev) => ({ ...prev, [`${slotName}:${variant}`]: href }))
        }
        detectedTokens={detectedTokens}
        systemTokens={systemTokens}
        onSystemTokenChange={(name, value) =>
          setSystemTokens((prev) => ({ ...prev, [name]: value }))
        }
      />
      <EmailDesignSection
        bodyHtml={bodyHtml}
        subjectLines={subjectLines}
        ctas={effectiveCtas}
        systemTokens={systemTokens}
        generatedImages={generatedImages}
      />
    </>
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
function EmailOutputBlock({
  kind,
  single,
  sequence,
  segmentationStrategy,
  warnings,
  generatedImages,
  streaming,
}) {
  const hasOutputDetails =
    (segmentationStrategy && segmentationStrategy.length > 0) ||
    (warnings && warnings.length > 0);
  return (
    <div className="flex flex-col gap-4 max-w-[760px]">
      {kind === 'sequence' && sequence && (
        <SequenceCard
          sequence={sequence}
          generatedImages={generatedImages}
          streaming={streaming}
        />
      )}
      {kind === 'single' && single && (
        <SingleEmailCard
          email={single}
          generatedImages={generatedImages}
          streaming={streaming}
        />
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

function SingleEmailCard({ email, generatedImages, streaming }) {
  return (
    <CardShell title="Email" streaming={streaming}>
      <MetadataRow metadata={email.metadata} />
      <ConceptBlock concept={email.metadata?.campaign_concept} />
      <SubjectLines variants={email.subject_lines} />
      <AbTestBlock title="Subject Line A/B Test" test={email.subject_line_ab_test} />
      <EditableEmailBody
        bodyHtml={email.body_html}
        subjectLines={email.subject_lines}
        ctas={email.ctas}
        ctaAbTests={email.cta_ab_tests}
        generatedImages={generatedImages}
      />
    </CardShell>
  );
}

function SequenceCard({ sequence, generatedImages, streaming }) {
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
          {/* `key` resets the editor's local link state when switching
              steps so URLs typed for step 1 don't bleed into step 2. */}
          <EditableEmailBody
            key={activeStep}
            bodyHtml={activeStepObj.body_html}
            subjectLines={activeStepObj.subject_lines}
            ctas={activeStepObj.ctas}
            ctaAbTests={activeStepObj.cta_ab_tests}
            generatedImages={generatedImages}
          />
        </div>
      ) : (
        <div className="text-[12.5px] text-ink-400 dark:text-slate-500 italic">
          Email {activeStep} not yet generated…
        </div>
      )}
    </CardShell>
  );
}
