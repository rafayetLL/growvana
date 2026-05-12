import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Sidebar from './Sidebar.jsx';
import Composer from './Composer.jsx';
import GapQuestions from './GapQuestions.jsx';
import ThreadOverridePanel from './ThreadOverridePanel.jsx';
import { ChatMessageItem } from './MessageRenderers.jsx';
import { initEmailAgent, streamEmailAgent } from '../lib/emailAgentApi.js';
import { buildWebhookRequest } from '../lib/webhookBus.js';
import {
  IconArrowLeft,
  IconSparkle,
  IconCompass,
  IconBook,
  IconMail,
  IconCheck,
} from './icons.jsx';

const TABS = [
  { id: 'strategy', label: 'Strategy', icon: IconCompass, hint: 'Plan from the CMO' },
  { id: 'content', label: 'Content', icon: IconBook, hint: 'Generated copy' },
  { id: 'design', label: 'Design', icon: IconMail, hint: 'Rendered HTML' },
];

function newTaskId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'task-' + Math.random().toString(36).slice(2, 10);
}

function substituteImageTokens(html, imagesMap) {
  if (!html) return '';
  if (!imagesMap || Object.keys(imagesMap).length === 0) return html;
  let out = html;
  for (const [token, dataUri] of Object.entries(imagesMap)) {
    out = out.split(token).join(dataUri);
  }
  return out;
}

function useSplit(initial = 460, min = 360, max = 720) {
  const [w, setW] = useState(initial);
  const draggingRef = useRef(false);
  const startRef = useRef({ x: 0, w: 0 });

  const onDown = (e) => {
    draggingRef.current = true;
    startRef.current = { x: e.clientX, w };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const next = Math.max(min, Math.min(max, startRef.current.w + dx));
      setW(next);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [min, max]);

  return [w, onDown];
}

