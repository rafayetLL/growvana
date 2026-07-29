import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Sidebar from './Sidebar.jsx';
import Composer from './Composer.jsx';
import GapQuestions from './GapQuestions.jsx';
import { ChatMessageItem } from './MessageRenderers.jsx';
import { initPdpAgent, initPdpAgentWithPdf, streamPdpAgent } from '../lib/pdpAgentApi.js';
import { buildWebhookRequest, subscribeProgress } from '../lib/webhookBus.js';
import {
  IconArrowLeft,
  IconCompass,
  IconCheck,
  IconLink,
  IconPlus,
  IconX,
} from './icons.jsx';

// Matches the Meta Ad workbench shell — same face, same navy/mint accents, so the
// two agent screens read as one product.
const UI_FONT = { fontFamily: "'Inter', system-ui, sans-serif" };

// Prefixed so a thread id is recognisable in a log or a checkpoint row.
function newId(prefix) {
  const unique =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${unique}`;
}

// Private copy, as in the Email and Meta Ad builder screens — each owns its own
// splitter rather than sharing one, and the CSS (.builder-splitter) is shared.
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
      setW(Math.max(min, Math.min(max, startRef.current.w + dx)));
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

// The four audit areas, in the backend roster's order, each with the question it
// answers. The area key IS the state field name, the webhook stage suffix and the
// key inside every payload — one vocabulary end to end. An area the backend adds
// before this list does still renders: the report unions whatever keys arrive.
//
// The labels are the backend's `AUDIT_AREA_LABELS` verbatim, NOT derived from the
// key. Two of the four are initialisms and no underscore-swap survives them —
// `humanize('seo')` gives "Seo", which is the whole reason that map exists.
const AUDIT_AREAS = [
  { key: 'seo', label: 'SEO', question: 'Will search surface this page' },
  { key: 'aeo', label: 'AEO', question: 'Will an answer engine understand, trust and cite it' },
  { key: 'images', label: 'Images', question: 'Do the product images do their job' },
  { key: 'layout', label: 'Layout', question: 'Does the order of the page hook a buyer and build toward the sale' },
];
const AREA_BY_KEY = Object.fromEntries(AUDIT_AREAS.map((a) => [a.key, a]));

// The fixed specialist arc. The Auditor and the Strategist are built; Scout and
// Studio are graph stubs the CMO declines to route to, so their tabs say so rather
// than pretending.
const SPECIALISTS = [
  { key: 'auditor', label: 'Auditor', blurb: 'Audits how your product is presented, area by area.' },
  { key: 'scout', label: 'Scout', blurb: 'Reads the pages you are actually losing to.' },
  { key: 'strategist', label: 'Strategist', blurb: 'Turns the audit into what your page should say and show.' },
  { key: 'studio', label: 'Studio', blurb: 'Builds the page and the shots it needs.' },
];
const LIVE_SPECIALISTS = new Set(['auditor', 'scout', 'strategist']);

// Keys that live INSIDE the audit payload but are not audit areas: `html` is the
// whole audit rendered as one document. Without this, the report would treat it as
// a fifth area and try to render a 30KB string as findings.
//
// `image` — the rasterized PNG the CMO and Strategist look at — never reaches the
// wire at all; the backend strips it. It is listed anyway so that a backend that
// ever stopped stripping it degrades to "ignored" rather than "rendered raw".
const AUDIT_META_KEYS = new Set(['html', 'image']);

// Only two, and that is the whole set the backend accepts. The platform decides
// how the page is READ — Amazon structurally through its listing fields,
// everything else as a full-page picture — so a third option would ask the founder
// to make a choice that changes nothing downstream.
const PLATFORMS = [
  { key: 'amazon', label: 'Amazon' },
  { key: 'other', label: 'Somewhere else' },
];

const PLATFORM_LABELS = Object.fromEntries(PLATFORMS.map((p) => [p.key, p.label]));

// ---------------------------------------------------------------------------
// The one audit reducer. A `pdp.audit.<area>` webhook's `data` and the SSE `done`
// frame's `audit` are the SAME value shape — an object keyed by area name — so
// both fold in here (the shape contract the backend holds deliberately).
//
// Two rules, both load-bearing:
//   - a null/absent `audit` on `done` means UNCHANGED, never cleared;
//   - a null FIELD means that area has not been audited, so it must not overwrite
//     an area that already landed. Merging per key is what makes re-running one
//     area leave the other three exactly as they were, mirroring the backend's own
//     per-field reducer on state.
//
// It also carries `html` — the whole audit as one rendered document — which folds
// in by the same rule and needs no special case here. Only the READERS have to
// know it is not an area (see AUDIT_META_KEYS).
// ---------------------------------------------------------------------------
function mergeAudit(prev, incoming) {
  if (!incoming || typeof incoming !== 'object') return prev;
  const next = { ...(prev || {}) };
  for (const [area, value] of Object.entries(incoming)) {
    if (value != null) next[area] = value;
  }
  return next;
}

// Every area present in the audit, in roster order, with anything unrecognised
// appended — so an area shipped by the backend ahead of this file still shows up.
function areaKeys(audit) {
  const known = AUDIT_AREAS.map((a) => a.key);
  const extra = Object.keys(audit || {}).filter(
    (k) => !known.includes(k) && !AUDIT_META_KEYS.has(k),
  );
  return [...known, ...extra];
}

const humanize = (key) =>
  String(key).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const areaLabel = (key) => AREA_BY_KEY[key]?.label || humanize(key);

const isHttpUrl = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);

// Whether a value reads as a chip rather than as prose. Every `verdict` across the
// four schemas is now FREE TEXT — a one-line sentence, not a Literal — so nothing
// in an area's own output matches this. It survives only for the generic fallback
// reader, which renders an area the backend shipped ahead of this file.
const isVerdict = (s) => typeof s === 'string' && /^[a-z]+(_[a-z]+)+$/.test(s);

// RETIRED with the markdown switch (2026-07-29). It mirrored the backend's
// `alignment_summary`, counting `is_aligned` rows off `metrics` / `blocks`. SEO,
// AEO and Layout are markdown documents now and carry no rows at all, so there is
// nothing left to count — and inventing a denominator from the one area that still
// has rows would be a number nothing has to defend.

const TONE_CLASS = {
  good: 'text-positive bg-mint-100 dark:bg-mint-500/15 border-mint-400/60',
  warn: 'text-gold bg-gold/10 dark:bg-gold/20 border-gold/40',
  bad: 'text-danger bg-danger/5 dark:bg-danger/15 border-danger/40',
  neutral: 'text-navy-600 dark:text-slate-300 bg-navy-50 dark:bg-slate-800 border-navy-100 dark:border-slate-600',
};

const isBlank = (v) => v == null || v === '';

export default function PdpAgentScreen({
  // The Foundation (phase-1) thread whose checkpoint supplies brand context. It
  // only pre-fills the setup form: a founder can paste a different one, or upload
  // a Blueprint PDF instead. Absent when no project session backs this screen, and
  // then the founder supplies one or the other themselves.
  foundationThreadId,
  onBack,
  onSelectView,
  projectName,
  onNewProject,
  // Standalone entry (picked from the campaign chooser): hide the Foundations /
  // Execution sidebar tabs, since no project session backs them. It changes the
  // sidebar and nothing else — brand context is required either way, and the
  // setup form is what enforces that.
  hideFoundation = false,
}) {
  const taskId = useRef(newId('task')).current;
  // This screen owns the PDP thread. One thread covers exactly ONE product and
  // init inputs are immutable, so it must never be the Foundation thread id —
  // that one is reused across the other agents and re-initializing is refused.
  const productThreadId = useRef(newId('pdp')).current;

  const [phase, setPhase] = useState('setup'); // 'setup' | 'ready'
  const [path, setPath] = useState('page_scrape'); // 'page_scrape' | 'raw_input'
  const [platform, setPlatform] = useState('amazon');
  const [productUrl, setProductUrl] = useState('');
  const [productText, setProductText] = useState('');
  const [imageUrls, setImageUrls] = useState(['']);
  // Brand context, one of two ways. Pre-filled from the open project when there is
  // one; blank in the standalone entry, where the founder pastes a Foundation
  // thread of their own or uploads a Blueprint PDF instead.
  const [foundationId, setFoundationId] = useState(foundationThreadId || '');
  const [pdfFile, setPdfFile] = useState(null);
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState(null);
  // Map<stage, {message, failed}> from the intake webhooks, so a slow scrape shows
  // what it is doing instead of a blank spinner.
  const [intake, setIntake] = useState({});

  // What was actually captured — shown back before any audit runs, so a founder
  // can tell the tool read the right page.
  const [capture, setCapture] = useState(null);
  // The `scrape_completed` webhook's payload — the product URL, the page's image
  // URLs, and whether a screenshot was taken. Held apart from `capture` because it
  // arrives on a different channel and may never arrive at all: the PDF entry
  // carries no webhook config, and the raw input path never scrapes anything.
  const [scrape, setScrape] = useState(null);

  // The gap questions init came back with. Cleared the moment they are submitted,
  // which is what takes the card out of the chat and unblocks the composer.
  const [gapQuestions, setGapQuestions] = useState([]);
  // The same questions with the answers given, kept for the Product tab. Separate
  // from `gapQuestions` precisely because that one is emptied on submit — a founder
  // must still be able to see what they were asked and what they said.
  const [gapAnswered, setGapAnswered] = useState([]);

  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState(null);
  const [typing, setTyping] = useState(false);
  const [turnError, setTurnError] = useState(null);
  const [researching, setResearching] = useState(false);
  const [activity, setActivity] = useState([]);
  const pushActivity = (text) => {
    if (text) setActivity((prev) => (prev[prev.length - 1] === text ? prev : [...prev, text].slice(-40)));
  };

  const [audit, setAudit] = useState(null);
  // The strategy is ONE document rewritten whole, so it replaces rather than
  // merges — the opposite of the audit, whose areas land independently and must
  // fold per key. `{markdown, html}`; `html` can lag the markdown by exactly one
  // failed render, which is why both are kept.
  const [strategy, setStrategy] = useState(null);
  // The competitor field. Replaced whole on every Scout run, like the strategy and
  // unlike the audit: a run maps the field as it stands today, and half of one run
  // merged into half of another would describe a field that never existed.
  // `{analysis, html, queries, product_count}` — no `image`, because the Scout
  // reaches the models as text and the page is built server-side in Python.
  const [scout, setScout] = useState(null);
  // Opens on the Auditor — the first specialist in the arc, and now the first tab.
  const [canvasSel, setCanvasSel] = useState('auditor'); // a specialist key
  // Set the moment the founder touches the canvas. The areas land one at a time
  // and far apart, so the first one of a turn is welcome to take the canvas, but
  // every one after it would be yanking the page out from under whatever the
  // founder chose to read. Reset at the start of each turn.
  //
  // With the areas consolidated into one report there is nothing to select WITHIN
  // the audit any more — a later area simply appends to the report the founder is
  // already reading, so only the tab switch can steal the page.
  const canvasTouchedRef = useRef(false);
  function pickCanvas(key) {
    canvasTouchedRef.current = true;
    setCanvasSel(key);
  }

  const [chatW, onSplitDown] = useSplit(460, 360, 720);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  const busy = typing || streamingText !== null;
  const auditedAreas = areaKeys(audit).filter((k) => audit?.[k]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingText, activity, researching]);

  const cleanedImageUrls = imageUrls.map((s) => s.trim()).filter(Boolean);

  function validateSetup() {
    // Brand context is required — the audit speaks in the brand's voice and
    // positioning, and there is no useful audit without it.
    if (!pdfFile && !foundationId.trim()) {
      return 'The audit needs your brand: connect the project that built your Company Blueprint, or upload your Blueprint PDF.';
    }
    if (path === 'page_scrape') {
      if (!isHttpUrl(productUrl.trim())) {
        return 'Paste the link to the product page you want audited — it needs to start with http:// or https://.';
      }
      return null;
    }
    if (!productText.trim()) {
      return 'Describe your product in your own words so it can be audited.';
    }
    if (cleanedImageUrls.some((u) => !isHttpUrl(u))) {
      return 'One of your image links is not a web address — each one needs to start with http:// or https://.';
    }
    return null;
  }

  // The backend phrases its own errors for a founder, with one exception: the
  // thread-exists guard is worded for a developer. Say what it means here.
  function friendlyInitError(message) {
    if (!message) return "We couldn't get your product set up. Try again in a moment.";
    if (/already exists/i.test(message)) {
      return 'A product has already been set up on this thread, and a thread covers exactly one product. Start a new project to audit a different one.';
    }
    return message;
  }

  async function handleStart() {
    const problem = validateSetup();
    if (problem) {
      setInitError(problem);
      return;
    }
    setInitLoading(true);
    setInitError(null);
    setIntake({});

    // Open the subscription BEFORE init so no stage is missed — the scrape runs
    // inside the request and fires as it goes. The PDF entry is multipart and
    // carries no webhook config, so it has no stages to watch.
    const webhook_request = pdfFile
      ? null
      : buildWebhookRequest({
          task_id: taskId,
          event_type: 'workflow.pdp_agent',
          data: { thread_id: productThreadId },
        });
    const sub = webhook_request
      ? subscribeProgress(taskId, (evt) => {
          const stage = evt?.stage;
          if (!stage || !stage.startsWith('pdp.intake.')) return;
          setIntake((prev) => ({
            ...prev,
            [stage]: {
              message: evt.success_message || evt.error_message || '',
              failed: evt.status !== 'success',
            },
          }));
          // What was actually READ only ever arrives here. The init response is
          // deliberately minimal — thread, path, platform, opener, questions — so
          // the product URL, the image list and whether a screenshot exists reach
          // this screen through `scrape_completed`'s payload or not at all.
          if (stage === 'pdp.intake.scrape_completed' && evt.data) setScrape(evt.data);
        })
      : null;

    const common = {
      thread_id: productThreadId,
      path,
      // Belt and braces with the picker being hidden on this path: describing an
      // unpublished product is always 'other', since the platform only decides how a
      // LIVE page is read and there is no page here. Pinned at the request boundary
      // so no future edit to the form can put `amazon` on a raw-input thread.
      platform: path === 'raw_input' ? 'other' : platform,
      product_url: path === 'page_scrape' ? productUrl.trim() : undefined,
      product_text: path === 'raw_input' ? productText.trim() : undefined,
      image_urls: path === 'raw_input' && cleanedImageUrls.length ? cleanedImageUrls : undefined,
    };

    try {
      // A Blueprint PDF wins when both are supplied — the founder chose it over
      // whatever the connected project holds.
      const res = pdfFile
        ? await initPdpAgentWithPdf({ ...common, pdfFile })
        : await initPdpAgent({ ...common, foundation_thread_id: foundationId.trim(), webhook_request });
      setCapture(res);
      setMessages(
        res.ai_message ? [{ role: 'assistant', content: res.ai_message, time: Date.now() }] : []
      );
      // Empty when the gap analysis call failed — init still succeeded and the
      // audit still runs, so this is a quiet degradation rather than an error.
      setGapQuestions(res.questions || []);
      setCanvasSel('auditor');
      setPhase('ready');
    } catch (e) {
      setInitError(friendlyInitError(e?.message));
    } finally {
      setInitLoading(false);
      // Closed as soon as init returns, which can beat the terminal
      // `thread_ready` stage — that one is fired fire-and-forget just before the
      // response. Nothing is lost: its payload IS the response body we already
      // have, and by then this progress panel has been replaced by the canvas.
      sub?.close();
    }
  }

  async function runStream({ user_message, gap_answers, attachment_urls }) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setTurnError(null);
    setTyping(true);
    setStreamingText(null);
    setResearching(false);
    setActivity([]);
    canvasTouchedRef.current = false;

    const webhook_request = buildWebhookRequest({
      task_id: taskId,
      event_type: 'workflow.pdp_agent',
      data: { thread_id: productThreadId },
    });
    let sub = null;
    if (webhook_request) {
      sub = subscribeProgress(taskId, (evt) => {
        if (evt.status !== 'success' || !evt.data) return;
        const { stage, data } = evt;
        // Every webhook carries a founder-facing `success_message` — it drives the
        // activity feed so each research call landing is visible as it happens.
        if (evt.success_message) pushActivity(evt.success_message);
        // The Scout lands whole and has ONE stage, so it needs no reducer — its
        // `data.scout` IS the `done` frame's `scout` value, and a later run
        // replaces it rather than merging into it.
        if (stage === 'pdp.scout.report') {
          if (data.scout) {
            setScout(data.scout);
            if (!canvasTouchedRef.current) setCanvasSel('scout');
          }
          return;
        }
        // `pdp.audit.tool_call` is progress only; its message already fed the feed.
        if (!stage || !stage.startsWith('pdp.audit.') || stage === 'pdp.audit.tool_call') return;
        // Everything else in that family is ONE finished area, and its `data` is a
        // partial of the `done` frame's `audit` — same reducer, no special-casing
        // per area, so a seventh needs nothing here.
        setAudit((prev) => mergeAudit(prev, data));
        // There is nothing to select WITHIN the audit — it is one report — so a
        // landing area only ever decides which TAB is showing. (This used to also
        // call `setAreaSel`, which was removed with the per-area chips and left a
        // dangling reference that threw on every area webhook.)
        if (!canvasTouchedRef.current) setCanvasSel('auditor');
      });
    }

    // The CMO's message and the closing recap are ONE assistant turn — they arrive
    // as the same frame type and are concatenated into a single bubble.
    let assistantText = '';
    // A turn that errors out yields no `done` frame, so whatever had already
    // streamed would vanish along with the live bubble. Commit it either way —
    // half an answer plus the error beats the error alone.
    let committed = false;
    try {
      for await (const ev of streamPdpAgent({
        thread_id: productThreadId,
        user_message,
        gap_answers,
        attachment_urls,
        webhook_request,
        signal: controller.signal,
      })) {
        if (ev.type === 'ai_message_token') {
          assistantText += ev.content || '';
          setStreamingText(assistantText);
        } else if (ev.type === 'auditor_researching') {
          // Fires once per turn, not once per ReAct loop pass.
          setResearching(true);
          pushActivity('Auditing your product page…');
        } else if (ev.type === 'scout_researching') {
          // Once per turn. The slowest step by far — it searches the category,
          // then reads each winning page — so the activity line says so rather
          // than leaving a founder wondering whether the turn stalled.
          setResearching(true);
          pushActivity('Mapping the competitor field — this one takes a few minutes…');
        } else if (ev.type === 'strategist_working') {
          // Also once per turn. The Strategist is a single call with no loop, so
          // there is no second pass this could fire on.
          setResearching(true);
          pushActivity('Writing your page strategy…');
        } else if (ev.type === 'done') {
          if (assistantText) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: assistantText, time: Date.now() },
            ]);
            committed = true;
          }
          // Authoritative, and it carries every area researched so far — so a
          // missed area webhook is backfilled here. A null audit means NOTHING
          // MOVED this turn; keep what is already on the canvas.
          if (ev.audit) {
            setAudit((prev) => mergeAudit(prev, ev.audit));
            if (!canvasTouchedRef.current) setCanvasSel('auditor');
          }
          // Same rule, one artifact: null means the strategy did not move this
          // turn, so keep what is on the canvas. When it DID move it arrives
          // whole — there is no partial strategy to merge.
          //
          // The competitor field, same rule again: null means it did not move.
          // Handled BEFORE the strategy so that when a turn ran both, the
          // strategy still wins the canvas — the arc order decides, and the
          // strategy is the later step and the one the founder acts on.
          if (ev.scout) {
            setScout(ev.scout);
            if (!canvasTouchedRef.current) setCanvasSel('scout');
          }
          // It wins the canvas over the audit when both landed, because it is the
          // later step in the arc and the one the founder acts on.
          if (ev.strategy) {
            setStrategy(ev.strategy);
            if (!canvasTouchedRef.current) setCanvasSel('strategist');
          }
        } else if (ev.type === 'error') {
          setTurnError(ev.message || 'Something went wrong and this reply did not finish.');
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setTurnError(e?.message || 'That reply did not finish. Send your message again.');
      }
    } finally {
      if (assistantText && !committed) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: assistantText, time: Date.now() },
        ]);
      }
      setTyping(false);
      setStreamingText(null);
      setResearching(false);
      abortRef.current = null;
      sub?.close();
    }
  }

  // Answers are POSITIONAL — index i belongs to question i — so the payload is sent
  // whole, empty inner lists and all. An all-empty submission is a founder skipping
  // every question, which the backend accepts and audits anyway.
  function handleSubmitGapAnswers(answers) {
    const summary = gapQuestions
      .map((q, i) => {
        const picks = answers[i] || [];
        return picks.length ? `${q.question} → ${picks.join(', ')}` : null;
      })
      .filter(Boolean)
      .join('\n');
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: summary || 'Skipped the questions for now.',
        time: Date.now(),
      },
    ]);
    // Kept for the Product tab before the card is cleared out of the chat.
    setGapAnswered(
      gapQuestions.map((q, i) => ({ ...q, answers: (answers[i] || []).length ? answers[i] : null }))
    );
    setGapQuestions([]);
    runStream({ gap_answers: answers });
  }

  function handleSendText(text, attachment_urls) {
    const t = (text || '').trim();
    if (!t) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: t, attachments: attachment_urls, time: Date.now() },
    ]);
    runStream({ user_message: t, attachment_urls });
  }

  return (
    <div className="h-screen flex bg-canvas dark:bg-slate-950" style={UI_FONT}>
      <Sidebar
        projectName={projectName}
        foundationPercent={100}
        activeView="pdp_agent"
        onSelectView={onSelectView}
        onNewProject={onNewProject}
        hideFoundation={hideFoundation}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onBack={onBack}
          phase={phase}
          platform={platform}
          researching={researching}
          landed={{
            auditor: auditedAreas.length > 0,
            scout: Boolean(scout?.html),
            strategist: Boolean(strategy?.markdown),
          }}
          current={canvasSel}
        />

        {phase === 'setup' ? (
          <SetupView
            path={path}
            setPath={setPath}
            platform={platform}
            setPlatform={setPlatform}
            productUrl={productUrl}
            setProductUrl={setProductUrl}
            productText={productText}
            setProductText={setProductText}
            imageUrls={imageUrls}
            setImageUrls={setImageUrls}
            foundationId={foundationId}
            setFoundationId={setFoundationId}
            hasProjectFoundation={!!foundationThreadId}
            pdfFile={pdfFile}
            setPdfFile={setPdfFile}
            initLoading={initLoading}
            initError={initError}
            intake={intake}
            onStart={handleStart}
          />
        ) : (
          <div className="flex-1 flex min-h-0">
            {chatCollapsed ? (
              <CollapsedRail label="Conversation" onExpand={() => setChatCollapsed(false)} />
            ) : (
              <div
                className="flex flex-col bg-white dark:bg-slate-900 min-w-0"
                style={{ width: chatW }}
              >
                <PanelBar label="Conversation" onCollapse={() => setChatCollapsed(true)} />

                <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scroll px-5 py-5">
                  <div className="flex flex-col gap-4">
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

                    {busy &&
                      (activity.length > 0 ? (
                        <ActivityFeed items={activity} />
                      ) : (
                        <DraftingPill label={researching ? 'Researching your page' : 'Thinking'} />
                      ))}
                  </div>
                </div>

                {turnError && (
                  <div className="mx-5 mb-3 text-[12px] text-danger bg-danger/5 border border-danger/30 rounded-lg px-3 py-2">
                    {turnError}
                  </div>
                )}

                {/* The questions are answered THROUGH the card, not typed — its
                    submit button is what sends the turn, and a founder who wants
                    to skip them submits it blank. Same lock the Meta Ad screen
                    holds while its own gap card is open. */}
                <Composer
                  disabled={busy || gapQuestions.length > 0}
                  onSend={handleSendText}
                  placeholder={
                    gapQuestions.length > 0
                      ? 'Answer or skip the questions above to carry on…'
                      : 'Ask for the audit, or ask what to fix first…'
                  }
                />
              </div>
            )}

            {!chatCollapsed && (
              <div
                className="builder-splitter"
                onMouseDown={onSplitDown}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize chat panel"
              />
            )}

            <div className="flex-1 flex flex-col min-w-0 bg-canvas dark:bg-slate-950">
              <Canvas
                audit={audit}
                strategy={strategy}
                scout={scout}
                canvasSel={canvasSel}
                onPickCanvas={pickCanvas}
                researching={researching}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================
// Header — navy topbar + the four-specialist arc
// =============================================================

function Header({ onBack, phase, platform, researching, landed, current }) {
  return (
    <header className="h-16 px-6 flex items-center gap-4 bg-navy-900 text-white shrink-0">
      {onBack && (
        <>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[13px] text-navy-200 hover:text-white transition"
          >
            <IconArrowLeft width={14} height={14} /> Agents
          </button>
          <div className="h-7 w-px bg-white/15" />
        </>
      )}
      <div className="h-9 w-9 rounded-xl bg-mint-500 grid place-items-center text-navy-900 shrink-0">
        <IconCompass width={18} height={18} />
      </div>
      <div className="leading-tight">
        <div className="font-display text-[18px] font-semibold text-white">PDP Agent</div>
        <div className="text-[11.5px] text-navy-200">
          Find what stands between your product page and a winning one
        </div>
      </div>

      <div className="ml-auto">
        {phase === 'setup' ? (
          <span className="text-[11px] tracking-wider uppercase font-semibold text-navy-400">
            {PLATFORM_LABELS[platform]} · one product per thread
          </span>
        ) : (
          <ArcStepper researching={researching} landed={landed} current={current} />
        )}
      </div>
    </header>
  );
}

// The arc is fixed — Auditor → Scout → Strategist → Studio — and only the first is
// built. The rest stay visibly ahead so the founder can see where this is going.
// `landed` is per-specialist, not one flag. With two live specialists a single
// `hasAudit` would tick the Strategist the moment the AUDIT came back, telling the
// founder a plan exists when none had been written.
function ArcStepper({ researching, landed, current }) {
  return (
    <div className="flex items-center">
      {SPECIALISTS.map(({ key, label }, i) => {
        const live = LIVE_SPECIALISTS.has(key);
        const drafting = live && researching;
        const done = live && Boolean(landed?.[key]) && !researching;
        const isCurrent = current === key && (done || drafting);
        const lit = done || drafting;
        return (
          <React.Fragment key={key}>
            {i > 0 && (
              <span className={['h-px w-5 mx-1.5', lit ? 'bg-mint-500' : 'bg-white/15'].join(' ')} />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={[
                  'h-6 w-6 rounded-full grid place-items-center text-[11px] font-semibold transition',
                  drafting
                    ? 'bg-meta-600 text-white'
                    : done
                      ? 'bg-mint-500 text-navy-900'
                      : 'bg-white/10 text-navy-400',
                  isCurrent && !drafting ? 'ring-2 ring-meta-500 ring-offset-2 ring-offset-navy-900' : '',
                ].join(' ')}
              >
                {drafting ? (
                  <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : done ? (
                  <IconCheck width={12} height={12} />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={[
                  'text-[11.5px] font-medium hidden xl:block',
                  lit || isCurrent ? 'text-white' : 'text-navy-400',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// =============================================================
// Setup — entry path, platform, brand context, the product itself
// =============================================================

function SetupView({
  path, setPath, platform, setPlatform,
  productUrl, setProductUrl, productText, setProductText,
  imageUrls, setImageUrls,
  foundationId, setFoundationId, hasProjectFoundation, pdfFile, setPdfFile,
  initLoading, initError, intake, onStart,
}) {
  function updateImageAt(i, val) {
    setImageUrls((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }
  function removeImageAt(i) {
    setImageUrls((prev) => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i)));
  }

  return (
    <div className="flex-1 overflow-y-auto thin-scroll bg-canvas dark:bg-slate-950">
      <div className="max-w-[760px] mx-auto px-6 py-10">
        <div className="font-display text-[27px] font-semibold text-navy-900 dark:text-slate-100">
          Let's look at your product page
        </div>
        <p className="mt-1.5 text-[14px] text-navy-600 dark:text-slate-400 leading-relaxed">
          Paste a live listing and I'll read it, or describe the product if it isn't published yet.
          Either way I audit it against your brand and the rules your platform actually enforces.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PathCard
            active={path === 'page_scrape'}
            onClick={() => setPath('page_scrape')}
            title="Paste a product URL"
            body="I read the live listing — its text and its whole image stack — so you don't retype a product you've already published."
          />
          <PathCard
            active={path === 'raw_input'}
            onClick={() => {
              setPath('raw_input');
              // Describing an unpublished product is ALWAYS 'other'. The platform's
              // only job is to decide how a live page is read — Amazon structurally,
              // everything else as a capture — and on this path there is no page to
              // read. Forced here rather than only hidden below, so switching away
              // from Amazon can never leave `amazon` behind on the request.
              setPlatform('other');
            }}
            title="Describe the product"
            body="Nothing published yet? Tell me about it in your own words and add any image links. The audit tells you what your listing will need."
          />
        </div>

        {/* Asked only when there is a live page, for the same reason. */}
        {path === 'page_scrape' && (
          <Card title="Where does it sell?" hint="This changes what the audit checks, not just how findings are labelled.">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPlatform(key)}
                  className={[
                    'px-3.5 py-2 rounded-lg border text-[13px] font-medium transition',
                    platform === key
                      ? 'border-meta-600 bg-meta-50 dark:bg-meta-500/10 text-meta-700 dark:text-meta-500 ring-2 ring-meta-100 dark:ring-meta-500/20'
                      : 'border-navy-100 dark:border-slate-600 bg-white dark:bg-slate-800 text-navy-700 dark:text-slate-200 hover:border-meta-500',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
            {platform === 'other' && (
              <div className="mt-2 text-[11.5px] text-navy-600 dark:text-slate-400">
                No platform rules are recorded for other storefronts, so the audit judges the page on
                its merits rather than inventing requirements.
              </div>
            )}
          </Card>
        )}

        <Card
          title="Your product"
          hint="This is fixed once we start — a different product, or a different set of images, means a new audit."
        >
          {path === 'page_scrape' ? (
            <Field label="Product page URL">
              <div className="flex items-center gap-2 border border-navy-100 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-800 focus-within:border-meta-600 focus-within:ring-2 focus-within:ring-meta-100 dark:focus-within:ring-meta-500/20 transition">
                <IconLink className="text-navy-400 dark:text-slate-500 shrink-0" width={15} height={15} />
                <input
                  type="url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://www.amazon.com/dp/…"
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-navy-900 dark:text-slate-100 placeholder:text-navy-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="mt-1.5 text-[11.5px] text-navy-600 dark:text-slate-500">
                The page has to open in a browser without signing in.
              </div>
            </Field>
          ) : (
            <>
              <Field label="Describe your product">
                <textarea
                  rows={5}
                  value={productText}
                  onChange={(e) => setProductText(e.target.value)}
                  placeholder="What it is, who it's for, what it's made of, what it costs, what's in the box…"
                  className="w-full resize-y bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-600 rounded-lg px-3 py-2.5 text-[13.5px] leading-relaxed text-navy-900 dark:text-slate-100 placeholder:text-navy-400 dark:placeholder:text-slate-500 outline-none focus:border-meta-600 focus:ring-2 focus:ring-meta-100 dark:focus:ring-meta-500/20 transition"
                />
              </Field>
              <div className="mt-4">
                <Field label="Image links (optional)">
                  <div className="flex flex-col gap-2">
                    {imageUrls.map((val, i) => (
                      <div
                        key={i}
                        className="group flex items-center gap-2 border border-navy-100 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus-within:border-meta-600 transition"
                      >
                        <IconLink className="text-navy-400 dark:text-slate-500 shrink-0" width={14} height={14} />
                        <input
                          type="url"
                          value={val}
                          onChange={(e) => updateImageAt(i, e.target.value)}
                          placeholder={`https://…/product-photo-${i + 1}.jpg`}
                          className="flex-1 bg-transparent outline-none text-[13px] text-navy-900 dark:text-slate-100 placeholder:text-navy-400 dark:placeholder:text-slate-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeImageAt(i)}
                          aria-label="Remove image link"
                          className="opacity-0 group-hover:opacity-100 text-navy-400 hover:text-navy-700 dark:text-slate-500 dark:hover:text-slate-200 transition"
                        >
                          <IconX width={13} height={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrls((prev) => [...prev, ''])}
                    className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-meta-600 dark:text-meta-500 hover:text-meta-700 transition"
                  >
                    <IconPlus width={13} height={13} /> Add another image
                  </button>
                  <div className="mt-1.5 text-[11.5px] text-navy-600 dark:text-slate-500">
                    No photos yet is fine — the audit then tells you which shots you need.
                  </div>
                </Field>
              </div>
            </>
          )}
        </Card>

        <Card
          title="Brand context"
          hint="The audit speaks in your brand's voice and positioning, so it needs your Company Blueprint — from the project that built it, or from a PDF. Pick either one."
        >
          <Field
            label={
              hasProjectFoundation
                ? 'Company Blueprint project (connected)'
                : 'Company Blueprint project ID'
            }
          >
            <input
              type="text"
              value={foundationId}
              onChange={(e) => setFoundationId(e.target.value)}
              disabled={!!pdfFile}
              placeholder="Paste the ID of the project that built your blueprint"
              className="w-full font-mono bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-600 rounded-lg px-3 py-2 text-[12.5px] text-navy-900 dark:text-slate-100 placeholder:font-sans placeholder:text-navy-400 dark:placeholder:text-slate-500 outline-none focus:border-meta-600 focus:ring-2 focus:ring-meta-100 dark:focus:ring-meta-500/20 transition disabled:opacity-50"
            />
          </Field>

          <div className="my-3 flex items-center gap-3 text-[11px] uppercase tracking-wider text-navy-400 dark:text-slate-500">
            <span className="h-px flex-1 bg-navy-100 dark:bg-slate-700" />
            or
            <span className="h-px flex-1 bg-navy-100 dark:bg-slate-700" />
          </div>

          <Field label="Company Blueprint PDF">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="w-full text-[12.5px] text-navy-700 dark:text-slate-200 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-meta-600 file:text-white file:text-[12.5px] file:cursor-pointer hover:file:bg-meta-700"
            />
            {pdfFile && (
              <div className="mt-1.5 text-[11.5px] text-navy-600 dark:text-slate-400">
                Using <span className="font-medium">{pdfFile.name}</span> for brand context, in place
                of any connected project. Reading your page can't report live progress on this route
                — it just takes a moment.
              </div>
            )}
          </Field>
        </Card>

        {initError && (
          <div className="mt-5 text-[12.5px] text-danger bg-danger/5 border border-danger/30 rounded-lg px-3 py-2">
            {initError}
          </div>
        )}

        {initLoading && <IntakeProgress path={path} intake={intake} withWebhooks={!pdfFile} />}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={initLoading}
            onClick={onStart}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-meta-600 hover:bg-meta-700 text-white text-[13px] font-medium shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {initLoading
              ? path === 'page_scrape'
                ? 'Reading your page…'
                : 'Getting set up…'
              : 'Start the audit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Reading a live listing is slow enough that a blank spinner reads as a hang. The
// intake webhooks say what is happening; without a webhook receiver configured (or
// on the PDF route, which carries none) this still names the step rather than
// showing nothing.
function IntakeProgress({ path, intake, withWebhooks }) {
  const started = !!intake['pdp.intake.scrape_started'];
  const scraped = intake['pdp.intake.scrape_completed'];
  const asking = intake['pdp.intake.gap_questions_started'];
  const ready = !!intake['pdp.intake.thread_ready'];
  // The gap analysis has no completed stage of its own — `thread_ready` follows it
  // immediately and carries the questions it produced, so that IS its completion.
  const steps = [
    ...(path === 'page_scrape'
      ? [
          {
            label: 'Reading your product page',
            done: !!scraped && !scraped.failed,
            failed: !!scraped?.failed,
            message: started ? intake['pdp.intake.scrape_started'].message : '',
          },
        ]
      : []),
    {
      label: 'Working out what to ask you',
      done: ready,
      message: asking ? asking.message : '',
    },
    { label: 'Getting your product ready to audit', done: ready, message: '' },
  ];

  return (
    <section className="mt-5 rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-card">
      <div className="text-[11px] tracking-wider uppercase text-navy-400 dark:text-slate-500 font-semibold">
        Progress
      </div>
      <ol className="mt-2 divide-y divide-navy-100 dark:divide-slate-800">
        {steps.map((s) => (
          <li key={s.label} className="flex items-start gap-3 py-2.5">
            <span className="mt-0.5 h-5 w-5 shrink-0 grid place-items-center">
              {s.failed ? (
                <span className="h-5 w-5 rounded-full bg-danger/15 text-danger grid place-items-center">
                  <IconX width={12} height={12} />
                </span>
              ) : s.done ? (
                <span className="h-5 w-5 rounded-full bg-mint-500 text-navy-900 grid place-items-center">
                  <IconCheck width={12} height={12} />
                </span>
              ) : (
                <span className="h-4 w-4 rounded-full border-2 border-meta-100 border-t-meta-600 animate-spin" />
              )}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] text-navy-700 dark:text-slate-200 leading-tight">{s.label}</div>
              {s.message && (
                <div className="mt-0.5 text-[11.5px] text-navy-600 dark:text-slate-500 truncate">
                  {s.message}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      {!withWebhooks && (
        <div className="mt-1 text-[11.5px] text-navy-600 dark:text-slate-500">
          Live progress isn't available on the Blueprint PDF route — this stays put until it's done.
        </div>
      )}
    </section>
  );
}

function PathCard({ active, onClick, title, body }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'text-left rounded-2xl border p-5 transition',
        active
          ? 'border-meta-600 bg-meta-50 dark:bg-meta-500/10 ring-2 ring-meta-100 dark:ring-meta-500/20'
          : 'border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-meta-500',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div className="font-display text-[16px] font-semibold text-navy-900 dark:text-slate-100">
          {title}
        </div>
        {active && <IconCheck width={16} height={16} className="text-meta-600" />}
      </div>
      <p className="mt-1.5 text-[12.5px] text-navy-600 dark:text-slate-400 leading-relaxed">{body}</p>
    </button>
  );
}

function Card({ title, hint, children }) {
  return (
    <section className="mt-5 rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-card">
      <div className="text-[11px] tracking-wider uppercase text-navy-400 dark:text-slate-500 font-semibold">
        {title}
      </div>
      {hint && (
        <p className="mt-1.5 mb-3 text-[11.5px] text-navy-600 dark:text-slate-500 leading-relaxed">
          {hint}
        </p>
      )}
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[12px] font-medium text-navy-700 dark:text-slate-300 mb-1.5">{label}</div>
      {children}
    </label>
  );
}

// =============================================================
// Canvas — the captured product, then the audit and the strategy as they land.
//
// **This screen now renders HTML documents.** It used to be the one agent screen
// with no iframe, because the workflow produced JSON only. Both artifacts are now
// composed into self-contained HTML by the backend — the audit in `auditor_cleanup`,
// the strategy in `turn_recap` — so each is shown in a sandboxed iframe, the same
// way the Meta Ad screen shows its documents.
//
// The raw values are still carried and still rendered as a FALLBACK. A render is
// one model call and it can fail; when it does, the backend keeps the previous
// HTML rather than blanking it, and on the very first audit there is no previous
// one. Falling back to the areas means a failed render costs presentation, never
// the findings themselves.
// =============================================================

function Canvas({
  audit, strategy, scout, canvasSel, onPickCanvas, researching,
}) {
  // The captured product, then the whole four-specialist arc — three of the four
  // are live, and the arc is shown in full so a founder can see where this goes.
  //
  // Every artifact this renders MUST be destructured above. An artifact used below
  // but not named here is an UNDECLARED identifier, not an undefined prop, so it
  // throws `ReferenceError` and white-screens the whole app the moment its tab is
  // clicked — and the production build cannot catch it. That is exactly how `scout`
  // shipped broken, and how `setAreaSel` broke every area webhook before it.
  // The four-specialist arc, and nothing else. The `Product` tab was removed: with
  // the gap-questions panel already gone it held only a restatement of the setup form
  // — platform, path, and how the page was read — all of which the founder just
  // entered and none of which is a finding. `ProductView` is left defined below but
  // unrendered, so restoring it is one entry here and one branch in the switch.
  const tabs = SPECIALISTS.map(({ key, label }) => ({ key, label }));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-12 px-5 flex items-center gap-2 border-b border-navy-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto thin-scroll">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onPickCanvas(key)}
            className={[
              'shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition',
              canvasSel === key
                ? 'bg-meta-600 text-white'
                : 'text-navy-600 dark:text-slate-400 hover:bg-meta-50 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto thin-scroll">
        {canvasSel === 'auditor' ? (
          <AuditView audit={audit} researching={researching} />
        ) : canvasSel === 'scout' ? (
          <ScoutView scout={scout} researching={researching} />
        ) : canvasSel === 'strategist' ? (
          <StrategyView strategy={strategy} researching={researching} />
        ) : (
          <SpecialistStub sel={canvasSel} />
        )}
      </div>
    </div>
  );
}

// What was actually captured, shown back before any audit runs — the founder's
// check that the right page was read.
function ProductView({ capture, scrape, gapQuestions }) {
  if (!capture) return null;
  const images = scrape?.image_urls || [];
  const productUrl = scrape?.product_url;
  const isAmazon = capture.platform === 'amazon';
  const scraped = capture.path === 'page_scrape';
  return (
    <div className="p-6 max-w-[1024px] mx-auto flex flex-col gap-4">
      <div className="rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-5">
        <div className="font-display text-[17px] font-semibold text-navy-900 dark:text-slate-100">
          What I read
        </div>
        <p className="mt-1 text-[12.5px] text-navy-600 dark:text-slate-400 leading-relaxed">
          This is exactly what the audit works from. If it isn't your product, start a new one — a
          thread covers one product and this can't be changed.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="px-2 py-1 rounded-md bg-navy-50 dark:bg-slate-800 text-navy-700 dark:text-slate-300">
            {PLATFORM_LABELS[capture.platform] || capture.platform}
          </span>
          <span className="px-2 py-1 rounded-md bg-navy-50 dark:bg-slate-800 text-navy-700 dark:text-slate-300">
            {capture.path === 'page_scrape' ? 'Read from your live page' : 'Described in your own words'}
          </span>
          <span className="px-2 py-1 rounded-md bg-navy-50 dark:bg-slate-800 text-navy-700 dark:text-slate-300">
            {images.length} image{images.length === 1 ? '' : 's'} captured
          </span>
          {productUrl && (
            <a
              href={productUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-1 rounded-md bg-meta-50 dark:bg-meta-500/10 text-meta-700 dark:text-meta-500 hover:underline truncate max-w-[420px]"
              title={productUrl}
            >
              {productUrl}
            </a>
          )}
        </div>
        {/* How the page was read, which the platform alone decides. There is no
            page text on any path any more: Amazon is read as structured listing
            fields, and every other storefront as a full-page screenshot that
            stays on the thread and is never sent to this screen. */}
        {scraped && (
          <p className="mt-3 text-[12px] text-navy-600 dark:text-slate-400 leading-relaxed">
            {isAmazon
              ? 'Read as an Amazon listing — your own title, bullets, specifications and gallery, as published.'
              : 'Captured as a full-page picture, so the audit judges the page a buyer actually sees rather than a transcript of it.'}
          </p>
        )}
      </div>

      {/* The dedicated "What I asked you" panel is GONE. The questions are still
          asked and still answered once, on the first turn, through the chat card —
          exactly how the Meta Ad screen does it. What was removed is the second,
          permanent copy of them on the canvas: once answered they are context the
          backend carries, not something the founder needs to keep re-reading, and
          the canvas is for what was READ from the page. `GapAnswersPanel` is left
          defined below rather than deleted, so restoring it is one line here. */}

      {images.length > 0 && (
        <div className="rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-5">
          <div className="font-display text-[14px] font-semibold text-navy-900 dark:text-slate-100">
            Images captured
          </div>
          <p className="mt-1 text-[11.5px] text-navy-600 dark:text-slate-500 leading-relaxed">
            On a live page this is everything the page carries, site furniture included. The Images
            area picks out your real product photographs and judges only those — page chrome and
            recommendation thumbnails get no row at all.
          </p>
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
            {images.map((url, i) => (
              <a
                key={`${url}-${i}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                title={url}
                className="block aspect-square rounded-lg border border-navy-100 dark:border-slate-700 bg-navy-50 dark:bg-slate-800 overflow-hidden"
              >
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// The questions this product opened with, and what the founder said back. Sits on
// the Product tab because that is what it is — part of the record the audit works
// from, alongside the page and the images.
//
// An UNANSWERED question is shown rather than hidden: skipping is allowed, and the
// areas are told to say what they assumed instead. A founder reading "you didn't
// answer this" can go back and answer it; one shown nothing cannot.
function GapAnswersPanel({ questions }) {
  if (!questions || !questions.length) return null;
  const pending = questions.every((q) => q.answers === undefined);
  return (
    <div className="rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-5">
      <div className="font-display text-[14px] font-semibold text-navy-900 dark:text-slate-100">
        What I asked you
      </div>
      <p className="mt-1 text-[11.5px] text-navy-600 dark:text-slate-500 leading-relaxed">
        {pending
          ? "These are waiting in the chat. Answering is optional — anything you skip, the audit says what it assumed instead."
          : "Things your page can't show. Anything you skipped, the audit says what it assumed instead."}
      </p>
      <dl className="mt-3 divide-y divide-navy-100 dark:divide-slate-800">
        {questions.map((q, i) => (
          <div key={i} className="py-3">
            <dt className="text-[13px] text-navy-900 dark:text-slate-100 leading-snug">
              {q.question}
            </dt>
            <dd className="mt-1 text-[12.5px]">
              {q.answers && q.answers.length ? (
                <span className="text-navy-700 dark:text-slate-300">{q.answers.join(', ')}</span>
              ) : (
                <span className="italic text-navy-400 dark:text-slate-500">
                  {pending ? 'Not answered yet' : 'Skipped'}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SpecialistStub({ sel }) {
  const entry = SPECIALISTS.find((s) => s.key === sel);
  if (!entry) return null;
  const { label, blurb } = entry;
  return (
    <div className="h-full grid place-items-center p-10 text-center">
      <div className="max-w-[440px]">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-navy-900 grid place-items-center text-mint-500">
          <IconCompass width={22} height={22} />
        </div>
        <div className="mt-3 font-display text-[18px] font-semibold text-navy-900 dark:text-slate-100">
          {label} isn't built yet
        </div>
        <p className="mt-1.5 text-[13px] text-navy-600 dark:text-slate-400 leading-relaxed">
          {blurb} It comes after the Auditor — ask for it and you'll be told plainly that it can't be
          done yet rather than being handed something half-made.
        </p>
      </div>
    </div>
  );
}

// =============================================================
// The audit — ONE report, not four tabs.
//
// The four areas answer four questions about the same page, and a founder reads
// them as one verdict on that page rather than as four documents. So every area
// that has landed renders in roster order down a single scroll, with no chips and
// nothing to select. Areas that have not landed are simply absent.
//
// Rendering is purpose-built per row type, which the four schemas make possible:
// they share one skeleton (verdict · description · one list) and differ only in
// the row. `MetricAlignment` and `LayoutBlock` are a findings table;
// `ImageJudgement` is a thumbnail grid. The generic `FieldRows` reader survives
// only as the fallback for an area shipped ahead of this file.
// =============================================================

// One self-contained HTML document in a sandboxed iframe, with its source behind
// a disclosure. Shared by the audit and the strategy.
//
// `sandbox="allow-same-origin"` and nothing else: these documents are generated by
// a model and carry inline CSS only, so no script should ever run in them. The
// audit's document also loads the product photographs from their real URLs, which
// is why the sandbox cannot be fully closed.
//
// The card takes an explicit VIEWPORT-relative height rather than relying on the
// flex ancestry resolving, and the iframe fills it and scrolls its own content
// natively — the arrangement the Meta Ad screen settled on, because native iframe
// scrolling is the only kind that behaves in every browser.
function HtmlDoc({ html, title }) {
  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="w-full max-w-[1024px] h-[calc(100vh-200px)] min-h-[360px] bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-700 rounded-2xl shadow-card overflow-hidden">
        <iframe
          title={title}
          srcDoc={html}
          sandbox="allow-same-origin"
          className="block w-full h-full"
          style={{ border: 0 }}
        />
      </div>
      <details className="w-full max-w-[1024px] shrink-0 rounded-xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900">
        <summary className="cursor-pointer px-4 py-2.5 text-[12.5px] font-semibold text-navy-700 dark:text-slate-200 select-none">
          View raw HTML
        </summary>
        <pre className="px-4 py-3 max-h-[400px] overflow-auto text-[11.5px] font-mono text-navy-700 dark:text-slate-300 bg-mist dark:bg-slate-800/50 border-t border-navy-100 dark:border-slate-800 whitespace-pre-wrap break-all">
          {html}
        </pre>
      </details>
    </div>
  );
}

// An empty state shared by both artifact tabs.
function CanvasEmpty({ busy, busyTitle, busyBody, idleTitle, idleBody }) {
  return (
    <div className="h-full grid place-items-center p-10 text-center">
      <div className="max-w-[440px]">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-navy-900 grid place-items-center text-mint-500">
          <IconCompass width={22} height={22} />
        </div>
        <div className="mt-3 font-display text-[18px] font-semibold text-navy-900 dark:text-slate-100">
          {busy ? busyTitle : idleTitle}
        </div>
        <p className="mt-1.5 text-[13px] text-navy-600 dark:text-slate-400 leading-relaxed">
          {busy ? busyBody : idleBody}
        </p>
      </div>
    </div>
  );
}

// The strategy — what the page SHOULD say and show. One document, rewritten whole
// every time the Strategist runs, so there is nothing to merge and nothing to
// select inside it.
function StrategyView({ strategy, researching }) {
  const html = strategy?.html;
  const markdown = strategy?.markdown;

  if (!html && !markdown) {
    return (
      <CanvasEmpty
        busy={researching}
        busyTitle="Writing your strategy…"
        busyBody="It reads the audit, your product, your answers and your images, then writes the plan in one pass."
        idleTitle="No strategy yet"
        idleBody="Ask in the chat for what to do about your page. The audit says what is wrong; the strategy says what to write and shoot."
      />
    );
  }

  // The HTML is the intended view. The markdown fallback covers the turn where a
  // render failed — the plan is what matters, not its typography.
  if (html) return <HtmlDoc html={html} title="Page strategy" />;
  return (
    <div className="p-6 max-w-[1024px] mx-auto">
      <div className="rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-6">
        <Markdown text={markdown} />
      </div>
    </div>
  );
}

// The competitor field — what the products winning this category do with their
// pages. ONE document rewritten whole on every Scout run, exactly like the
// strategy, so there is nothing to merge and nothing to select inside it.
//
// **HTML only, with no per-field fallback — deliberately unlike `AuditView` and
// `StrategyView`.** Those two carry one because their HTML is composed by a MODEL
// and one failed render would otherwise blank the page. The Scout's is built
// server-side in Python by `pdp_scout_builder` / `pdp_scout_pdp_builder`, which is
// also why every figure on it is computed rather than typed: there is no render
// call to fail, so a fallback here would be code that can never run.
//
// `scout.analysis` still rides the wire — it is what the CMO and the Strategist
// read as a text digest — it simply is not a second rendering of this page.
function ScoutView({ scout, researching }) {
  const html = scout?.html;

  if (!html) {
    return (
      <CanvasEmpty
        busy={researching}
        busyTitle="Mapping the competitor field…"
        busyBody="It searches the category, then reads the winning product pages one by one. This is the slowest step — a few minutes is normal."
        idleTitle="No competitor field yet"
        idleBody="Ask in the chat what competitors do, or how pages in your category are built. The Scout reads the winners and reports what they have in common."
      />
    );
  }

  return <HtmlDoc html={html} title="Competitor field" />;
}

function AuditView({ audit, researching }) {
  const landed = areaKeys(audit).filter((k) => audit?.[k]);
  const html = audit?.html;

  if (!landed.length && !html) {
    return (
      <CanvasEmpty
        busy={researching}
        busyTitle="Auditing your page…"
        busyBody="Each area lands on its own — they finish at very different times, and the report is rebuilt each time one does."
        idleTitle="Nothing audited yet"
        idleBody="Ask for the audit in the chat. You can ask for the whole thing, or for one area on its own."
      />
    );
  }

  // The composed document is the intended view. It is rebuilt whenever any area
  // moves, so it is never stale relative to the areas — except on the one turn a
  // render fails, which is exactly when the fallback below matters.
  if (html) return <HtmlDoc html={html} title="Page audit" />;

  return (
    <div className="p-6 max-w-[1024px] mx-auto flex flex-col gap-4">
      <div>
        <div className="font-display text-[22px] font-semibold text-navy-900 dark:text-slate-100 leading-tight">
          Your page audit
        </div>
        <p className="mt-1 text-[12.5px] text-navy-600 dark:text-slate-400 leading-relaxed">
          {landed.length === AUDIT_AREAS.length
            ? 'All four areas, judged against your page. Nothing here is a score, and nothing here tells you what to do — it says what your page is.'
            : `${landed.length} of ${AUDIT_AREAS.length} areas so far. Each one lands on its own and appears here the moment it does.`}
        </p>
      </div>
      {landed.map((key) => (
        <AreaSection key={key} areaKey={key} value={audit[key]} />
      ))}
    </div>
  );
}

// One area inside the fallback report. Two kinds arrive now: SEO, AEO and Layout
// are MARKDOWN DOCUMENTS, and Images alone is structured — its rows are keyed by
// image URL so each photograph renders beside its own judgement.
//
// It branches on `typeof value === 'string'` rather than on a list of area names,
// because the value's own type is what the backend actually guarantees; a parallel
// roster of which-areas-are-markdown would be a second place for that to drift.
//
// There is no aligned count here any more — the markdown areas have no rows.
function AreaSection({ areaKey, value }) {
  const question = AREA_BY_KEY[areaKey]?.question;
  const isMarkdown = typeof value === 'string';
  const { verdict, description, images, missing_shots, ...rest } = (isMarkdown ? {} : value) || {};
  // Anything the structured area does not carry still renders, so a field added
  // to it is legible before this file catches up.
  const extra = Object.fromEntries(Object.entries(rest).filter(([, v]) => !isBlank(v)));

  return (
    <div className="rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card">
      <div className="flex items-start gap-4 px-5 py-4 border-b border-navy-100 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <div className="font-display text-[19px] font-semibold text-navy-900 dark:text-slate-100 leading-tight">
            {areaLabel(areaKey)}
          </div>
          {question && (
            <div className="mt-0.5 text-[12px] text-navy-600 dark:text-slate-400">{question}?</div>
          )}
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-3">
        {isMarkdown ? (
          <Markdown text={value} />
        ) : (
          <>
            {verdict && (
              <div className="text-[15px] font-medium text-navy-900 dark:text-slate-100 leading-snug">
                {verdict}
              </div>
            )}
            {description && (
              <p className="text-[13px] text-navy-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            )}
            {Array.isArray(images) && images.length > 0 && <ImageJudgements images={images} />}
            {Array.isArray(missing_shots) && <MissingShots shots={missing_shots} />}
            {Object.keys(extra).length > 0 && <FieldRows value={extra} />}
          </>
        )}
      </div>
    </div>
  );
}

// The three markdown areas, and the strategy's fallback, render through here.
// `remark-gfm` is required rather than decorative: every one of these documents
// uses GFM tables and task-style bullets, which core markdown does not parse.
//
// The `prose` classes are the same ones `MilestoneViewer` uses, so a document
// looks the same wherever the app shows one.
function Markdown({ text }) {
  if (!text) return null;
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed text-navy-800 dark:text-slate-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}


// `ImageJudgement` carries no boolean — a photograph is rarely simply good or bad,
// so the verdict is a sentence. Showing the photo beside its read is what makes
// this area legible at all.
function ImageJudgements({ images }) {
  return (
    <div className="flex flex-col gap-3 border-t border-navy-100 dark:border-slate-800 pt-3">
      {images.map((img, i) => (
        <div key={`${img?.url}-${i}`} className="flex gap-3">
          <a
            href={img?.url}
            target="_blank"
            rel="noreferrer"
            title={img?.url}
            className="shrink-0 h-20 w-20 rounded-lg border border-navy-100 dark:border-slate-700 bg-navy-50 dark:bg-slate-800 overflow-hidden"
          >
            <img
              src={img?.url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </a>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              {typeof img?.is_aligned === 'boolean' && (
                <span
                  className={[
                    'shrink-0 mt-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    img.is_aligned ? TONE_CLASS.good : TONE_CLASS.bad,
                  ].join(' ')}
                >
                  {img.is_aligned ? 'Earns its place' : 'Does not'}
                </span>
              )}
              {img?.verdict && (
                <div className="text-[13px] font-medium text-navy-900 dark:text-slate-100 leading-snug">
                  {img.verdict}
                </div>
              )}
            </div>
            {img?.justification && (
              <div className="mt-1 text-[12.5px] text-navy-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {img.justification}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// What the image set never shows. Worded as absence, not instruction — the Auditor
// diagnoses and the Strategist prescribes (ADR-0009). An EMPTY list is kept and
// shown, because "nothing is missing" is a real and good answer; on the raw input
// path with no photographs at all, this is the area's whole output.
function MissingShots({ shots }) {
  return (
    <div className="border-t border-navy-100 dark:border-slate-800 pt-3">
      <div className="text-[11px] uppercase tracking-wide text-navy-600 dark:text-slate-400">
        Never shown
      </div>
      {shots.length ? (
        <ul className="mt-1.5 flex flex-col gap-1">
          {shots.map((shot, i) => (
            <li key={i} className="flex gap-2 text-[12.5px] text-navy-900 dark:text-slate-100">
              <span className="text-navy-400 dark:text-slate-600 shrink-0">•</span>
              <span className="min-w-0 leading-relaxed">{shot}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-1.5 text-[12.5px] italic text-navy-400 dark:text-slate-500">
          Nothing a buyer needs to see is missing.
        </div>
      )}
    </div>
  );
}

// One object → labelled rows. Null and empty-string fields are dropped (they mean
// "not applicable here" and are noise); an EMPTY LIST is kept and shown as "None",
// because across these schemas an empty list is a real and often good answer.
function FieldRows({ value }) {
  const entries = Object.entries(value || {}).filter(([, v]) => !isBlank(v));
  if (!entries.length) {
    return <div className="py-3 text-[12.5px] italic text-navy-400 dark:text-slate-500">Nothing recorded.</div>;
  }
  return (
    <dl className="divide-y divide-navy-100 dark:divide-slate-800">
      {entries.map(([key, v]) => (
        <div key={key} className="py-3 flex flex-col md:flex-row gap-1.5 md:gap-5">
          <dt className="md:w-[190px] shrink-0 text-[11px] uppercase tracking-wide text-navy-600 dark:text-slate-400 md:pt-0.5">
            {humanize(key)}
          </dt>
          <dd className="min-w-0 flex-1 text-[13px] text-navy-900 dark:text-slate-100 leading-relaxed">
            <AuditValue fieldKey={key} value={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AuditValue({ fieldKey, value }) {
  if (typeof value === 'boolean') {
    return <Chip tone={value ? 'good' : 'bad'}>{value ? 'Yes' : 'No'}</Chip>;
  }
  if (typeof value === 'number') {
    return <span className="font-mono">{value}</span>;
  }
  if (typeof value === 'string') {
    // Only the image area carries image URLs, and seeing the photo beside its read
    // is what makes that area legible at all.
    if ((fieldKey === 'url' || fieldKey === 'existing_url') && isHttpUrl(value)) {
      return <ImageRef url={value} />;
    }
    if (isHttpUrl(value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="text-meta-600 dark:text-meta-500 hover:underline break-all"
        >
          {value}
        </a>
      );
    }
    if (isVerdict(value)) {
      return <Chip tone="neutral">{value.replace(/_/g, ' ')}</Chip>;
    }
    return <span className="whitespace-pre-wrap">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      return <span className="text-[12.5px] italic text-navy-400 dark:text-slate-500">None</span>;
    }
    const allScalar = value.every((v) => v === null || typeof v !== 'object');
    if (allScalar) {
      return (
        <ul className="flex flex-col gap-1">
          {value.map((v, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-navy-400 dark:text-slate-600 shrink-0">•</span>
              <span className="min-w-0">
                <AuditValue fieldKey={fieldKey} value={v} />
              </span>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="flex flex-col gap-2.5">
        {value.map((item, i) => (
          <div
            key={i}
            className="rounded-xl border border-navy-100 dark:border-slate-700 bg-mist dark:bg-slate-800/50 px-4 py-1"
          >
            <div className="pt-2.5 text-[10px] font-mono text-navy-400 dark:text-slate-500">
              {i + 1}
            </div>
            <FieldRows value={item} />
          </div>
        ))}
      </div>
    );
  }
  if (value && typeof value === 'object') {
    return (
      <div className="rounded-xl border border-navy-100 dark:border-slate-700 bg-mist dark:bg-slate-800/50 px-4 py-1">
        <FieldRows value={value} />
      </div>
    );
  }
  return null;
}

function ImageRef({ url }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={url}
      className="inline-flex items-start gap-2.5 group"
    >
      <span className="shrink-0 h-14 w-14 rounded-lg border border-navy-100 dark:border-slate-700 bg-navy-50 dark:bg-slate-800 overflow-hidden block">
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </span>
      <span className="min-w-0 text-[11.5px] font-mono text-meta-600 dark:text-meta-500 group-hover:underline break-all">
        {url}
      </span>
    </a>
  );
}

function Chip({ tone = 'neutral', children }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md border text-[11.5px] font-medium ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

// =============================================================
// Shared chat chrome — same shapes as the Meta Ad workbench
// =============================================================

function Chevron({ dir = 'left', size = 16 }) {
  const d = { left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6' }[dir];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function CollapsedRail({ label, onExpand }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      title={`Expand ${label.toLowerCase()}`}
      className="w-10 shrink-0 border-r border-navy-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center gap-3 py-3 hover:bg-navy-50 dark:hover:bg-slate-800 transition"
    >
      <span className="text-navy-600 dark:text-slate-400"><Chevron dir="right" /></span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-600 dark:text-slate-400 [writing-mode:vertical-rl]">
        {label}
      </span>
    </button>
  );
}

function PanelBar({ label, onCollapse }) {
  return (
    <div className="flex items-center justify-between px-3 h-9 shrink-0 border-b border-navy-100 dark:border-slate-800">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-600 dark:text-slate-400">
        {label}
      </span>
      <button
        type="button"
        onClick={onCollapse}
        title={`Collapse ${label.toLowerCase()}`}
        className="p-1 -mr-1 text-navy-400 hover:text-navy-700 dark:text-slate-500 dark:hover:text-slate-200 transition"
      >
        <Chevron dir="left" />
      </button>
    </div>
  );
}

function DraftingPill({ label }) {
  return (
    <div className="inline-flex items-center gap-2 text-[12.5px] text-navy-600 dark:text-slate-400">
      <span className="h-4 w-4 rounded-full border-2 border-meta-100 border-t-meta-600 animate-spin" />
      {label}…
    </div>
  );
}

// Live "what's happening" feed for the running turn, fed by the Auditor's node-start
// marker and every audit webhook's founder-facing message — so a founder watches
// each research call land instead of staring at a spinner. Research is slow and the
// areas finish far apart, which is exactly what this makes visible.
function ActivityFeed({ items }) {
  const recent = items.slice(-6);
  return (
    <div className="flex flex-col gap-1.5">
      {recent.map((text, i) => {
        const isLast = i === recent.length - 1;
        return (
          <div
            key={`${i}-${text}`}
            className={`inline-flex items-center gap-2 text-[12.5px] ${
              isLast ? 'text-navy-700 dark:text-slate-200' : 'text-navy-400 dark:text-slate-500'
            }`}
          >
            {isLast ? (
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-meta-100 border-t-meta-600 animate-spin" />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0 inline-flex items-center justify-center text-meta-500">
                <IconCheck width={12} height={12} />
              </span>
            )}
            <span>{text}</span>
          </div>
        );
      })}
    </div>
  );
}
