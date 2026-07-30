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

// The fixed specialist arc. ALL FOUR are built now — the Studio was the last, and
// it is the only one that MAKES something rather than describing it.
const SPECIALISTS = [
  { key: 'auditor', label: 'Auditor', blurb: 'Audits how your product is presented, area by area.' },
  { key: 'scout', label: 'Scout', blurb: 'Reads the pages you are actually losing to.' },
  { key: 'strategist', label: 'Strategist', blurb: 'Turns the audit into what your page should say and show.' },
  { key: 'studio', label: 'Studio', blurb: 'Writes the page and makes the pictures it needs.' },
];
const LIVE_SPECIALISTS = new Set(['auditor', 'scout', 'strategist', 'studio']);

// RETIRED 2026-07-30 — `AUDIT_META_KEYS`. It separated `html` from the area keys
// inside the audit payload, back when that payload held both. `done.audit` is now
// `{ html }` and nothing else, so there is no area key to tell it apart from.
//
// const AUDIT_META_KEYS = new Set(['html', 'image']);

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
// RETIRED 2026-07-30 — `mergeAudit`. The audit is no longer a per-area object on
// the wire: `done.audit` is `{ html }`, the four areas composed into one rendered
// page, so it REPLACES exactly as the strategy, the scout and the content do.
//
// The areas' own output — three markdown documents and the Images judgement — is
// backend-internal now. It feeds the HTML render and each area's own next pass,
// and reaches nothing else. So there is no per-area value left to merge, and no
// reducer needed to stop one area clobbering another.
//
// The `pdp.audit.<area>` webhooks still fire, but they are progress EVENTS
// carrying `{ area }` and no content — see `auditAreas` below.
//
// The one rule that survives, unchanged and still load-bearing: a null/absent
// `audit` on `done` means UNCHANGED, never cleared.
//
// function mergeAudit(prev, incoming) {
//   if (!incoming || typeof incoming !== 'object') return prev;
//   const next = { ...(prev || {}) };
//   for (const [area, value] of Object.entries(incoming)) {
//     if (value != null) next[area] = value;
//   }
//   return next;
// }
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// The Studio's image reducer. `pdp.studio.image` ships ONE picture — the path down
// to the one new version, carrying its set's key, category and ratio — so a
// receiver that has never seen that set can create it from the webhook alone. That
// makes this a MERGE, per set and then per slot, unlike `done.content` and
// `done.scout`, which replace.
//
// Two rules it exists to hold:
//   - versions are APPEND-ONLY on the backend, so a slot's incoming versions are
//     concatenated by version NUMBER rather than replacing what is there — a
//     webhook carrying v2 must not wipe the v1 already on screen;
//   - a set or slot the incoming payload does not mention is left exactly as it
//     was, which is what lets six pictures arrive one at a time over minutes and
//     accumulate rather than each one blanking the last.
//
// The `done` frame carries the WHOLE artifact and so replaces outright — it is
// authoritative, and backfills anything a missed webhook lost.
// ---------------------------------------------------------------------------
function mergeImageSets(prev, incoming) {
  if (!incoming || !Array.isArray(incoming.sets)) return prev;
  const bySetKey = new Map((prev?.sets || []).map((s) => [s.set_key, s]));

  for (const incomingSet of incoming.sets) {
    const existing = bySetKey.get(incomingSet.set_key);
    if (!existing) {
      bySetKey.set(incomingSet.set_key, incomingSet);
      continue;
    }
    const bySlotKey = new Map((existing.slots || []).map((s) => [s.slot_key, s]));
    for (const incomingSlot of incomingSet.slots || []) {
      const priorSlot = bySlotKey.get(incomingSlot.slot_key);
      if (!priorSlot) {
        bySlotKey.set(incomingSlot.slot_key, incomingSlot);
        continue;
      }
      // Merge takes by version number. A webhook re-sending a version already held
      // replaces that one entry rather than duplicating it.
      const byVersion = new Map((priorSlot.versions || []).map((v) => [v.version, v]));
      for (const v of incomingSlot.versions || []) byVersion.set(v.version, v);
      bySlotKey.set(incomingSlot.slot_key, {
        ...priorSlot,
        ...incomingSlot,
        versions: [...byVersion.values()].sort((a, b) => a.version - b.version),
      });
    }
    bySetKey.set(incomingSet.set_key, {
      ...existing,
      ...incomingSet,
      slots: [...bySlotKey.values()],
    });
  }
  return { sets: [...bySetKey.values()] };
}

// The newest take of a picture — the one to show. Versions are append-only and the
// backend numbers them from 1, but this sorts rather than trusting array order,
// because the webhook and the done frame can deliver them in different orders.
function currentVersion(slot) {
  const versions = slot?.versions || [];
  if (!versions.length) return null;
  return versions.reduce((a, b) => (b.version > a.version ? b : a));
}

// What to put in an <img> for one take. Prefer the real URL where there is one —
// it is the product's own photograph and the browser caches it — and fall back to
// the inlined bytes, which is the ONLY source for a generated picture and the
// safety net for a merchant CDN url that has since expired.
function versionSrc(version) {
  if (!version) return null;
  return version.url || version.data_uri || null;
}