export default function EmailAgentBuilderScreen({
  threadId,
  onBack,
  onGoToFoundations,
  onSelectView,
  overrideThreadId,
  setOverrideThreadId,
  effectiveThreadId,
  projectName,
  onNewProject,
  isActive = true,
  // PDF flow: when set, this is the response from /email-agent/init_with_pdf
  // ({ thread_id, ai_message, questions }). The screen seeds messages +
  // gapQuestions from it and SKIPS its own /email-agent/init call (the
  // email-side checkpoint is already populated, and /init's phase-1
  // lookup would 400 for this thread).
  preInitedResult = null,
  hideFoundation = false,
}) {
  const taskIdRef = useRef(newTaskId());
  const taskId = taskIdRef.current;

  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState(null);
  const [blueprintMissing, setBlueprintMissing] = useState(false);

  const [messages, setMessages] = useState([]);
  const [gapQuestions, setGapQuestions] = useState([]);
  const [streamingText, setStreamingText] = useState(null);
  const [typing, setTyping] = useState(false);
  const [turnError, setTurnError] = useState(null);

  // Latest committed generation. The done frame carries the authoritative
  // payloads — we replace the snapshot wholesale every time.
  const [latestPlan, setLatestPlan] = useState(null);
  const [latestKind, setLatestKind] = useState(null);
  const [latestSingle, setLatestSingle] = useState(null);
  const [latestSequence, setLatestSequence] = useState(null);
  const [latestImages, setLatestImages] = useState({});

  const [activeTab, setActiveTab] = useState('strategy');
  // Email image assets: [{ name, url, alt_text? }]. Mirrors the backend's
  // EmailAssetInput schema 1:1. Persisted in screen state for the lifetime
  // of this mount — refresh wipes them (intentional, no re-fetch from
  // backend). Sent on every stream turn so the LLM has the current image
  // set in mind; also used at iframe-render time to substitute
  // {{IMAGE_<name>}} tokens with their URLs.
  const [emailAssets, setEmailAssets] = useState([]);
  // Tracks which node is currently drafting this turn. Set on the first
  // `email_content_drafting` / `email_design_drafting` SSE frame and cleared
  // on `done`. The design node is a ReAct loop so the event re-fires per
  // re-entry — we dedupe by storing only the last `name` seen.
  const [draftingAgent, setDraftingAgent] = useState(null);
  const [chatW, onSplitDown] = useSplit(460, 360, 720);

  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  // Tracks the thread_id we've already kicked off init for. StrictMode
  // double-invokes effects in dev; without this guard `/email-agent/init`
  // fires twice on mount.
  const initedThreadRef = useRef(null);

  // Init when the user actually enters this view (isActive=true).
  // We can't init on mount: this screen is rendered (hidden) the moment
  // the chat stage starts, BEFORE phase-1 has drafted brand_bible /
  // buyer_personas. Firing /email-agent/init then would 400 with
  // BrandContextMissing and the stale error would stick because the
  // initedThreadRef guard prevents retries.
  //
  // Use the foundations-side `threadId` (= initResult.thread_id) — NOT
  // the override-aware `effectiveThreadId` — because the email-init
  // endpoint looks up phase-1 deliverables at `phase_1::<thread_id>`,
  // which were written under the same `initResult.thread_id` that
  // ChatScreen uses.
  useEffect(() => {
    if (!isActive) return;
    if (!threadId) return;
    if (initedThreadRef.current === threadId) return;
    initedThreadRef.current = threadId;

    // PDF flow: /email-agent/init_with_pdf has already run upstream and
    // its response is handed to us via `preInitedResult`. Skip the
    // /init API call entirely — calling it would 400 because there's
    // no phase-1 checkpoint to read brand context from.
    if (preInitedResult) {
      const intro = preInitedResult.ai_message || '';
      if (intro) {
        setMessages([{ role: 'assistant', content: intro, time: Date.now() }]);
      }
      setGapQuestions(preInitedResult.questions || []);
      return;
    }

    const thisThread = threadId;
    const stillCurrent = () => initedThreadRef.current === thisThread;
    setInitLoading(true);
    setInitError(null);
    setBlueprintMissing(false);
    initEmailAgent({ thread_id: thisThread })
      .then((res) => {
        if (!stillCurrent()) return;
        const intro = res?.ai_message || '';
        if (intro) {
          setMessages([{ role: 'assistant', content: intro, time: Date.now() }]);
        }
        setGapQuestions(res?.questions || []);
      })
      .catch((e) => {
        if (!stillCurrent()) return;
        const msg = e?.message || 'Failed to start email session';
        setInitError(msg);
        if (msg.toLowerCase().includes('blueprint')) setBlueprintMissing(true);
      })
      .finally(() => {
        if (!stillCurrent()) return;
        setInitLoading(false);
      });
  }, [threadId, isActive, preInitedResult]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, gapQuestions, streamingText, typing]);

  async function runStream({ user_message, gap_answers }) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setTurnError(null);
    setTyping(true);
    // null (not '') so the loader's `streamingText === null` gate is true
    // until the first ai_message_token lands. Empty-string would render an
    // empty assistant bubble AND hide the loader.
    setStreamingText(null);
    setDraftingAgent(null);

    const webhook_request = buildWebhookRequest({
      task_id: taskId,
      event_type: 'workflow.email_agent',
      data: { thread_id: threadId },
    });

    let assistantText = '';
    try {
      for await (const evt of streamEmailAgent({
        thread_id: threadId,
        user_message,
        gap_answers,
        email_assets: emailAssets,
        webhook_request,
        signal: controller.signal,
      })) {
        if (evt.type === 'ai_message_token') {
          assistantText += evt.content || '';
          setStreamingText(assistantText);
        } else if (
          evt.type === 'email_content_drafting' ||
          evt.type === 'email_design_drafting'
        ) {
          // Dedupe: only flip state when the active node changes. Design
          // re-fires its event on every ReAct loop re-entry; keeping the
          // setter idempotent prevents React from re-rendering needlessly
          // and keeps the loader appearing exactly once per node per turn.
          const name = evt.name || (evt.type === 'email_content_drafting' ? 'email_content' : 'email_design');
          setDraftingAgent((cur) => (cur === name ? cur : name));
        } else if (evt.type === 'done') {
          if (assistantText) {
            const text = assistantText;
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: text, time: Date.now() },
            ]);
          }
          if (evt.email_plan) {
            setLatestPlan(evt.email_plan);
            // Auto-jump to Strategy tab the first time a plan lands so the
            // user sees what just happened. Subsequent done frames don't
            // hijack focus.
            setActiveTab((cur) => (latestPlan ? cur : 'strategy'));
          }
          if (evt.generated_kind) {
            setLatestKind(evt.generated_kind);
            if (evt.generated_kind === 'single') {
              setLatestSingle(evt.single || null);
              setLatestSequence(null);
            } else if (evt.generated_kind === 'sequence') {
              setLatestSequence(evt.sequence || null);
              setLatestSingle(null);
            }
            setLatestImages(evt.generated_images || {});
          }
        } else if (evt.type === 'error') {
          const m = evt.message || 'Error';
          setTurnError(m);
          if (m.toLowerCase().includes('blueprint')) setBlueprintMissing(true);
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setTurnError(e?.message || 'Stream failed');
    } finally {
      setTyping(false);
      setStreamingText(null);
      setDraftingAgent(null);
      abortRef.current = null;
    }
  }

  function handleSendText(text) {
    setMessages((prev) => [...prev, { role: 'user', content: text, time: Date.now() }]);
    runStream({ user_message: text });
  }

  function handleSubmitGapAnswers(answers) {
    const summary = gapQuestions
      .map((q, i) => {
        const picks = answers[i] || [];
        if (picks.length === 0) return `Question: ${q.question}\nAnswers: _(skipped)_`;
        return `Question: ${q.question}\nAnswers: ${picks.join(', ')}`;
      })
      .join('\n\n');
    setMessages((prev) => [...prev, { role: 'user', content: summary, time: Date.now() }]);
    setGapQuestions([]);
    runStream({ gap_answers: answers });
  }

  const busy = typing || streamingText !== null;

  return (
    <div className="h-screen flex bg-cream-100 dark:bg-slate-950">
      <Sidebar
        projectName={projectName}
        foundationPercent={100}
        activeView="email_agent"
        onSelectView={onSelectView}
        onNewProject={onNewProject}
        hideFoundation={hideFoundation}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <BuilderHeader
          onBack={onBack}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          hasPlan={!!latestPlan}
          hasContent={!!(latestSingle || latestSequence)}
          hasHtml={hasAnyHtml(latestKind, latestSingle, latestSequence)}
        />

        <div className="flex-1 flex min-h-0">
          <div
            className="flex flex-col bg-white dark:bg-slate-900 min-w-0"
            style={{ width: chatW }}
          >
            <ChatHeader />
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto thin-scroll px-5 py-5"
            >
              <div className="flex flex-col gap-4">
                {initLoading && (
                  <InitSkeleton />
                )}

                {initError && (
                  <div className="text-[12.5px] text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-3 flex items-start justify-between gap-3">
                    <div>{initError}</div>
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

                {messages.map((m, i) => (
                  <ChatMessageItem key={i} message={m} />
                ))}

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
                {typing && !draftingAgent && (
                  <DraftingPill name="cmo_agent" />
                )}

                {draftingAgent && (
                  <DraftingPill name={draftingAgent} />
                )}
              </div>
            </div>

            {turnError && (
              <div className="mx-5 mb-3 text-[12px] text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
                {turnError}
              </div>
            )}

            <Composer
              disabled={busy || gapQuestions.length > 0 || initLoading || !!initError}
              onSend={handleSendText}
              placeholder="Tell the email agent what to build…"
              emailAssets={emailAssets}
              onUpdateEmailAssets={setEmailAssets}
            />
          </div>

          <div
            className="builder-splitter"
            onMouseDown={onSplitDown}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
          />

          <div className="flex-1 flex flex-col min-w-0 bg-parchment dark:bg-slate-950">
            <CanvasTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              hasPlan={!!latestPlan}
              hasContent={!!(latestSingle || latestSequence)}
              hasHtml={hasAnyHtml(latestKind, latestSingle, latestSequence)}
            />

            <div className="flex-1 overflow-y-auto thin-scroll">
              {activeTab === 'strategy' && (
                <StrategyCanvas plan={latestPlan} />
              )}
              {activeTab === 'content' && (
                <ContentCanvas
                  kind={latestKind}
                  single={latestSingle}
                  sequence={latestSequence}
                  plan={latestPlan}
                />
              )}
              {activeTab === 'design' && (
                <DesignCanvas
                  kind={latestKind}
                  single={latestSingle}
                  sequence={latestSequence}
                  images={latestImages}
                  emailAssets={emailAssets}
                />
              )}
            </div>

            {overrideThreadId !== undefined && (
              <div className="border-t border-botanical-line dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3">
                <ThreadOverridePanel
                  value={overrideThreadId}
                  onChange={setOverrideThreadId}
                  defaultThreadId={threadId}
                  effectiveThreadId={effectiveThreadId}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Layout pieces
// =============================================================

function BuilderHeader({ onBack, activeTab }) {
  return (
    <header className="h-14 px-6 flex items-center gap-3 border-b border-botanical-line dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] text-botanical-text2 dark:text-slate-400 hover:text-forest-900 dark:hover:text-slate-100 transition"
        >
          <IconArrowLeft width={14} height={14} /> Agents
        </button>
      )}
      {onBack && <div className="h-7 w-px bg-botanical-line dark:bg-slate-700" />}
      <div className="h-9 w-9 rounded-xl bg-moss-100 dark:bg-moss-500/15 grid place-items-center text-moss-700 dark:text-moss-400">
        <IconMail width={18} height={18} />
      </div>
      <div className="leading-tight">
        <div className="font-display text-[18px] font-semibold text-forest-900 dark:text-slate-100">
          Email Agent
        </div>
        <div className="text-[11.5px] text-botanical-text3 dark:text-slate-400">
          Brief → plan → copy → designed email · all in one thread
        </div>
      </div>
      <div className="ml-auto text-[11px] tracking-wider uppercase font-semibold text-botanical-text3 dark:text-slate-500">
        {TABS.find((t) => t.id === activeTab)?.hint}
      </div>
    </header>
  );
}

function ChatHeader() {
  return (
    <div className="h-12 px-5 flex items-center gap-2.5 border-b border-botanical-line dark:border-slate-800 shrink-0">
      <div className="h-7 w-7 rounded-full bg-moss-600 text-white grid place-items-center text-[12px] font-semibold">
        AI
      </div>
      <div className="leading-tight">
        <div className="text-[13.5px] font-semibold text-forest-900 dark:text-slate-100">
          Email Agent
        </div>
        <div className="text-[11px] text-botanical-text3 dark:text-slate-400 flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-moss-500" />
          Connected to your blueprint
        </div>
      </div>
    </div>
  );
}

function CanvasTabs({ activeTab, setActiveTab, hasPlan, hasContent, hasHtml }) {
  const availability = {
    strategy: hasPlan,
    content: hasContent,
    design: hasHtml,
  };
  return (
    <div className="h-12 px-3 flex items-center gap-1 border-b border-botanical-line dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        const ready = availability[t.id];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={[
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12.5px] transition',
              isActive
                ? 'bg-moss-100 dark:bg-moss-500/15 text-moss-700 dark:text-moss-400 font-semibold'
                : 'text-botanical-text2 dark:text-slate-400 hover:bg-cream-100 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            <Icon width={14} height={14} />
            <span>{t.label}</span>
            {ready && (
              <span
                className={[
                  'h-1.5 w-1.5 rounded-full',
                  isActive ? 'bg-moss-500' : 'bg-moss-400',
                ].join(' ')}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

const DRAFTING_LABELS = {
  cmo_agent: 'Thinking',
  email_content: 'Writing copy',
  email_design: 'Designing email',
};

function DraftingPill({ name }) {
  const label = DRAFTING_LABELS[name] || 'Drafting';
  return (
    <div className="flex gap-3 max-w-[600px] animate-pulse">
      <div className="h-7 w-7 rounded-full bg-moss-100 dark:bg-moss-500/20 grid place-items-center shrink-0 mt-0.5 text-moss-600 dark:text-moss-400">
        <IconSparkle width={14} height={14} />
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-moss-300 dark:border-moss-500/40 bg-moss-50 dark:bg-moss-500/10 text-[12.5px] text-moss-700 dark:text-moss-300">
        <span
          className="h-3 w-3 rounded-full border-2 border-moss-300 dark:border-moss-500/40 border-t-moss-600 dark:border-t-moss-400 animate-spin"
          role="status"
          aria-label="Loading"
        />
        {label}…
      </div>
    </div>
  );
}

function InitSkeleton() {
  return (
    <div className="flex gap-3 max-w-[600px]">
      <div className="h-7 w-7 rounded-full bg-moss-100 dark:bg-moss-500/20 grid place-items-center shrink-0 mt-0.5 text-moss-600 dark:text-moss-400">
        <IconSparkle width={14} height={14} />
      </div>
      <div className="flex-1 bg-white dark:bg-slate-800/60 border border-botanical-line dark:border-slate-700 rounded-2xl rounded-tl-sm p-4 shadow-card">
        <div className="text-[12px] text-botanical-text3 dark:text-slate-500 mb-2 uppercase tracking-wider font-semibold">
          Loading
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-cream-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-cream-200 dark:bg-slate-700 rounded animate-pulse w-5/6" />
          <div className="h-3 bg-cream-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
        </div>
        <div className="mt-3 text-[12px] text-botanical-text3 dark:text-slate-500">
          Pulling your blueprint and drafting campaign-brief questions…
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Strategy tab — render the email_plan
// =============================================================

function StrategyCanvas({ plan }) {
  if (!plan) {
    return (
      <CanvasEmpty
        icon={<IconCompass width={20} height={20} />}
        title="No campaign plan yet"
        body="Once the agent has enough to brief, the plan from the CMO will appear here — objective, segmentation, per-email concept, and design direction."
      />
    );
  }

  const isSequence = plan.is_sequence;
  const single = plan.single_email_plan;
  const seq = plan.sequence_email_plan;
  const segmentation = plan.segmentation_strategy || '';
  const warnings = plan.warnings || [];

  return (
    <div className="p-6 md:p-8 max-w-[820px] mx-auto">
      <div className="flex items-center gap-2 mb-3 text-[11px] tracking-wider uppercase font-semibold text-moss-700 dark:text-moss-400">
        <IconCompass width={14} height={14} /> Campaign brief
      </div>
      <h1 className="font-display text-[32px] md:text-[36px] font-semibold text-forest-900 dark:text-slate-100 leading-tight tracking-tight">
        {isSequence ? (seq?.sequence_type || 'Email sequence') : (plan.email_type || 'Email campaign')}
      </h1>
      <p className="mt-2 text-[14px] text-botanical-text2 dark:text-slate-300 leading-relaxed">
        {isSequence
          ? (seq?.objective || 'Multi-step email plan.')
          : (single?.objective || 'Single-send plan.')}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill tone="moss">{plan.email_type || 'email'}</Pill>
        <Pill tone="clay">{isSequence ? `${seq?.total_emails || (seq?.steps?.length || 0)}-step sequence` : 'Single send'}</Pill>
        {isSequence && seq?.total_duration && <Pill>{seq.total_duration}</Pill>}
      </div>

      {segmentation && (
        <SectionCard label="Segmentation strategy" icon="users">
          <Markdown>{segmentation}</Markdown>
        </SectionCard>
      )}

      {warnings.length > 0 && (
        <SectionCard label="Warnings & guardrails" icon="alert">
          <div className="flex flex-col gap-2">
            {warnings.map((w, i) => (
              <WarningRow key={i} warning={w} />
            ))}
          </div>
        </SectionCard>
      )}

      {!isSequence && single && (
        <EmailBlock
          eyebrow="Email"
          title={single.campaign_concept || 'Concept'}
          objective={single.objective}
          contentDirection={single.content_direction}
          designDirection={single.design_direction}
        />
      )}

      {isSequence && seq && (
        <>
          {seq.exit_criteria && (
            <SectionCard label="Exit criteria" icon="exit">
              <Markdown>{seq.exit_criteria}</Markdown>
            </SectionCard>
          )}
          <div className="mt-6 flex flex-col gap-4">
            {(seq.steps || []).map((step, i) => (
              <EmailBlock
                key={i}
                eyebrow={`Step ${step.step_number || i + 1} · ${step.step_email_type || 'email'}`}
                title={step.campaign_concept || `Step ${step.step_number || i + 1}`}
                objective={step.step_objective}
                trigger={step.trigger}
                delay={step.delay_from_previous}
                branch={step.branch_logic}
                contentDirection={step.content_direction}
                designDirection={step.design_direction}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmailBlock({ eyebrow, title, objective, trigger, delay, branch, contentDirection, designDirection }) {
  return (
    <div className="mt-5 rounded-2xl border border-botanical-line dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-botanical-soft dark:border-slate-800">
        <div className="text-[11px] tracking-wider uppercase font-semibold text-moss-700 dark:text-moss-400">
          {eyebrow}
        </div>
        <div className="mt-1 font-display text-[20px] font-semibold text-forest-900 dark:text-slate-100 leading-tight">
          {title}
        </div>
        {objective && (
          <div className="mt-1.5 text-[13px] text-botanical-text2 dark:text-slate-300">
            {objective}
          </div>
        )}
      </div>

      {(trigger || delay || branch) && (
        <div className="px-5 py-3 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-botanical-text2 dark:text-slate-400 bg-cream-100 dark:bg-slate-800/50 border-b border-botanical-soft dark:border-slate-800">
          {trigger && <Meta label="Trigger" value={trigger} />}
          {delay && <Meta label="Delay" value={delay} />}
          {branch && <Meta label="Branch logic" value={branch} />}
        </div>
      )}

      {contentDirection && (
        <SubSection title="Content direction">
          <DirectionList direction={contentDirection} />
        </SubSection>
      )}

      {designDirection && (
        <SubSection title="Design direction">
          <Markdown>{designDirection}</Markdown>
        </SubSection>
      )}
    </div>
  );
}

function DirectionList({ direction }) {
  const items = [
    { label: 'Subject + preview', value: direction.subject_and_preview_instructions },
    { label: 'Body', value: direction.body_instructions },
    { label: 'CTAs', value: direction.cta_instructions },
    { label: 'A/B tests', value: direction.ab_test_instructions },
  ].filter((it) => it.value);

  if (items.length === 0) {
    return <div className="text-[12.5px] text-botanical-text3 italic">No direction provided.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => (
        <div key={it.label} className="grid grid-cols-[140px_1fr] gap-3 items-start">
          <div className="text-[11px] tracking-wider uppercase font-semibold text-botanical-text3 dark:text-slate-500 pt-0.5">
            {it.label}
          </div>
          <div className="text-[13px] text-forest-700 dark:text-slate-200 leading-relaxed">
            <Markdown>{it.value}</Markdown>
          </div>
        </div>
      ))}
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div className="px-5 py-4 border-b border-botanical-soft dark:border-slate-800 last:border-b-0">
      <div className="text-[11px] tracking-wider uppercase font-semibold text-botanical-text3 dark:text-slate-500 mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function SectionCard({ label, children }) {
  return (
    <div className="mt-5 rounded-2xl border border-botanical-line dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card">
      <div className="px-5 pt-4 pb-2 text-[11px] tracking-wider uppercase font-semibold text-moss-700 dark:text-moss-400">
        {label}
      </div>
      <div className="px-5 pb-4 text-[13px] text-botanical-text2 dark:text-slate-300 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function WarningRow({ warning }) {
  // Defensive: warnings should arrive from the backend as objects
  // ({type, severity, warning_message}) via `EmailPlan.model_dump()`, but
  // accept JSON-encoded strings too in case some path stringifies them.
  let w = warning;
  if (typeof w === 'string') {
    const trimmed = w.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        w = JSON.parse(trimmed);
      } catch {
        w = { warning_message: trimmed };
      }
    } else {
      w = { warning_message: trimmed };
    }
  }
  if (!w || typeof w !== 'object') return null;

  const severity = (w.severity || w.level || 'info').toLowerCase();
  const category = w.type || w.category || '';
  const message = w.warning_message || w.message || w.detail || '';
  const tone = severity === 'high' || severity === 'critical' || severity === 'error' || severity === 'blocking'
    ? 'bg-clay-100 text-clay-700 border-clay-300'
    : severity === 'medium' || severity === 'warning' || severity === 'required'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-moss-100 text-moss-700 border-moss-200';

  if (!category && !message) return null;

  return (
    <div className={`rounded-lg border px-3 py-2 ${tone} dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200`}>
      <div className="flex items-center gap-2 mb-0.5">
        {category && (
          <span className="text-[10.5px] tracking-wider uppercase font-semibold opacity-80">
            {category.replace(/_/g, ' ')}
          </span>
        )}
        {severity && severity !== 'info' && (
          <span className="text-[10px] tracking-wider uppercase font-semibold opacity-60">
            · {severity}
          </span>
        )}
      </div>
      {message && (
        <div className="text-[12.5px] leading-snug">{message}</div>
      )}
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <div className="text-[10.5px] tracking-wider uppercase font-semibold text-botanical-text3 dark:text-slate-500">
        {label}
      </div>
      <div className="text-[13px] text-forest-900 dark:text-slate-100 font-medium leading-tight mt-0.5">
        {value}
      </div>
    </div>
  );
}

function Pill({ children, tone }) {
  const cls = tone === 'moss'
    ? 'bg-moss-100 text-moss-700 border-moss-200 dark:bg-moss-500/15 dark:text-moss-400 dark:border-moss-500/30'
    : tone === 'clay'
    ? 'bg-clay-100 text-clay-700 border-clay-300 dark:bg-clay-500/15 dark:text-clay-300 dark:border-clay-500/30'
    : 'bg-cream-200 text-forest-700 border-cream-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  return (
    <span className={`inline-flex items-center text-[11.5px] font-medium px-2.5 py-1 rounded-full border ${cls}`}>
      {children}
    </span>
  );
}

// =============================================================
// Content tab — render single / sequence
// =============================================================

function ContentCanvas({ kind, single, sequence, plan }) {
  if (!kind || (!single && !sequence)) {
    return (
      <CanvasEmpty
        icon={<IconBook width={20} height={20} />}
        title="No content yet"
        body="Subject lines, body copy, CTAs, and A/B tests will land here once the content agent runs."
      />
    );
  }

  if (kind === 'single' && single) {
    return (
      <div className="p-6 md:p-8 max-w-[820px] mx-auto">
        <div className="flex items-center gap-2 mb-3 text-[11px] tracking-wider uppercase font-semibold text-moss-700 dark:text-moss-400">
          <IconBook width={14} height={14} /> Generated content · single email
        </div>
        <h1 className="font-display text-[28px] font-semibold text-forest-900 dark:text-slate-100 leading-tight">
          {plan?.single_email_plan?.campaign_concept || 'Single email'}
        </h1>
        <SingleEmailContent email={single} />
      </div>
    );
  }

  if (kind === 'sequence' && sequence) {
    return (
      <SequenceContent
        sequence={sequence}
        plan={plan}
      />
    );
  }

  return null;
}

function SequenceContent({ sequence, plan }) {
  const flow = sequence || [];
  const [stepIdx, setStepIdx] = useState(0);
  // Clamp when the sequence length shrinks on a regen.
  const safeIdx = Math.min(stepIdx, Math.max(0, flow.length - 1));
  const activeStep = flow[safeIdx];

  const stepsPlanByNumber = Object.fromEntries(
    (plan?.sequence_email_plan?.steps || []).map((s) => [s.step_number, s])
  );
  const activePlan = activeStep ? stepsPlanByNumber[activeStep.step_number] : null;

  if (flow.length === 0) {
    return (
      <CanvasEmpty
        icon={<IconBook width={20} height={20} />}
        title="Sequence is empty"
        body="The content agent didn't return any steps."
      />
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[820px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-[11px] tracking-wider uppercase font-semibold text-moss-700 dark:text-moss-400">
          <IconBook width={14} height={14} /> Generated content · sequence
        </div>
        {flow.length > 1 && (
          <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-botanical-line dark:border-slate-700 rounded-lg p-1">
            {flow.map((step, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStepIdx(i)}
                className={[
                  'px-2.5 py-1 text-[12px] rounded-md transition',
                  safeIdx === i
                    ? 'bg-moss-600 text-white'
                    : 'text-botanical-text2 dark:text-slate-400 hover:bg-cream-100 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                Step {step.step_number || i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <h1 className="font-display text-[28px] font-semibold text-forest-900 dark:text-slate-100 leading-tight">
        {plan?.sequence_email_plan?.sequence_type || 'Email sequence'}
      </h1>

      {activeStep && (
        <div className="mt-6 rounded-2xl border border-botanical-line dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card">
          <div className="px-5 pt-4 pb-3 border-b border-botanical-soft dark:border-slate-800 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-moss-100 dark:bg-moss-500/20 text-moss-700 dark:text-moss-400 grid place-items-center text-[12.5px] font-semibold">
              {activeStep.step_number || safeIdx + 1}
            </div>
            <div className="leading-tight">
              <div className="font-display text-[18px] font-semibold text-forest-900 dark:text-slate-100">
                {activePlan?.campaign_concept || `Step ${activeStep.step_number || safeIdx + 1}`}
              </div>
              <div className="text-[12px] text-botanical-text3 dark:text-slate-400">
                {activePlan?.step_objective || ''}
              </div>
            </div>
          </div>
          <div className="px-5 py-4">
            <SingleEmailContent email={activeStep} compact />
          </div>
        </div>
      )}
    </div>
  );
}

function SingleEmailContent({ email, compact = false }) {
  return (
    <div className={compact ? 'flex flex-col gap-5' : 'mt-5 flex flex-col gap-5'}>
      {email.subject_lines && email.subject_lines.length > 0 && (
        <Block title="Subject lines">
          <div className="flex flex-col gap-2">
            {email.subject_lines.map((s, i) => (
              <SubjectVariantRow key={i} variant={s} index={i} />
            ))}
            {email.subject_line_ab_test && (
              <AbTestNote
                label="Subject A/B test"
                hypothesis={email.subject_line_ab_test.hypothesis}
                metric={email.subject_line_ab_test.success_metric}
              />
            )}
          </div>
        </Block>
      )}

      {email.body && (
        <Block title="Body">
          <div className="rounded-xl bg-cream-100 dark:bg-slate-800/50 border border-botanical-soft dark:border-slate-700 px-4 py-3 text-[13.5px] text-forest-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
            {email.body}
          </div>
        </Block>
      )}

      {email.ctas && email.ctas.length > 0 && (
        <Block title="CTAs">
          <div className="flex flex-col gap-3">
            {email.ctas.map((slot, i) => (
              <CtaSlotRow
                key={i}
                slot={slot}
                test={(email.cta_ab_tests || []).find((t) => t.slot_name === slot.name)}
              />
            ))}
          </div>
        </Block>
      )}

      {email.placeholders && email.placeholders.length > 0 && (
        <Block title="Placeholders">
          <div className="flex flex-wrap gap-1.5">
            {email.placeholders.map((p, i) => (
              <code
                key={i}
                title={p.alt_text || p.name}
                className="text-[11.5px] font-mono px-2 py-0.5 rounded-md bg-cream-200 dark:bg-slate-800 text-forest-700 dark:text-slate-300 border border-cream-300 dark:border-slate-700"
              >
                {p.token || `{{${p.name}}}`}
              </code>
            ))}
          </div>
        </Block>
      )}
    </div>
  );
}

function SubjectVariantRow({ variant, index }) {
  const label = String.fromCharCode(65 + index);
  return (
    <div className="rounded-xl border border-botanical-line dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 flex items-start gap-3">
      <div className="h-6 w-6 rounded-md bg-moss-100 dark:bg-moss-500/20 text-moss-700 dark:text-moss-400 grid place-items-center text-[11px] font-semibold shrink-0">
        {label}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium text-forest-900 dark:text-slate-100 leading-snug">
          {variant.subject}
        </div>
        {variant.preview_text && (
          <div className="text-[12px] text-botanical-text3 dark:text-slate-400 mt-0.5 truncate">
            {variant.preview_text}
          </div>
        )}
        {variant.angle && (
          <div className="mt-1.5">
            <span className="inline-flex text-[10.5px] tracking-wider uppercase font-semibold text-moss-700 dark:text-moss-400 bg-moss-100 dark:bg-moss-500/15 px-1.5 py-0.5 rounded">
              {variant.angle}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function CtaSlotRow({ slot, test }) {
  return (
    <div className="rounded-xl border border-botanical-line dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3">
      <div className="flex items-center gap-2">
        <div className="text-[12px] font-semibold text-forest-900 dark:text-slate-100 font-mono">
          {slot.name}
        </div>
        {test && (
          <span className="text-[10.5px] tracking-wider uppercase font-semibold text-clay-700 bg-clay-100 px-1.5 py-0.5 rounded dark:bg-clay-500/15 dark:text-clay-300">
            A/B test
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(slot.variants || []).map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-moss-600 text-white text-[12px] font-medium"
            title={v.placement}
          >
            {v.text}
            {v.style && (
              <span className="text-[10px] opacity-80">· {v.style}</span>
            )}
          </span>
        ))}
      </div>
      {(slot.label_token || slot.href_token) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-mono text-botanical-text3 dark:text-slate-500">
          {slot.label_token && <span>{slot.label_token}</span>}
          {slot.href_token && <span>{slot.href_token}</span>}
        </div>
      )}
      {test && (
        <AbTestNote
          label={null}
          hypothesis={test.hypothesis}
          metric={test.success_metric}
        />
      )}
    </div>
  );
}

function AbTestNote({ label, hypothesis, metric }) {
  return (
    <div className="mt-2 rounded-md bg-cream-100 dark:bg-slate-800/50 border border-botanical-soft dark:border-slate-700 px-3 py-2">
      {label && (
        <div className="text-[10.5px] tracking-wider uppercase font-semibold text-clay-700 dark:text-clay-300 mb-1">
          {label}
        </div>
      )}
      {hypothesis && (
        <div className="text-[12.5px] text-forest-700 dark:text-slate-200 leading-snug">
          <span className="font-semibold">Hypothesis: </span>{hypothesis}
        </div>
      )}
      {metric && (
        <div className="mt-1 text-[12px] text-botanical-text2 dark:text-slate-400">
          <span className="font-semibold">Success metric: </span>{metric}
        </div>
      )}
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <div className="text-[11px] tracking-wider uppercase font-semibold text-botanical-text3 dark:text-slate-500 mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

// =============================================================
// Design tab — render body_html in an iframe
// =============================================================

function hasAnyHtml(kind, single, sequence) {
  if (kind === 'single') return !!single?.email_html;
  if (kind === 'sequence') {
    return !!(sequence || []).some((s) => s.email_html);
  }
  return false;
}

function DesignCanvas({ kind, single, sequence, images, emailAssets }) {
  const [viewport, setViewport] = useState('desktop');
  const [stepIdx, setStepIdx] = useState(0);

  const hasHtml = hasAnyHtml(kind, single, sequence);

  const html = useMemo(() => {
    if (kind === 'single') return single?.email_html || '';
    if (kind === 'sequence') {
      const flow = sequence || [];
      return flow[stepIdx]?.email_html || '';
    }
    return '';
  }, [kind, single, sequence, stepIdx]);

  // Merge map for {{<name>}} substitution: backend-emitted generated_images
  // (tool output, keyed by FULL braced token) PLUS user-uploaded
  // emailAssets (keyed by user-supplied `name` verbatim — we wrap it in
  // {{ }} client-side, no `IMAGE_` or any other prefix added). User
  // uploads win conflicts; they're the ones the user can see and curate.
  const mergedImageMap = useMemo(() => {
    const out = { ...(images || {}) };
    for (const a of emailAssets || []) {
      out[`{{${a.name}}}`] = a.url;
    }
    return out;
  }, [images, emailAssets]);

  const substituted = useMemo(
    () => substituteImageTokens(html, mergedImageMap),
    [html, mergedImageMap]
  );

  if (!hasHtml) {
    return (
      <CanvasEmpty
        icon={<IconMail width={20} height={20} />}
        title="No design yet"
        body="When the design agent finishes, the fully styled HTML email will render here — desktop or mobile viewport, ready to send."
      />
    );
  }

  const flow = kind === 'sequence' ? (sequence || []) : null;

  return (
    <div className="p-6 md:p-8 flex flex-col items-center gap-4">
      <div className="w-full max-w-[820px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] tracking-wider uppercase font-semibold text-moss-700 dark:text-moss-400">
          <IconMail width={14} height={14} /> Designed email
        </div>
        <div className="flex items-center gap-3">
          {flow && flow.length > 1 && (
            <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-botanical-line dark:border-slate-700 rounded-lg p-1">
              {flow.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStepIdx(i)}
                  className={[
                    'px-2.5 py-1 text-[12px] rounded-md transition',
                    stepIdx === i
                      ? 'bg-moss-600 text-white'
                      : 'text-botanical-text2 dark:text-slate-400 hover:bg-cream-100 dark:hover:bg-slate-800',
                  ].join(' ')}
                >
                  Step {flow[i].step_number || i + 1}
                </button>
              ))}
            </div>
          )}
          <ViewportToggle viewport={viewport} setViewport={setViewport} />
        </div>
      </div>

      <div
        className="bg-white dark:bg-slate-900 border border-botanical-line dark:border-slate-700 rounded-2xl shadow-botanical overflow-hidden"
        style={{
          width: viewport === 'mobile' ? 390 : '100%',
          maxWidth: viewport === 'mobile' ? 390 : 820,
        }}
      >
        <div className="px-4 py-2 bg-cream-100 dark:bg-slate-800/60 border-b border-botanical-soft dark:border-slate-800 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-clay-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-moss-500/70" />
          <span className="ml-3 text-[11px] text-botanical-text3 dark:text-slate-500">
            {viewport === 'mobile' ? 'Mobile · 390px' : 'Desktop preview'}
          </span>
        </div>
        <iframe
          title="Designed email preview"
          srcDoc={substituted}
          sandbox="allow-same-origin"
          className="block w-full"
          style={{ height: viewport === 'mobile' ? 760 : 900, border: 0 }}
        />
      </div>

      <details className="w-full max-w-[820px] mt-2 rounded-xl border border-botanical-line dark:border-slate-700 bg-white dark:bg-slate-900">
        <summary className="cursor-pointer px-4 py-2.5 text-[12.5px] font-semibold text-forest-700 dark:text-slate-200 select-none">
          View raw HTML
        </summary>
        <pre className="px-4 py-3 max-h-[400px] overflow-auto text-[11.5px] font-mono text-forest-700 dark:text-slate-300 bg-cream-100 dark:bg-slate-800/50 border-t border-botanical-soft dark:border-slate-800 whitespace-pre-wrap break-all">
          {html}
        </pre>
      </details>
    </div>
  );
}

function ViewportToggle({ viewport, setViewport }) {
  return (
    <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-botanical-line dark:border-slate-700 rounded-lg p-1">
      <button
        type="button"
        onClick={() => setViewport('desktop')}
        className={[
          'px-2.5 py-1 text-[12px] rounded-md transition',
          viewport === 'desktop'
            ? 'bg-moss-600 text-white'
            : 'text-botanical-text2 dark:text-slate-400 hover:bg-cream-100 dark:hover:bg-slate-800',
        ].join(' ')}
      >
        Desktop
      </button>
      <button
        type="button"
        onClick={() => setViewport('mobile')}
        className={[
          'px-2.5 py-1 text-[12px] rounded-md transition',
          viewport === 'mobile'
            ? 'bg-moss-600 text-white'
            : 'text-botanical-text2 dark:text-slate-400 hover:bg-cream-100 dark:hover:bg-slate-800',
        ].join(' ')}
      >
        Mobile
      </button>
    </div>
  );
}

// =============================================================
// Shared helpers
// =============================================================

function CanvasEmpty({ icon, title, body }) {
  return (
    <div className="h-full flex items-center justify-center px-8 py-16">
      <div className="max-w-[420px] text-center">
        <div className="h-12 w-12 rounded-2xl bg-moss-100 dark:bg-moss-500/15 text-moss-700 dark:text-moss-400 grid place-items-center mx-auto">
          {icon}
        </div>
        <div className="mt-3 font-display text-[22px] font-semibold text-forest-900 dark:text-slate-100">
          {title}
        </div>
        <p className="mt-2 text-[13.5px] text-botanical-text2 dark:text-slate-400 leading-relaxed">
          {body}
        </p>
      </div>
    </div>
  );
}

function Markdown({ children }) {
  if (!children) return null;
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