// Sets grouped by category, preserving first-seen order. One category legitimately
// spans SEVERAL sets — a gallery whose photographs are not all the same shape is
// one gallery across one set per shape — so without this a founder sees their
// single gallery split into two unexplained groups.
function setsByCategory(imageSets) {
  const groups = [];
  const byName = new Map();
  for (const set of imageSets?.sets || []) {
    const name = (set.category || '').trim() || 'Images';
    if (!byName.has(name)) {
      const group = { category: name, sets: [] };
      byName.set(name, group);
      groups.push(group);
    }
    byName.get(name).sets.push(set);
  }
  return groups;
}

// RETIRED 2026-07-30 — `areaKeys`. It walked the audit payload's area keys, in
// roster order, unioning in anything unrecognised so an area shipped ahead of this
// file still rendered. There are no area keys on the wire any more.
//
// What replaced its one surviving job — knowing which areas have landed, for the
// progress line while the audit is still running — is `auditAreas`, a set fed by
// the `pdp.audit.<area>` webhooks. Those name their area in `data.area`, so the
// roster still needs no hardcoding here and a fifth area still needs no change.
//
// function areaKeys(audit) {
//   const known = AUDIT_AREAS.map((a) => a.key);
//   const extra = Object.keys(audit || {}).filter(
//     (k) => !known.includes(k) && !AUDIT_META_KEYS.has(k),
//   );
//   return [...known, ...extra];
// }

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

  // `{ html }` — the four areas composed into ONE rendered page. Replaced whole,
  // like every other artifact here: the areas' own output is backend-internal and
  // never reaches this screen, so there is nothing to merge per key any more.
  const [audit, setAudit] = useState(null);
  // Which areas have ANNOUNCED themselves this session, from the
  // `pdp.audit.<area>` progress webhooks. Content-free — the areas finish minutes
  // apart and this is what lets the canvas say "2 of 4 so far" while the page
  // itself is still being composed. It deliberately does not clear between turns:
  // an area audited earlier is still covered by the page.
  const [auditAreas, setAuditAreas] = useState(() => new Set());
  // The strategy is ONE document written whole in a single call — `{ html }`, the
  // page itself, with no markdown source it could disagree with.
  const [strategy, setStrategy] = useState(null);
  // The competitor field. Replaced whole on every Scout run, like the strategy and
  // unlike the audit: a run maps the field as it stands today, and half of one run
  // merged into half of another would describe a field that never existed.
  // `{analysis, html, queries, product_count}` — no `image`, because the Scout
  // reaches the models as text and the page is built server-side in Python.
  const [scout, setScout] = useState(null);
  // The Studio's two artifacts, and they are INDEPENDENT — a turn routinely
  // produces one without the other, so they are two pieces of state rather than
  // one. `content` is a container with exactly one populated side (`amazon` |
  // `generic`), replaced whole. `image_sets` MERGES from the per-picture webhooks
  // as each one lands, and is replaced whole by the authoritative `done` frame.
  const [content, setContent] = useState(null);
  const [imageSets, setImageSets] = useState(null);
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
  // The arc's Auditor step ticks on the PAGE existing, not on an area having
  // announced itself: an area webhook can arrive from a pass whose render then
  // failed, and a step ticked with nothing on the canvas reads as a bug.
  const hasAudit = Boolean(audit?.html);

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
        // The Studio's words — one document, so a plain assignment like the
        // scout's rather than a merge.
        if (stage === 'pdp.studio.content') {
          if (data.content) {
            setContent(data.content);
            if (!canvasTouchedRef.current) setCanvasSel('studio');
          }
          return;
        }
        // The Studio's pictures — ONE picture per webhook, arriving over several
        // minutes, so this MERGES. Without it each new picture would blank the
        // ones already on screen.
        if (stage === 'pdp.studio.image') {
          if (data.image_sets) {
            setImageSets((prev) => mergeImageSets(prev, data.image_sets));
            if (!canvasTouchedRef.current) setCanvasSel('studio');
          }
          return;
        }
        // `pdp.studio.tool_call` is progress only; its message already fed the feed.
        if (stage === 'pdp.studio.tool_call') return;
        // `pdp.audit.tool_call` is progress only; its message already fed the feed.
        if (!stage || !stage.startsWith('pdp.audit.') || stage === 'pdp.audit.tool_call') return;
        // Everything else in that family is ONE finished area — a progress EVENT,
        // carrying `{ area }` and no content. The area's own output never leaves
        // the backend; the composed page arrives on `done`. So all this records is
        // that the area landed, which is what drives the "N of 4" line while the
        // others are still running.
        //
        // The area names itself in the payload, so a fifth area needs nothing here
        // — the same property the old per-key reducer had, for the same reason.
        const area = data?.area;
        if (area) setAuditAreas((prev) => (prev.has(area) ? prev : new Set(prev).add(area)));
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
        } else if (ev.type === 'studio_working') {
          // Once per turn, not once per ReAct loop pass. The second-slowest step
          // after the Scout — a batch of images renders for minutes — so the line
          // says so rather than letting it read as a stall.
          setResearching(true);
          pushActivity('Building your page — images take a few minutes…');
        } else if (ev.type === 'done') {
          if (assistantText) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: assistantText, time: Date.now() },
            ]);
            committed = true;
          }
          // Authoritative, and it is the WHOLE audit — every area audited so far
          // composed into one page, so a missed progress webhook costs nothing.
          // A null audit means NOTHING MOVED this turn; keep what is on the canvas.
          if (ev.audit) {
            setAudit(ev.audit);
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
          // The Studio's two, LAST in the arc — so they win the canvas over
          // everything before them on a turn that ran several specialists, by the
          // same rule that puts the strategy ahead of the audit.
          //
          // Both REPLACE here rather than merging: this frame is authoritative and
          // carries the whole artifact, which is what backfills anything a missed
          // per-picture webhook lost. The merge is only for those webhooks.
          //
          // Each is null when the Studio did not run — never "clear it".
          if (ev.content) {
            setContent(ev.content);
            if (!canvasTouchedRef.current) setCanvasSel('studio');
          }
          if (ev.image_sets) {
            setImageSets(ev.image_sets);
            if (!canvasTouchedRef.current) setCanvasSel('studio');
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
            auditor: hasAudit,
            scout: Boolean(scout?.html),
            strategist: Boolean(strategy?.html),
            // Either artifact counts — the Studio genuinely produces one without
            // the other, so requiring both would leave the step unticked on a turn
            // that only made pictures.
            studio: Boolean(content?.amazon || content?.generic || imageSets?.sets?.length),
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
                auditAreas={auditAreas}
                strategy={strategy}
                scout={scout}
                content={content}
                imageSets={imageSets}
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
// built — ALL FOUR are, since the Studio landed.
//
// `landed` is per-specialist, not one flag. That mattered from the moment there
// were two: a single `hasAudit` ticked the Strategist as soon as the AUDIT came
// back, telling a founder a plan existed when none had been written. With four it
// matters more, and the Studio's entry is deliberately an OR over its two artifacts
// — it genuinely produces pictures without content, or content without pictures.
//
// `LIVE_SPECIALISTS` now holds every key, so `live` is always true. It is kept
// rather than removed: it is the one line that would need editing if a FIFTH
// specialist were added ahead of its implementation, which is exactly how the
// Scout, the Strategist and the Studio each shipped.
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
// **Every artifact on this screen is an HTML document** (2026-07-30). The audit is
// composed in `auditor_cleanup`, the strategy is written directly as a page by the
// Strategist's single call, and the Scout's is built server-side in Python. Each
// renders in a sandboxed iframe, the same way the Meta Ad screen shows its docs.
//
// **There are no fallbacks left, and none are possible.** The raw values used to
// ride the wire beside the markup so a failed render cost presentation rather than
// content. They no longer reach this screen at all: the audit's four areas are
// backend-internal, and the strategy has no markdown source to fall back to now
// that one call writes the page itself.
//
// What covers a failed render instead is the backend keeping the PREVIOUS document
// rather than blanking it — one turn stale, repaired by the next turn that moves
// the artifact. The only uncovered case is a render that fails on the very first
// pass, where the canvas simply stays empty and the recap says what happened.
// =============================================================

function Canvas({
  audit, auditAreas, strategy, scout, content, imageSets, canvasSel, onPickCanvas, researching,
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
          <AuditView audit={audit} areas={auditAreas} researching={researching} />
        ) : canvasSel === 'scout' ? (
          <ScoutView scout={scout} researching={researching} />
        ) : canvasSel === 'strategist' ? (
          <StrategyView strategy={strategy} researching={researching} />
        ) : canvasSel === 'studio' ? (
          <StudioView content={content} imageSets={imageSets} researching={researching} />
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

// UNREACHABLE while all four specialists are built — every `canvasSel` now has a
// view of its own. Kept as the canvas switch's final fallback, because that is the
// branch a FIFTH specialist lands in on the day its tab ships ahead of its screen,
// and an unhandled key would otherwise render a blank canvas with no explanation.
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

  if (!html) {
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

  // HTML only. The Strategist writes the page directly in ONE call, so there is no
  // markdown source to fall back to — a failed call leaves the PREVIOUS page
  // standing rather than producing a document this screen would have to render.
  return <HtmlDoc html={html} title="Page strategy" />;
}

// The competitor field — what the products winning this category do with their
// pages. ONE document rewritten whole on every Scout run, exactly like the
// strategy, so there is nothing to merge and nothing to select inside it.
//
// **HTML only, like `AuditView` and `StrategyView`** — all three are now, since the
// values behind those two stopped reaching this screen. The Scout was the first,
// and for a different reason worth keeping straight: its page is built server-side
// in Python by `pdp_scout_builder` / `pdp_scout_pdp_builder`, which is also why
// every figure on it is computed rather than typed. There is no render call to
// fail here at all, where the other two have one that can.
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

// =============================================================
// The Studio — the page a founder actually publishes.
//
// TWO artifacts, shown as two sections of one scroll rather than two tabs: the
// words and the pictures are independent, but they are one deliverable and a
// founder reads them together.
//
// This is the only view whose content a founder COPIES rather than reads, so every
// copyable string sits in a block with a copy button and nothing reformats it.
// =============================================================

function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard blocked (insecure origin / denied) — the text is on screen
             and selectable either way, so this stays silent rather than throwing
             an error at a founder for something they did not do. */
        }
      }}
      className="shrink-0 px-2 py-1 rounded-md text-[11px] font-medium text-meta-700 dark:text-meta-500 bg-meta-50 dark:bg-meta-500/10 hover:bg-meta-100 dark:hover:bg-meta-500/20 transition"
    >
      {done ? 'Copied' : label}
    </button>
  );
}

// One copyable field: its name, the words, and a copy button.
function CopyField({ label, value, mono = false }) {
  if (isBlank(value)) return null;
  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-500 dark:text-slate-400">
          {label}
        </div>
        <CopyButton text={value} />
      </div>
      <div
        className={[
          'mt-1.5 text-[13px] text-navy-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap break-words',
          mono ? 'font-mono text-[12px]' : '',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  );
}

// Name/value rows — a spec table, an FAQ, the metadata properties. One renderer,
// because the backend deliberately gives all three the same shape.
function PairRows({ pairs }) {
  if (!pairs?.length) return null;
  return (
    <dl className="mt-2 divide-y divide-navy-100 dark:divide-slate-800 border-y border-navy-100 dark:border-slate-800">
      {pairs.map((p, i) => (
        <div key={`${p.name}-${i}`} className="py-2 grid grid-cols-[minmax(0,180px)_1fr] gap-3">
          <dt className="text-[12px] font-medium text-navy-600 dark:text-slate-400 break-words">
            {p.name}
          </dt>
          <dd className="text-[12.5px] text-navy-900 dark:text-slate-100 whitespace-pre-wrap break-words">
            {p.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// THE RECURSIVE BLOCK RENDERER — the one genuinely new piece of rendering here.
//
// A block declares `kind`, and that names which single slot carries its value:
// 'str' → text, 'list' → items, 'pairs' → pairs, 'dict' → blocks. Only 'dict'
// nests, and it nests WITHOUT LIMIT, so this recurses rather than handling a fixed
// depth. Indentation is capped so a deeply nested page does not walk off the right
// edge; the heading hierarchy carries the structure past that point.
function ContentBlock({ block, depth = 0 }) {
  if (!block) return null;
  const heading = block.label || humanize(block.field);
  const pad = Math.min(depth, 3) * 12;

  return (
    <div style={{ paddingLeft: pad }} className={depth > 0 ? 'mt-3' : 'mt-4'}>
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            'font-display font-semibold text-navy-900 dark:text-slate-100',
            depth === 0 ? 'text-[14px]' : 'text-[12.5px]',
          ].join(' ')}
        >
          {heading}
        </div>
        {block.kind === 'str' && <CopyButton text={block.text} />}
        {block.kind === 'list' && <CopyButton text={(block.items || []).join('\n')} />}
      </div>

      {block.kind === 'str' && !isBlank(block.text) && (
        <div className="mt-1.5 text-[13px] text-navy-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
          {block.text}
        </div>
      )}

      {block.kind === 'list' && !!block.items?.length && (
        <ul className="mt-1.5 list-disc pl-5 space-y-1 text-[13px] text-navy-800 dark:text-slate-200 leading-relaxed">
          {block.items.map((item, i) => (
            <li key={i} className="break-words">{item}</li>
          ))}
        </ul>
      )}

      {block.kind === 'pairs' && <PairRows pairs={block.pairs} />}

      {block.kind === 'dict' &&
        (block.blocks || []).map((child, i) => (
          <ContentBlock key={`${child.field}-${i}`} block={child} depth={depth + 1} />
        ))}
    </div>
  );
}

// Amazon is a FORM — a fixed field list the seller does not choose — so it renders
// as labelled fields rather than through the block renderer. That is the same split
// the backend makes with two schemas and two prompts, and the reason the container
// carries one nullable side per platform.
function AmazonContent({ amazon }) {
  const attrs = amazon.contextual_attributes || {};
  const contextual = Object.entries(attrs).filter(([, v]) => Array.isArray(v) && v.length);
  return (
    <div className="divide-y divide-navy-100 dark:divide-slate-800">
      <CopyField label="Title" value={amazon.title} />
      <CopyField label="Item highlights" value={amazon.item_highlights} />

      {!!amazon.bullet_points?.length && (
        <div className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-500 dark:text-slate-400">
              Feature bullets
            </div>
            <CopyButton text={amazon.bullet_points.join('\n')} label="Copy all" />
          </div>
          <ol className="mt-1.5 list-decimal pl-5 space-y-1.5 text-[13px] text-navy-900 dark:text-slate-100 leading-relaxed">
            {amazon.bullet_points.map((b, i) => (
              <li key={i} className="break-words">{b}</li>
            ))}
          </ol>
        </div>
      )}

      <CopyField label="Product description" value={amazon.product_description} />

      {!!amazon.a_plus_modules?.length && (
        <div className="py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-500 dark:text-slate-400">
            A+ content modules
          </div>
          <div className="mt-2 space-y-3">
            {amazon.a_plus_modules.map((m, i) => (
              <div
                key={i}
                className="rounded-xl border border-navy-100 dark:border-slate-700 bg-mist dark:bg-slate-800/50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {m.module_type && (
                      <div className="text-[10.5px] uppercase tracking-wide text-navy-500 dark:text-slate-400">
                        {m.module_type}
                      </div>
                    )}
                    <div className="mt-0.5 font-display text-[13px] font-semibold text-navy-900 dark:text-slate-100">
                      {m.heading}
                    </div>
                  </div>
                  <CopyButton text={`${m.heading}\n\n${m.body}`} />
                </div>
                <div className="mt-1.5 text-[12.5px] text-navy-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          {/* A real caveat, not decoration: A+ tier eligibility could not be
              established from any primary source, so the backend states what it
              assumed rather than guessing — and a founder has to see that. */}
          {!isBlank(amazon.a_plus_tier_note) && (
            <p className="mt-2 text-[11.5px] italic text-navy-600 dark:text-slate-400 leading-relaxed">
              {amazon.a_plus_tier_note}
            </p>
          )}
        </div>
      )}

      <CopyField label="Backend search terms" value={amazon.backend_search_terms} mono />

      {!!contextual.length && (
        <div className="py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-500 dark:text-slate-400">
            Contextual attributes
          </div>
          <p className="mt-1 text-[11.5px] text-navy-600 dark:text-slate-500 leading-relaxed">
            What the product is FOR. These decide whether the marketplace's assistant surfaces you
            for a shopper describing a need rather than naming a product.
          </p>
          <PairRows
            pairs={contextual.map(([name, values]) => ({
              name: humanize(name),
              value: values.join(', '),
            }))}
          />
        </div>
      )}

      {!!amazon.other_attributes?.length && (
        <div className="py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-500 dark:text-slate-400">
            Other attributes
          </div>
          <PairRows pairs={amazon.other_attributes} />
        </div>
      )}
    </div>
  );
}

// One picture: its newest take, with its own version history underneath.
function ImageSlotCard({ slot, ratio }) {
  const current = currentVersion(slot);
  const src = versionSrc(current);
  const takes = slot.versions?.length || 0;
  return (
    <div className="rounded-xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="aspect-square bg-navy-50 dark:bg-slate-800 grid place-items-center overflow-hidden">
        {src ? (
          <img
            src={src}
            /* The alt text is REAL here — it is the line the founder publishes —
               so it is the img's actual alt rather than an empty string. */
            alt={current?.alt_text || slot.label || ''}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[11px] text-navy-400 dark:text-slate-500">No picture yet</span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[12.5px] font-medium text-navy-900 dark:text-slate-100 truncate">
            {slot.label || humanize(slot.slot_key)}
          </div>
          <span className="shrink-0 text-[10.5px] px-1.5 py-0.5 rounded bg-navy-50 dark:bg-slate-800 text-navy-600 dark:text-slate-400">
            {ratio}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-navy-600 dark:text-slate-400">
          <span>
            {current?.source === 'existing' ? 'Your photograph' : 'Made for you'}
          </span>
          {takes > 1 && <span>· {takes} versions</span>}
        </div>
        {!isBlank(current?.alt_text) && (
          <div className="mt-2">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[10.5px] uppercase tracking-wide text-navy-500 dark:text-slate-400">
                Alt text
              </div>
              <CopyButton text={current.alt_text} />
            </div>
            <p className="mt-0.5 text-[11.5px] text-navy-700 dark:text-slate-300 leading-snug break-words">
              {current.alt_text}
            </p>
          </div>
        )}
        {/* Every earlier take, kept. Versions are append-only on the backend
            precisely so the lineage stays readable, and hiding it here would throw
            that away — a founder who preferred v1 needs to be able to find it. */}
        {takes > 1 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] text-meta-700 dark:text-meta-500 select-none">
              Earlier versions
            </summary>
            <div className="mt-2 flex gap-2 flex-wrap">
              {[...slot.versions]
                .sort((a, b) => a.version - b.version)
                .slice(0, -1)
                .map((v) => {
                  const thumb = versionSrc(v);
                  return thumb ? (
                    <img
                      key={v.version}
                      src={thumb}
                      alt={v.alt_text || `Version ${v.version}`}
                      title={v.direction || `Version ${v.version}`}
                      loading="lazy"
                      className="h-14 w-14 object-cover rounded-md border border-navy-100 dark:border-slate-700"
                    />
                  ) : null;
                })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function StudioView({ content, imageSets, researching }) {
  const page = content?.amazon || content?.generic || null;
  // Grouped by category, because one category legitimately spans several sets —
  // a gallery whose photographs are not all the same shape is one gallery across
  // one set per shape, and showing those as two unexplained groups would read as a
  // bug rather than as a fact about the founder's own photographs.
  const groups = setsByCategory(imageSets);
  const pictureCount = (imageSets?.sets || []).reduce(
    (n, s) => n + (s.slots?.length || 0),
    0,
  );

  if (!page && !pictureCount) {
    return (
      <CanvasEmpty
        busy={researching}
        busyTitle="Building your page…"
        busyBody="It writes the words first, then makes the pictures. Images take a few minutes."
        idleTitle="Nothing built yet"
        idleBody="Ask in the chat for your page to be written, or for the photos it still needs. The Studio produces what you publish — the audit says what is wrong, the strategy says what to change, this makes it."
      />
    );
  }

  return (
    <div className="p-6 max-w-[1024px] mx-auto flex flex-col gap-4">
      {page && (
        <div className="rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-5">
          <div className="font-display text-[17px] font-semibold text-navy-900 dark:text-slate-100">
            Your page, written
          </div>
          <p className="mt-1 text-[12.5px] text-navy-600 dark:text-slate-400 leading-relaxed">
            {content?.amazon
              ? 'Amazon fixes which fields exist, so this fills them. Copy each one straight into Seller Central.'
              : 'Your storefront lets you choose the sections, so this proposes them in order — the first block is the top of the page.'}
          </p>
          <div className="mt-3">
            {content?.amazon ? (
              <AmazonContent amazon={content.amazon} />
            ) : (
              (content?.generic?.blocks || []).map((block, i) => (
                <ContentBlock key={`${block.field}-${i}`} block={block} />
              ))
            )}
          </div>
        </div>
      )}

      {!!pictureCount && (
        <div className="rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-5">
          <div className="font-display text-[17px] font-semibold text-navy-900 dark:text-slate-100">
            Your pictures
          </div>
          <p className="mt-1 text-[12.5px] text-navy-600 dark:text-slate-400 leading-relaxed">
            {pictureCount} picture{pictureCount === 1 ? '' : 's'}. Your own photographs are kept
            and shown alongside anything made for you — nothing is ever replaced, so every earlier
            version stays available.
          </p>
          {groups.map((group) => (
            <div key={group.category} className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-500 dark:text-slate-400">
                {group.category}
              </div>
              {group.sets.map((set) => (
                <div
                  key={set.set_key}
                  className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
                >
                  {(set.slots || []).map((slot) => (
                    <ImageSlotCard
                      key={`${set.set_key}-${slot.slot_key}`}
                      slot={slot}
                      ratio={set.aspect_ratio}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// The audit — HTML ONLY, exactly like ScoutView and StrategyView.
//
// There is no per-area fallback any more and there cannot be one: the areas' own
// output never leaves the backend. It feeds the render and each area's own next
// pass, and `done.audit` carries the composed page and nothing else. A failed
// render therefore leaves the PREVIOUS page standing rather than blanking this
// screen, and the next turn that moves an area repairs it.
//
// `areas` is the set of areas that have announced themselves — content-free
// progress webhooks — used only to say how far along a run is while the page is
// still being composed.
function AuditView({ audit, areas, researching }) {
  const html = audit?.html;

  if (!html) {
    const seen = areas?.size || 0;
    return (
      <CanvasEmpty
        busy={researching}
        busyTitle="Auditing your page…"
        busyBody={
          seen
            ? `${seen} of ${AUDIT_AREAS.length} areas are in. They finish at very different times, and the report is composed once they land.`
            : 'Each area lands on its own — they finish at very different times, and the report is composed once they land.'
        }
        idleTitle="Nothing audited yet"
        idleBody="Ask for the audit in the chat. You can ask for the whole thing, or for one area on its own."
      />
    );
  }

  return <HtmlDoc html={html} title="Page audit" />;
}

// One area inside the fallback report. Two kinds arrive now: SEO, AEO and Layout
// are MARKDOWN DOCUMENTS, and Images alone is structured — its rows are keyed by
// image URL so each photograph renders beside its own judgement.
//
// It branches on `typeof value === 'string'` rather than on a list of area names,
// because the value's own type is what the backend actually guarantees; a parallel
// roster of which-areas-are-markdown would be a second place for that to drift.
//
// ---------------------------------------------------------------------------
// RETIRED 2026-07-30 — the per-area audit renderers.
//
// `AreaSection` / `ImageJudgements` / `MissingShots` / `FieldRows` / `AuditValue`
// rendered the audit's four areas when the composed HTML page was missing. They
// are unreachable now: the areas' own output — three markdown documents and the
// Images judgement — never leaves the backend. It feeds the audit's HTML render
// and each area's own next pass, and `done.audit` carries `{ html }` alone.
//
// So there is no fallback to fall back TO, and that is deliberate rather than a
// gap: a failed render leaves the PREVIOUS page standing, one turn stale, and the
// next turn that moves an area repairs it. AuditView is HTML-only, exactly like
// ScoutView and StrategyView.
//
// Commented out rather than deleted, per the standing rule for this workspace.
//
// TO RESTORE these, the backend has to send the areas again FIRST — three edits,
// none of which this file can make: `done.audit` back to `audit.model_dump(...)`
// in `api/v1/endpoints/pdp_agent.py`, `fire_audit_area`'s `data` back to
// `{area: value}`, and the `mergeAudit` / `areaKeys` / `AUDIT_META_KEYS` trio
// above uncommented so the per-area payloads have somewhere to land.
// ---------------------------------------------------------------------------
// // There is no aligned count here any more — the markdown areas have no rows.
// function AreaSection({ areaKey, value }) {
//   const question = AREA_BY_KEY[areaKey]?.question;
//   const isMarkdown = typeof value === 'string';
//   const { verdict, description, image_groups, missing_shots, ...rest } =
//     (isMarkdown ? {} : value) || {};
//   // Anything the structured area does not carry still renders, so a field added
//   // to it is legible before this file catches up.
//   const extra = Object.fromEntries(Object.entries(rest).filter(([, v]) => !isBlank(v)));
//
//   return (
//     <div className="rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card">
//       <div className="flex items-start gap-4 px-5 py-4 border-b border-navy-100 dark:border-slate-800">
//         <div className="min-w-0 flex-1">
//           <div className="font-display text-[19px] font-semibold text-navy-900 dark:text-slate-100 leading-tight">
//             {areaLabel(areaKey)}
//           </div>
//           {question && (
//             <div className="mt-0.5 text-[12px] text-navy-600 dark:text-slate-400">{question}?</div>
//           )}
//         </div>
//       </div>
//
//       <div className="px-5 py-4 flex flex-col gap-3">
//         {isMarkdown ? (
//           <Markdown text={value} />
//         ) : (
//           <>
//             {verdict && (
//               <div className="text-[15px] font-medium text-navy-900 dark:text-slate-100 leading-snug">
//                 {verdict}
//               </div>
//             )}
//             {description && (
//               <p className="text-[13px] text-navy-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
//                 {description}
//               </p>
//             )}
//             {/* The backend groups this product's photographs by what KIND each one is
//                 (gallery, benefits, comparison…), and the Studio seeds its image sets
//                 straight from those groups. A founder reads a gallery and a set of
//                 benefit graphics as two different things, so the heading stays even
//                 when there is only one group — its absence would read as "ungrouped"
//                 rather than "one kind". `category` is free text, so it is rendered as
//                 given and never mapped through a lookup. */}
//             {Array.isArray(image_groups) &&
//               image_groups.map((group, gi) =>
//                 Array.isArray(group?.images) && group.images.length > 0 ? (
//                   <div key={`${group?.category || 'group'}-${gi}`} className="flex flex-col gap-2">
//                     <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-500 dark:text-slate-400">
//                       {group?.category || 'Uncategorised'}
//                       <span className="ml-1.5 font-normal normal-case tracking-normal text-navy-500 dark:text-slate-400">
//                         {group.images.length} image{group.images.length === 1 ? '' : 's'}
//                       </span>
//                     </div>
//                     <ImageJudgements images={group.images} />
//                   </div>
//                 ) : null,
//               )}
//             {Array.isArray(missing_shots) && <MissingShots shots={missing_shots} />}
//             {Object.keys(extra).length > 0 && <FieldRows value={extra} />}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

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


// // `ImageJudgement` carries no boolean — a photograph is rarely simply good or bad,
// // so the verdict is a sentence. Showing the photo beside its read is what makes
// // this area legible at all.
// function ImageJudgements({ images }) {
//   return (
//     <div className="flex flex-col gap-3 border-t border-navy-100 dark:border-slate-800 pt-3">
//       {images.map((img, i) => (
//         <div key={`${img?.url}-${i}`} className="flex gap-3">
//           <a
//             href={img?.url}
//             target="_blank"
//             rel="noreferrer"
//             title={img?.url}
//             className="shrink-0 h-20 w-20 rounded-lg border border-navy-100 dark:border-slate-700 bg-navy-50 dark:bg-slate-800 overflow-hidden"
//           >
//             <img
//               src={img?.url}
//               alt={img?.alt_text || ''}
//               loading="lazy"
//               className="h-full w-full object-cover"
//               onError={(e) => {
//                 e.currentTarget.style.display = 'none';
//               }}
//             />
//           </a>
//           <div className="min-w-0 flex-1">
//             <div className="flex items-start gap-2">
//               {typeof img?.is_aligned === 'boolean' && (
//                 <span
//                   className={[
//                     'shrink-0 mt-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
//                     img.is_aligned ? TONE_CLASS.good : TONE_CLASS.bad,
//                   ].join(' ')}
//                 >
//                   {img.is_aligned ? 'Earns its place' : 'Does not'}
//                 </span>
//               )}
//               {img?.verdict && (
//                 <div className="text-[13px] font-medium text-navy-900 dark:text-slate-100 leading-snug">
//                   {img.verdict}
//                 </div>
//               )}
//             </div>
//             {img?.justification && (
//               <div className="mt-1 text-[12.5px] text-navy-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
//                 {img.justification}
//               </div>
//             )}
//             {/* Alt text is the one thing in this row a founder COPIES rather than
//                 reads — it is publishable output, not a finding — so it is set apart
//                 and labelled instead of running on as another paragraph. It is also
//                 the `alt` on the thumbnail above, which is why that is no longer "". */}
//             {img?.alt_text && (
//               <div className="mt-1.5 flex gap-1.5 text-[12px] leading-relaxed">
//                 <span className="shrink-0 font-semibold uppercase tracking-wide text-[10px] mt-0.5 text-navy-500 dark:text-slate-400">
//                   Alt
//                 </span>
//                 <span className="min-w-0 text-navy-700 dark:text-slate-300">
//                   {img.alt_text}
//                 </span>
//               </div>
//             )}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// // What the image set never shows. Worded as absence, not instruction — the Auditor
// // diagnoses and the Strategist prescribes (ADR-0009). An EMPTY list is kept and
// // shown, because "nothing is missing" is a real and good answer; on the raw input
// // path with no photographs at all, this is the area's whole output.
// function MissingShots({ shots }) {
//   return (
//     <div className="border-t border-navy-100 dark:border-slate-800 pt-3">
//       <div className="text-[11px] uppercase tracking-wide text-navy-600 dark:text-slate-400">
//         Never shown
//       </div>
//       {shots.length ? (
//         <ul className="mt-1.5 flex flex-col gap-1">
//           {shots.map((shot, i) => (
//             <li key={i} className="flex gap-2 text-[12.5px] text-navy-900 dark:text-slate-100">
//               <span className="text-navy-400 dark:text-slate-600 shrink-0">•</span>
//               <span className="min-w-0 leading-relaxed">{shot}</span>
//             </li>
//           ))}
//         </ul>
//       ) : (
//         <div className="mt-1.5 text-[12.5px] italic text-navy-400 dark:text-slate-500">
//           Nothing a buyer needs to see is missing.
//         </div>
//       )}
//     </div>
//   );
// }

// // One object → labelled rows. Null and empty-string fields are dropped (they mean
// // "not applicable here" and are noise); an EMPTY LIST is kept and shown as "None",
// // because across these schemas an empty list is a real and often good answer.
// function FieldRows({ value }) {
//   const entries = Object.entries(value || {}).filter(([, v]) => !isBlank(v));
//   if (!entries.length) {
//     return <div className="py-3 text-[12.5px] italic text-navy-400 dark:text-slate-500">Nothing recorded.</div>;
//   }
//   return (
//     <dl className="divide-y divide-navy-100 dark:divide-slate-800">
//       {entries.map(([key, v]) => (
//         <div key={key} className="py-3 flex flex-col md:flex-row gap-1.5 md:gap-5">
//           <dt className="md:w-[190px] shrink-0 text-[11px] uppercase tracking-wide text-navy-600 dark:text-slate-400 md:pt-0.5">
//             {humanize(key)}
//           </dt>
//           <dd className="min-w-0 flex-1 text-[13px] text-navy-900 dark:text-slate-100 leading-relaxed">
//             <AuditValue fieldKey={key} value={v} />
//           </dd>
//         </div>
//       ))}
//     </dl>
//   );
// }

// function AuditValue({ fieldKey, value }) {
//   if (typeof value === 'boolean') {
//     return <Chip tone={value ? 'good' : 'bad'}>{value ? 'Yes' : 'No'}</Chip>;
//   }
//   if (typeof value === 'number') {
//     return <span className="font-mono">{value}</span>;
//   }
//   if (typeof value === 'string') {
//     // Only the image area carries image URLs, and seeing the photo beside its read
//     // is what makes that area legible at all.
//     if ((fieldKey === 'url' || fieldKey === 'existing_url') && isHttpUrl(value)) {
//       return <ImageRef url={value} />;
//     }
//     if (isHttpUrl(value)) {
//       return (
//         <a
//           href={value}
//           target="_blank"
//           rel="noreferrer"
//           className="text-meta-600 dark:text-meta-500 hover:underline break-all"
//         >
//           {value}
//         </a>
//       );
//     }
//     if (isVerdict(value)) {
//       return <Chip tone="neutral">{value.replace(/_/g, ' ')}</Chip>;
//     }
//     return <span className="whitespace-pre-wrap">{value}</span>;
//   }
//   if (Array.isArray(value)) {
//     if (!value.length) {
//       return <span className="text-[12.5px] italic text-navy-400 dark:text-slate-500">None</span>;
//     }
//     const allScalar = value.every((v) => v === null || typeof v !== 'object');
//     if (allScalar) {
//       return (
//         <ul className="flex flex-col gap-1">
//           {value.map((v, i) => (
//             <li key={i} className="flex gap-2">
//               <span className="text-navy-400 dark:text-slate-600 shrink-0">•</span>
//               <span className="min-w-0">
//                 <AuditValue fieldKey={fieldKey} value={v} />
//               </span>
//             </li>
//           ))}
//         </ul>
//       );
//     }
//     return (
//       <div className="flex flex-col gap-2.5">
//         {value.map((item, i) => (
//           <div
//             key={i}
//             className="rounded-xl border border-navy-100 dark:border-slate-700 bg-mist dark:bg-slate-800/50 px-4 py-1"
//           >
//             <div className="pt-2.5 text-[10px] font-mono text-navy-400 dark:text-slate-500">
//               {i + 1}
//             </div>
//             <FieldRows value={item} />
//           </div>
//         ))}
//       </div>
//     );
//   }
//   if (value && typeof value === 'object') {
//     return (
//       <div className="rounded-xl border border-navy-100 dark:border-slate-700 bg-mist dark:bg-slate-800/50 px-4 py-1">
//         <FieldRows value={value} />
//       </div>
//     );
//   }
//   return null;
// }

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
