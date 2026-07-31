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

// Which specialist a progress webhook belongs to, from its stage prefix. It is a
// PREFIX match on purpose: `pdp.audit.<area>` names a different area every time and
// `pdp.studio.image` fires once per picture, so matching whole stage names would
// need a roster this file has deliberately never held.
//
// The Strategist is absent because it fires no webhooks — one call, no tools, so
// there is nothing to report between starting and finishing. Its empty page shows
// the line its SSE frame set, and nothing refines it.
const STAGE_OWNER = [
  ['pdp.audit.', 'auditor'],
  ['pdp.scout.', 'scout'],
  ['pdp.studio.', 'studio'],
];

const specialistForStage = (stage) =>
  STAGE_OWNER.find(([prefix]) => String(stage || '').startsWith(prefix))?.[1] || null;

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
  { key: 'other', label: 'Other' },
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
  // Brand context, and the founder is never asked to go FIND it — this mirrors the
  // Meta Ad screen exactly, which sends its session thread silently and offers only
  // a PDF. The typed project-ID field is RETIRED: a founder in a project session
  // already has the id (it arrives on the prop), and one in the standalone entry has
  // no way to know it.
  //
  // RETIRED — the typed Foundation-thread field. Kept for restore; uncomment this,
  // the `Field` in `SetupView`'s brand-context card, and the `hasProjectFoundation`
  // prop together, then send `foundationId.trim()` in place of `foundationThreadId`.
  // const [foundationId, setFoundationId] = useState(foundationThreadId || '');
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
  // WHICH specialists are working right now, and what each is doing — keyed by the
  // canvas tab key, value = the live status line for that one.
  //
  // Per-specialist rather than one boolean, because an empty tab must only claim to
  // be busy when ITS OWN specialist is running. With a single flag, a turn that ran
  // only the Auditor put "Mapping the competitor field…" on the empty Scout tab and
  // "Writing your strategy…" on the empty Strategist tab — three spinners for one
  // running node, two of them describing work nobody had asked for.
  //
  // A MAP rather than one key, because the Auditor and the Scout run CONCURRENTLY:
  // both are legitimately live at once, and both tabs should say so.
  const [running, setRunning] = useState({});
  const researching = Object.keys(running).length > 0;
  function startRunning(key, note) {
    setRunning((prev) => ({ ...prev, [key]: note }));
    pushActivity(note);
  }
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
    // Brand context is no longer gated here. A project session supplies it from the
    // prop without asking, and the standalone entry may go without entirely — the
    // PDF route accepts no file and seeds both deliverables empty, which every
    // backend reader coalesces to "_Not available._".
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

    // Which entry this turn uses, decided once and read everywhere below. `/init`
    // needs a Foundation thread — it REQUIRES `foundation_thread_id`, exactly as the
    // Meta Ad init does — so the multipart entry serves both the founder who chose a
    // PDF and the standalone founder who has neither.
    const useMultipart = Boolean(pdfFile) || !foundationThreadId;

    // Open the subscription BEFORE init so no stage is missed — the scrape runs
    // inside the request and fires as it goes. The multipart entry carries no
    // webhook config, so it has no stages to watch.
    const webhook_request = useMultipart
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
      // whatever the connected project holds. With neither, the multipart entry
      // still runs: `pdfFile` is null, the backend seeds both deliverables empty,
      // and the audit judges the page on its own terms.
      const res = useMultipart
        ? await initPdpAgentWithPdf({ ...common, pdfFile })
        : await initPdpAgent({ ...common, foundation_thread_id: foundationThreadId, webhook_request });
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
    setRunning({});
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
        // …and it refines the line on that specialist's OWN empty tab, so a founder
        // watching the Auditor sees "SEO is ready" rather than the generic opener
        // the SSE frame set minutes ago.
        //
        // Guarded on the specialist ALREADY running: the SSE frame is what starts
        // one, and a webhook must never be able to light up a tab whose specialist
        // never announced itself — a late `pdp.audit.*` arriving after the turn
        // closed would otherwise leave the Auditor tab spinning with no turn behind
        // it.
        const owner = specialistForStage(stage);
        if (owner && evt.success_message) {
          setRunning((prev) => (prev[owner] ? { ...prev, [owner]: evt.success_message } : prev));
        }
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
          startRunning('auditor', 'Auditing your product page…');
        } else if (ev.type === 'scout_researching') {
          // Once per turn. The slowest step by far — it searches the category,
          // then reads each winning page — so the activity line says so rather
          // than leaving a founder wondering whether the turn stalled.
          startRunning('scout', 'Mapping the competitor field — this one takes a few minutes…');
        } else if (ev.type === 'strategist_working') {
          // Also once per turn. The Strategist is a single call with no loop, so
          // there is no second pass this could fire on.
          startRunning('strategist', 'Writing your page strategy…');
        } else if (ev.type === 'studio_working') {
          // Once per turn, not once per ReAct loop pass. The second-slowest step
          // after the Scout — a batch of images renders for minutes — so the line
          // says so rather than letting it read as a stall.
          startRunning('studio', 'Building your page — images take a few minutes…');
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
      // Cleared in `finally`, so a turn that errors or is aborted mid-run cannot
      // leave a tab spinning forever on work that has stopped.
      setRunning({});
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

  // Canvas edit boxes show ONLY the founder's instruction in chat, but send the
  // POSITIONED message — which field, which section, which set and slot — to the
  // endpoint, so the Studio knows what to change without the founder having to
  // type the addressing. Lifted verbatim from the Meta Ad screen's `sendTurn`,
  // because the two canvases are solving the identical problem.
  function sendTurn(displayText, endpointText, attachment_urls) {
    const ep = ((endpointText ?? displayText) || '').trim();
    if (!ep) return;
    const shown = (displayText || ep).trim();
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: shown, attachments: attachment_urls, time: Date.now() },
    ]);
    runStream({ user_message: ep, attachment_urls });
  }

  function handleSendText(text, attachment_urls) {
    sendTurn(text, text, attachment_urls);
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
            pdfFile={pdfFile}
            setPdfFile={setPdfFile}
            hasFoundation={!!foundationThreadId}
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
                running={running}
                onUpdate={sendTurn}
                busy={busy}
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
  // RETIRED with the typed Foundation-thread field: `foundationId`,
  // `setFoundationId`, `hasProjectFoundation`. Restore them together with the
  // state and the `Field` below.
  pdfFile, setPdfFile, hasFoundation,
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

        {/* Title-only cards. The bodies explained what each path does at length,
            which the titles already say — and the founder picks one either way. */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PathCard
            active={path === 'page_scrape'}
            onClick={() => setPath('page_scrape')}
            title="Paste a product URL"
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
          />
        </div>

        {/* Asked only when there is a live page, for the same reason. */}
        {path === 'page_scrape' && (
          <Card title="Where does it sell?" hint="This changes what the audit checks, not just how findings are labelled.">
            <Field label="Platform">
              {/* A native <select>. It was a row of pill buttons, which read as a
                  filter rather than as a required single choice — and the roster is
                  a closed two-value literal on the backend, which is exactly the
                  shape a dropdown states. Adding a third platform stays a one-line
                  edit to `PLATFORMS`; nothing here enumerates them. */}
              <div className="relative">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-600 rounded-lg pl-3 pr-9 py-2.5 text-[13.5px] text-navy-900 dark:text-slate-100 outline-none focus:border-meta-600 focus:ring-2 focus:ring-meta-100 dark:focus:ring-meta-500/20 transition cursor-pointer"
                >
                  {PLATFORMS.map(({ key, label }) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-navy-400 dark:text-slate-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>
            </Field>
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

        {/* RETIRED — the typed Foundation-thread field and the "or" divider that
            separated it from the PDF. The Meta Ad screen never asked for one, and
            neither does this: a project session sends its thread id from the prop,
            and the standalone entry has no id a founder could know. Kept for
            restore; uncomment with the `foundationId` state and the
            `hasProjectFoundation` prop, all three together.

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
        */}

        <Card title="Brand blueprint (optional)">
          <Field label="Company Blueprint PDF">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="w-full text-[12.5px] text-navy-700 dark:text-slate-200 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-meta-600 file:text-white file:text-[12.5px] file:cursor-pointer hover:file:bg-meta-700"
            />
          </Field>
        </Card>

        {initError && (
          <div className="mt-5 text-[12.5px] text-danger bg-danger/5 border border-danger/30 rounded-lg px-3 py-2">
            {initError}
          </div>
        )}

        {/* Stages arrive only on the JSON `/init`, which needs a Foundation thread.
            A chosen PDF, or no project behind this screen at all, means the
            multipart entry — and that one carries no webhook config. Same
            condition `handleStart` routes on, kept in step with it. */}
        {initLoading && (
          <IntakeProgress path={path} intake={intake} withWebhooks={!pdfFile && hasFoundation} />
        )}

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
          Live progress isn't available on this route — this stays put until it's done.
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
      {/* Guarded: both cards are title-only now, and an unguarded <p> would still
          lay out its top margin, leaving a taller card padded by nothing. */}
      {body && (
        <p className="mt-1.5 text-[12.5px] text-navy-600 dark:text-slate-400 leading-relaxed">{body}</p>
      )}
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
      {/* The hint carries the gap under the title when there is one. A hintless
          card (the blueprint upload) has to supply it, or its first field label
          sits flush against the heading. */}
      <div className={hint ? undefined : 'mt-3'}>{children}</div>
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
  audit, auditAreas, strategy, scout, content, imageSets, canvasSel, onPickCanvas,
  // Which specialists are working and what each is doing, keyed by tab key. Replaces
  // the single `researching` boolean that used to be forwarded to all four views —
  // see `CanvasEmpty`.
  running,
  // The canvas edit boxes. `onUpdate` is the screen's `sendTurn` — display text
  // and positioned endpoint text — and `busy` disables every box while a turn is
  // already running. Both are destructured for the reason stated below.
  onUpdate, busy,
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
        {/* Each view is handed ITS OWN specialist's state, never the turn's:
            `running[key]` is truthy only while that node is working, and its value
            is that node's live status line. */}
        {canvasSel === 'auditor' ? (
          <AuditView audit={audit} areas={auditAreas} note={running?.auditor} />
        ) : canvasSel === 'scout' ? (
          <ScoutView scout={scout} note={running?.scout} />
        ) : canvasSel === 'strategist' ? (
          <StrategyView strategy={strategy} note={running?.strategist} />
        ) : canvasSel === 'studio' ? (
          <StudioView
            content={content}
            imageSets={imageSets}
            note={running?.studio}
            onUpdate={onUpdate}
            busy={busy}
          />
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

// The empty state every specialist tab shares — idle, or WORKING.
//
// `busy` is now that ONE specialist's own state, never the turn's. A tab says it is
// working only when its own node is running, which is what stops a turn that ran
// the Auditor alone from putting a spinner and "Mapping the competitor field…" on
// the Scout and Strategist tabs at the same time.
//
// `note` is the live line for that specialist — the SSE frame's opener at first,
// refined by each of its own progress webhooks as they land. `progress` is an
// optional extra line a tab can add for something only it knows (the audit's
// "N of 4 areas are in").
function CanvasEmpty({ busy, busyTitle, busyBody, idleTitle, idleBody, note, progress }) {
  return (
    <div className="h-full grid place-items-center p-10 text-center">
      <div className="max-w-[460px]">
        <div
          className={[
            'relative mx-auto h-12 w-12 rounded-2xl grid place-items-center',
            busy ? 'bg-navy-900 text-mint-500' : 'bg-navy-900 text-mint-500',
          ].join(' ')}
        >
          <IconCompass width={22} height={22} />
          {/* The ring rides OUTSIDE the tile rather than replacing the mark, so the
              tab keeps its identity while it works — a spinner alone reads as a
              page that has not decided what it is yet. */}
          {busy && (
            <span className="absolute -inset-1.5 rounded-[18px] border-2 border-transparent border-t-mint-500 border-r-mint-500/40 animate-spin" />
          )}
        </div>

        <div className="mt-4 font-display text-[18px] font-semibold text-navy-900 dark:text-slate-100">
          {busy ? busyTitle : idleTitle}
        </div>
        <p className="mt-1.5 text-[13px] text-navy-600 dark:text-slate-400 leading-relaxed">
          {busy ? busyBody : idleBody}
        </p>

        {/* The live line, only while this specialist is actually working. Dots
            animate so a long step still looks alive when the text has not changed
            for minutes — which the Scout and the Studio both routinely do. */}
        {busy && !isBlank(note) && (
          <div className="mt-4 inline-flex items-start gap-2 rounded-xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-left shadow-card">
            <span className="mt-[3px] h-3.5 w-3.5 shrink-0 rounded-full border-2 border-meta-100 dark:border-slate-600 border-t-meta-600 dark:border-t-meta-500 animate-spin" />
            <span className="text-[12.5px] text-navy-700 dark:text-slate-300 leading-snug">
              {note}
            </span>
          </div>
        )}

        {busy && !isBlank(progress) && (
          <div className="mt-2 text-[11.5px] text-navy-500 dark:text-slate-400">{progress}</div>
        )}
      </div>
    </div>
  );
}

// The strategy — what the page SHOULD say and show. One document, rewritten whole
// every time the Strategist runs, so there is nothing to merge and nothing to
// select inside it.
function StrategyView({ strategy, note }) {
  const html = strategy?.html;

  if (!html) {
    return (
      <CanvasEmpty
        busy={Boolean(note)}
        note={note}
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
function ScoutView({ scout, note }) {
  const html = scout?.html;

  if (!html) {
    return (
      <CanvasEmpty
        busy={Boolean(note)}
        note={note}
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

// =============================================================
// THE PAGE PREVIEW — the Studio's own schema, laid out as the page it describes.
//
// Two renderers, and the split is the SAME one the backend makes with two content
// schemas and two prompts: **Amazon is a fixed FORM**, so its chrome is knowable
// and drawn exactly; **every other storefront is a CANVAS**, so its page is built
// from `blocks` in the order they were written, which IS the page order.
//
// Nothing is generated to do this. Every word comes from `PdpContent` and every
// picture from `PdpImageSets`, which the browser already holds — including the
// bytes, which is why this works at all: a generated picture exists ONLY as a
// `data_uri`, so nothing that had to be authored elsewhere could show one.
//
// **The preview never invents.** A PDP shows a price, a rating and a stock state;
// the Studio writes none of the three and `state.listing` never reaches this
// screen. So those render as inert placeholders that say where the value comes
// from, rather than as plausible numbers — the same rule ADR-0004 puts on the
// audit. Same for a call to action: it is drawn, and it does nothing.
// =============================================================

// =============================================================
// SIMULATED-DESTINATION STYLING
//
// Everything below this line that a preview renders is styled to look like the
// SITE it previews, not like this app. That is a deliberate break from the design
// system, and the values are hardcoded hex rather than palette tokens for exactly
// that reason: a token would follow our brand when it changed, and the whole point
// is that a founder judging their Amazon listing sees Amazon.
//
// Neither preview follows the app's dark mode. Amazon has none, and a storefront
// preview that inverted would stop resembling the page being previewed. `SiteFrame`
// is what makes that read as deliberate — a browser shell around a light rectangle
// says "another site", where a bare light panel in a dark app says "broken".
// =============================================================

// Amazon's own type stack. Ember is theirs and will not resolve here; Arial is what
// Amazon itself falls back to, so the fallback IS the authentic second choice.
const AMZ_FONT = { fontFamily: '"Amazon Ember", Arial, sans-serif' };

// The storefront palette — warm off-white ground, near-black ink, one restrained
// accent. Not our navy/mint: a founder is judging their page, and a page wearing
// our chrome is hard to judge as theirs.
const STORE_FONT = { fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif' };
const STORE_BG = '#FBFAF8';
const STORE_INK = '#16161A';
const STORE_BODY = '#3F3F46';
const STORE_MUTED = '#8A8A94';
const STORE_RULE = '#E6E3DE';
const STORE_ACCENT = '#1F6F5C';

// A browser shell around a previewed page. It is not decoration: it is what tells a
// founder the rectangle is a SIMULATION of their live page rather than another
// panel of this tool, which is what lets the contents abandon the app's styling
// entirely without looking broken.
// NO fake URL bar any more — it read as a search box, and the simulated sites'
// own nav and search went with it. None of that chrome is anything the Studio
// writes, so it was surface a founder could look at but never act on. What is left
// is the minimum that still says "this is your page, not a panel of this tool",
// which is what licenses the contents to abandon the app's styling.
function SiteFrame({ label, children }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-navy-100 dark:border-slate-700 shadow-card bg-white">
      <div className="flex items-center gap-2 px-3.5 py-2 bg-navy-50 dark:bg-slate-800 border-b border-navy-100 dark:border-slate-700">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </span>
        <span className="ml-1 text-[11px] text-navy-500 dark:text-slate-400 truncate">{label}</span>
      </div>
      {children}
    </div>
  );
}

// Amazon's star row. Inert — the Studio writes no rating and `state.listing` never
// reaches this screen, so these are the shape of the thing and never a number.
// RETIRED with Amazon's nav and buy box — the star row lived in the buy column,
// and there was never a rating to put in it (the Studio writes none).
// function Stars() {
//   return (
//     <span className="inline-flex items-center gap-[1px]" aria-hidden="true">
//       {[0, 1, 2, 3, 4].map((i) => (
//         <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="#FFA41C">
//           <path d="M12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z" />
//         </svg>
//       ))}
//     </span>
//   );
// }

// Amazon's hairline section rule.
// RETIRED — Amazon's hairline rule between buy-column sections. `FieldRow` draws
// its own top border, so every field is separated without it.
// function Rule() {
//   return <hr className="my-3" style={{ border: 0, borderTop: '1px solid #E7E7E7' }} />;
// }

// The toggle under a collapsed section. Split out from the sections themselves
// because a table cannot hold it — a <button> as a sibling of <tr> inside <tbody>
// is invalid markup the browser hoists out of the table.
// RETIRED with `AmazonDetailsTable` and `StoreSpecRows`, its only callers. Nothing
// collapses any more — every populated field is shown in full, which is the point.
// function MoreToggle({ open, onToggle, hidden, label, tone = 'amazon' }) {
//   return (
//     <button
//       type="button"
//       onClick={onToggle}
//       className="mt-3 text-[13px] font-medium"
//       style={{ color: tone === 'amazon' ? '#007185' : STORE_INK }}
//     >
//       {open ? 'Show less' : `${label} (${hidden} more)`}
//     </button>
//   );
// }

// Amazon's Product information table, collapsed past ten rows.
//
// This is one of the two genuinely UNBOUNDED lists in the whole preview:
// `other_attributes` is open by design — Amazon publishes a different attribute set
// per product type, hundreds deep — so it can arrive with forty rows and turn the
// section into a wall. The BOUNDED fields are deliberately left alone: five feature
// bullets are five, and collapsing them would hide copy the founder is here to read.
// RETIRED — Amazon's two-column detail table with its collapse. Attributes render
// through `FieldPairs` under their own schema names (CONTEXTUAL ATTRIBUTES /
// OTHER ATTRIBUTES) now, and completeness beat collapsing.
// function AmazonDetailsTable({ details }) {
//   const [open, setOpen] = useState(false);
//   const LIMIT = 10;
//   const rows = open ? details : details.slice(0, LIMIT);
//   return (
//     <>
//       <table className="mt-3 w-full border-collapse">
//         <tbody>
//           {rows.map((p, i) => (
//             <tr key={`${p.name}-${i}`}>
//               <th
//                 className="text-left align-top text-[14px] font-bold py-2 pr-4 w-[38%]"
//                 style={{ background: '#F7F8F8', color: '#0F1111', borderBottom: '1px solid #FFFFFF' }}
//               >
//                 <span className="px-2.5 inline-block">{p.name}</span>
//               </th>
//               <td
//                 className="align-top text-[14px] py-2 px-2.5"
//                 style={{ color: '#0F1111', borderBottom: '1px solid #E7E7E7' }}
//               >
//                 {p.value}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//       {details.length > LIMIT && (
//         <MoreToggle
//           open={open}
//           onToggle={() => setOpen((v) => !v)}
//           hidden={details.length - LIMIT}
//           label="See more product details"
//         />
//       )}
//     </>
//   );
// }

// The edit affordance INSIDE a simulated page. Same behaviour as `UpdateBox` — it
// is that component — but collapsed to a quiet pencil so the page still reads as
// the page. A blue Growvana button in the middle of an Amazon listing would wreck
// the one thing this view exists to do.
function SubtleEdit(props) {
  return <UpdateBox {...props} tone="subtle" />;
}

function EditIcon(props) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

// Per-section "Update" affordance, the Meta Ad screen's `UpdateBox` component
// brought over unchanged in shape: collapsed to a button, opens an instruction
// box, and on send hands `onUpdate` BOTH the founder's words (for the chat) and a
// composed, positioned message (for the endpoint).
//
// `compose` is what makes it worth having. The Studio addresses content by PATH
// and a picture by set + slot, and a founder should never have to type either —
// so each call site composes the addressing from the very keys it is already
// rendering, in the Studio's own vocabulary.
function UpdateBox({ label, placeholder, compose, onUpdate, busy, tone = 'default' }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (!onUpdate) return null;
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onUpdate(t, compose(t));
    setText('');
    setOpen(false);
  };
  if (!open) {
    // `subtle` is the tone used inside a simulated page: a quiet grey pencil that
    // does not fight the page's own styling. `default` is the app's own blue, used
    // in the Fields view and under "Not visible to shoppers", where there is no
    // simulation to protect.
    const subtle = tone === 'subtle';
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        className={
          subtle
            ? 'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-black/10 bg-black/[0.03] text-black/55 hover:bg-black/[0.07] hover:text-black/80 text-[11px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed'
            : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-meta-200 dark:border-slate-600 bg-meta-50 dark:bg-slate-800 text-meta-700 dark:text-slate-200 hover:bg-meta-100 dark:hover:bg-slate-700 text-[11.5px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
        }
      >
        <EditIcon /> {subtle ? `Edit ${label}` : `Update ${label}`}
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-meta-200 dark:border-slate-600 bg-meta-50/60 dark:bg-slate-800/60 p-3">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          if (e.key === 'Escape') { setOpen(false); setText(''); }
        }}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-600 rounded-lg px-3 py-2 text-[13px] text-navy-900 dark:text-slate-100 placeholder:text-navy-400 dark:placeholder:text-slate-500 outline-none focus:border-meta-600 focus:ring-2 focus:ring-meta-100 dark:focus:ring-meta-500/20 transition"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !text.trim()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-meta-600 hover:bg-meta-700 text-white text-[12px] font-medium shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send to agent
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setText(''); }}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-navy-500 dark:text-slate-400 hover:bg-navy-50 dark:hover:bg-slate-800 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Whether a picture is one of the founder's own or one the Studio made. Asked for
// explicitly, and it has to travel with the picture rather than sit in a legend:
// a founder scanning a gallery is deciding which shots still need taking, and a
// generated one they have not approved is the thing they most need to spot.
// `version` rides alongside the source because the two answer different questions
// and a founder needs both at a glance: whether this is their own photograph or one
// the Studio made, and WHICH take of it they are looking at. A regenerated slot
// looks identical to a first take without the number.
function SourceBadge({ source, version, className = '' }) {
  const generated = source === 'generated';
  return (
    <span
      /* Neutral rather than brand-coloured: these sit ON TOP of a simulated Amazon
         or storefront page, and a Growvana blue chip in that corner is the kind of
         detail that stops the page reading as the page. Black/white reads as an
         overlay on any ground. */
      className={[
        'shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm',
        generated ? 'text-white' : 'text-black/75',
        className,
      ].join(' ')}
      style={{
        background: generated ? 'rgba(0,0,0,.72)' : 'rgba(255,255,255,.92)',
        border: `1px solid ${generated ? 'rgba(0,0,0,.72)' : 'rgba(0,0,0,.14)'}`,
      }}
      title={
        generated
          ? 'Made for you by the Studio — not yet a real photograph'
          : "An existing photograph — one the product page already had"
      }
    >
      {generated ? 'AI generated' : 'Existing'}
      {version ? ` · v${version}` : ''}
    </span>
  );
}

// Every picture in a category group, flattened into the order a gallery shows
// them: set order, then slot order. One category legitimately spans several sets
// (one per shape), and a gallery does not care — it shows them all in sequence.
function groupPictures(group) {
  const out = [];
  for (const set of group?.sets || []) {
    for (const slot of set.slots || []) {
      const current = currentVersion(slot);
      const src = versionSrc(current);
      if (src) out.push({ set, slot, current, src, key: `${set.set_key}::${slot.slot_key}` });
    }
  }
  return out;
}

// Which group is the gallery — the pictures that sit at the top of the page.
//
// Categories are FREE TEXT on both sides (the Images area names them, the Studio
// copies the name across), so this matches loosely and falls back to the first
// group. Getting it wrong costs a founder seeing their benefit graphics in the
// hero rail instead of their pack shots; it can never hide a picture, because
// every other group is rendered below in full.
// const GALLERY_CATEGORY_RE = /gallery|main|hero|product\s*shot|primary/i;  (retired with pickGallery)

// RETIRED — it split categories into a hero group and the rest, back when pictures
// rendered in two places. Every picture is in ONE gallery at the top now, so there
// is no hero to pick.
// function pickGallery(groups) {
//   if (!groups?.length) return { gallery: null, rest: [] };
//   const idx = groups.findIndex((g) => GALLERY_CATEGORY_RE.test(g.category));
//   const at = idx >= 0 ? idx : 0;
//   return { gallery: groups[at], rest: groups.filter((_, i) => i !== at) };
// }

// A picture's takes, oldest first, and which one is being previewed. Versions are
// append-only on the backend and numbered from 1, so this sorts rather than
// trusting array order — the webhook and the `done` frame can deliver them in
// different orders.
function slotTakes(slot) {
  return [...(slot?.versions || [])].sort((a, b) => a.version - b.version);
}

// EVERY take of one slot, all on screen at once — the Meta Ad screen's
// `SlotGallery` arrangement, brought over so the two studios read the same way: a
// thumbnail row, a corner badge saying what each one is, and a check on the one
// being previewed.
//
// Shown only when there is more than one, so a slot that was never regenerated
// carries no chrome at all.
//
// **One thing differs from Meta's, and it is a real difference rather than a
// styling choice.** There, the variants are alternatives and picking one is
// picking what to publish. Here versions are APPEND-ONLY and the newest IS the
// page — there is no chosen-version field on the backend to set. So this previews
// and nothing more, and the caption says so instead of implying a choice that
// would not survive the next `done` frame.
function VersionStrip({ takes, at, onPick }) {
  if (takes.length < 2) return null;
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {takes.map((v, i) => {
          const src = versionSrc(v);
          const chosen = i === at;
          const existing = v.source === 'existing';
          return (
            <button
              key={v.version}
              type="button"
              onClick={() => onPick(i)}
              title={v.direction || (existing ? 'Existing photograph' : `Made for you — version ${v.version}`)}
              /* Neutral, like `SourceBadge` and for the same reason: this strip sits
                 inside a simulated page, so it must not wear our brand. */
              className="relative rounded-lg overflow-hidden transition bg-white"
              style={{
                border: chosen ? '2px solid rgba(0,0,0,.8)' : '1px solid rgba(0,0,0,.14)',
                padding: chosen ? 0 : '1px',
              }}
            >
              {src ? (
                <img src={src} alt="" loading="lazy" className="block h-14 w-14 object-cover" />
              ) : (
                <div className="h-14 w-14 grid place-items-center text-[10px] text-black/40">
                  no preview
                </div>
              )}
              <span
                className="absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-semibold leading-none text-white"
                style={{ background: existing ? 'rgba(0,0,0,.62)' : 'rgba(0,0,0,.82)' }}
              >
                {existing ? 'Existing' : `v${v.version}`}
              </span>
              {chosen && (
                <span
                  className="absolute top-1 right-1 h-4 w-4 grid place-items-center rounded-full text-white"
                  style={{ background: 'rgba(0,0,0,.82)' }}
                >
                  <IconCheck width={10} height={10} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 text-[11px] text-black/50">
        {takes.length} takes — the newest is what the page shows. Ask for an earlier one back if
        you prefer it.
      </div>
    </div>
  );
}

// EVERY picture on the thread, flattened in category order then set order then
// slot order — ONE gallery at the TOP of the page and nothing below.
//
// It used to be a hero gallery plus per-category bands further down, which put
// pictures in two places and left the lower ones stranded under whatever section
// happened to precede them. A founder judges an image set by seeing it together.
function allPictures(groups) {
  return (groups || []).flatMap((g) => groupPictures(g));
}

// The gallery: a scrolling thumbnail rail beside one large stage.
//
// **Every take is shown by default.** The lineage is the point of keeping versions
// append-only, and a founder deciding whether a regenerated picture beat the one it
// replaced should not have to discover a click to compare them. It costs nothing on
// a single-take slot, where `VersionStrip` renders nothing at all — so the strip is
// only ever on screen when there is genuinely something to compare.
//
// The toggle stays, to collapse a long lineage out of the way; it just starts open
// rather than closed.
function AllImagesGallery({ groups, onUpdate, busy, variant = 'amazon' }) {
  const amz = variant === 'amazon';
  const pictures = allPictures(groups);
  const [at, setAt] = useState(0);
  // Which take of each picture is on show, keyed by `set::slot`. Per picture rather
  // than one shared index: slots have different version counts, so a single index
  // would jump around as the founder moves along the rail.
  const [verAt, setVerAt] = useState({});
  const [openTakes, setOpenTakes] = useState(true);

  if (!pictures.length) {
    return (
      <div
        className="aspect-[4/3] grid place-items-center rounded-[8px]"
        style={{ border: `1px dashed ${amz ? '#D5D9D9' : STORE_RULE}` }}
      >
        <span className="text-[12px]" style={{ color: amz ? '#565959' : STORE_MUTED }}>
          No pictures yet
        </span>
      </div>
    );
  }

  const idx = Math.min(at, pictures.length - 1);
  const active = pictures[idx];
  const takes = slotTakes(active.slot);
  const verIdx =
    verAt[active.key] != null ? Math.min(verAt[active.key], takes.length - 1) : takes.length - 1;
  const shown = takes[verIdx] || active.current;
  const shownSrc = versionSrc(shown) || active.src;

  // Moving along the rail no longer collapses the strip. It did while the strip
  // started closed — reopening on every picture would have fought the default —
  // but now that it starts open, closing it on a rail click would hide the takes
  // the founder just moved to a picture to see.
  const pick = (i) => setAt(i);

  return (
    <div className="flex gap-3 flex-col-reverse sm:flex-row">
      {/* The rail is height-capped and scrolls. A thread routinely carries a dozen
          or more pictures, and an uncapped rail made the whole page as tall as the
          image count — which is what left screens of white beside the content. */}
      <div className="flex gap-2 shrink-0 flex-row sm:flex-col overflow-x-auto sm:overflow-y-auto sm:max-h-[420px] thin-scroll pr-0.5">
        {pictures.map((p, i) => {
          const t = slotTakes(p.slot);
          const cur = p.current;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => pick(i)}
              aria-label={cur?.alt_text || p.slot.label || `Picture ${i + 1}`}
              className={[
                'relative shrink-0 overflow-hidden transition bg-white',
                amz ? 'h-[52px] w-[52px] rounded-[8px]' : 'h-[58px] w-[58px] rounded-[10px]',
              ].join(' ')}
              style={
                i === idx
                  ? amz
                    ? { border: '2px solid #E77600', boxShadow: '0 0 3px 2px rgba(228,121,17,.5)' }
                    : { border: `2px solid ${STORE_INK}` }
                  : { border: `1px solid ${amz ? '#D5D9D9' : STORE_RULE}` }
              }
            >
              <img src={p.src} alt="" loading="lazy" className="h-full w-full object-cover" />
              {/* Source AND version on every thumbnail. Both were asked for and both
                  earn the space: source says whether a founder is looking at their
                  own photograph or one the Studio made, version says which take —
                  and a regenerated slot looks identical to a first take without it. */}
              <span
                className="absolute bottom-0 inset-x-0 text-[8px] font-semibold leading-[12px] text-center text-white"
                style={{ background: 'rgba(0,0,0,.66)' }}
              >
                {cur?.source === 'generated' ? 'AI' : 'Existing'}
                {t.length > 1 || cur?.source === 'generated' ? ` v${cur?.version ?? 1}` : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative flex-1 min-w-0">
        <button
          type="button"
          onClick={() => takes.length > 1 && setOpenTakes((v) => !v)}
          title={takes.length > 1 ? 'Show this picture’s other takes' : undefined}
          className={[
            'block w-full overflow-hidden bg-white',
            amz ? 'rounded-[4px]' : 'rounded-[14px]',
            takes.length > 1 ? 'cursor-pointer' : 'cursor-default',
          ].join(' ')}
          style={{ border: `1px solid ${amz ? '#E7E7E7' : STORE_RULE}` }}
        >
          <img
            src={shownSrc}
            /* The published line, so it is the real alt rather than an empty one. */
            alt={shown?.alt_text || active.slot.label || ''}
            className="w-full max-h-[420px] object-contain"
          />
        </button>

        <div className="absolute top-2 right-2">
          <SourceBadge source={shown?.source} version={shown?.version} />
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {!isBlank(active.slot.label) && (
            <span className="text-[12px]" style={{ color: amz ? '#565959' : STORE_MUTED }}>
              {active.slot.label}
            </span>
          )}
          {takes.length > 1 && (
            <button
              type="button"
              onClick={() => setOpenTakes((v) => !v)}
              className="text-[12px] font-medium underline underline-offset-2"
              style={{ color: amz ? '#007185' : STORE_INK }}
            >
              {openTakes ? 'Hide takes' : `${takes.length} takes`}
            </button>
          )}
        </div>

        {openTakes && (
          <VersionStrip
            takes={takes}
            at={verIdx}
            onPick={(i) => setVerAt((prev) => ({ ...prev, [active.key]: i }))}
          />
        )}

        {/* Addressed by set + slot, which IS `PdpImageRef` — the same two strings
            `generate_pdp_images` takes. The founder types the change; the handle
            comes from the picture they are looking at. */}
        <div className="mt-2">
          <SubtleEdit
            label="this picture"
            placeholder="e.g. brighter background, show it in a hand for scale, no text on the image…"
            onUpdate={onUpdate}
            busy={busy}
            compose={(instr) =>
              `Regenerate the picture in image set "${active.set.set_key}", slot "${active.slot.slot_key}"` +
              `${shown?.version ? ` (from version ${shown.version})` : ''}: ${instr}`
            }
          />
        </div>
      </div>
    </div>
  );
}

// A field's name, as the founder sees it: the SCHEMA's own name, humanised and
// upper-cased — `a_plus_modules` → "A PLUS MODULES".
//
// Showing the schema name rather than a friendly rewrite is deliberate. This view
// has to account for the artifact completely, and a founder comparing it against
// what the Studio holds needs the two to use the same word. It is also the name the
// edit box quotes back, so what is on screen and what is sent match.
function FieldLabel({ name, variant = 'amazon' }) {
  const amz = variant === 'amazon';
  return (
    <div
      className="text-[11px] font-bold uppercase tracking-[0.09em]"
      style={{ color: amz ? '#565959' : STORE_MUTED }}
    >
      {String(name).replace(/_/g, ' ')}
    </div>
  );
}

// One field of the artifact: its name, then its value. Rendered for EVERY populated
// field — the roster below is the schema's, in schema order — and skipped entirely
// when the value is empty. Nothing is summarised away.
function FieldRow({ name, variant = 'amazon', children, edit }) {
  const amz = variant === 'amazon';
  return (
    <section
      className="py-4"
      style={{ borderTop: `1px solid ${amz ? '#E7E7E7' : STORE_RULE}` }}
    >
      <FieldLabel name={name} variant={variant} />
      <div className="mt-2">{children}</div>
      {edit && <div className="mt-2.5">{edit}</div>}
    </section>
  );
}

// Prose inside a field. Preserves the founder's own line breaks.
function FieldText({ value, variant = 'amazon' }) {
  const amz = variant === 'amazon';
  return (
    <div
      className={amz ? 'text-[14px] leading-[21px] whitespace-pre-wrap break-words' : 'text-[15px] leading-[1.7] whitespace-pre-wrap break-words'}
      style={{ color: amz ? '#0F1111' : STORE_BODY }}
    >
      {value}
    </div>
  );
}

// A list inside a field.
function FieldList({ items, variant = 'amazon' }) {
  const amz = variant === 'amazon';
  return (
    <ul className="pl-[18px] space-y-2" style={{ listStyle: 'disc' }}>
      {items.map((v, i) => (
        <li
          key={i}
          className={amz ? 'text-[14px] leading-[21px] break-words' : 'text-[15px] leading-[1.7] break-words'}
          style={{ color: amz ? '#0F1111' : STORE_BODY }}
        >
          {v}
        </li>
      ))}
    </ul>
  );
}

// Name/value rows inside a field — an attribute set, a spec table, an FAQ. The NAME
// is the founder's own (or the schema's, for a typed attribute), so it is shown as
// written rather than upper-cased like a field label.
function FieldPairs({ pairs, variant = 'amazon' }) {
  const amz = variant === 'amazon';
  return (
    <dl className="grid gap-y-2">
      {pairs.map((p, i) => (
        <div key={`${p.name}-${i}`} className="grid grid-cols-[minmax(0,220px)_1fr] gap-4 items-start">
          <dt
            className="text-[12.5px] font-semibold break-words"
            style={{ color: amz ? '#565959' : STORE_MUTED }}
          >
            {p.name}
          </dt>
          <dd
            className={amz ? 'text-[14px] leading-[20px] break-words' : 'text-[15px] leading-[1.6] break-words'}
            style={{ color: amz ? '#0F1111' : STORE_INK }}
          >
            {p.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// AMAZON — every field of `AmazonPdpContent`, in schema order, each under its own
// schema name, with all of the pictures above it.
//
// **Completeness is the contract here.** A populated field always appears and an
// empty one never does; nothing is folded into a friendlier section heading, and no
// nested value is summarised. `a_plus_modules` shows as A PLUS MODULES and each
// module shows MODULE TYPE / HEADING / BODY; `contextual_attributes` shows every
// sub-field that has values, under its own name.
//
// It keeps Amazon's colours and type — `#0F1111` ink, `#565959` labels, the
// Ember→Arial stack — so the page still reads as the destination. What it no longer
// carries is Amazon's nav, search bar and buy box: none of them is anything the
// Studio writes, so they were chrome the founder could not act on.
function AmazonPagePreview({ amazon, groups, onUpdate, busy }) {
  const editField = (name) => (instr) =>
    `Update the Amazon listing content at "${name}": ${instr}`;

  const attrs = amazon.contextual_attributes || {};
  const contextual = Object.entries(attrs).filter(([, v]) => Array.isArray(v) && v.length);
  const modules = amazon.a_plus_modules || [];

  const box = (name, node, editName = name) =>
    node == null ? null : (
      <FieldRow
        name={name}
        variant="amazon"
        edit={
          <SubtleEdit
            label={String(name).replace(/_/g, ' ')}
            placeholder="Say what to change about this field…"
            onUpdate={onUpdate}
            busy={busy}
            compose={editField(editName)}
          />
        }
      >
        {node}
      </FieldRow>
    );

  return (
    <SiteFrame label="Amazon listing">
      <div style={AMZ_FONT} className="bg-white px-5 py-5">
        <AllImagesGallery groups={groups} variant="amazon" onUpdate={onUpdate} busy={busy} />

        <div className="mt-6">
          {box(
            'title',
            isBlank(amazon.title) ? null : (
              <h1 className="text-[22px] leading-[28px] font-normal break-words" style={{ color: '#0F1111' }}>
                {amazon.title}
              </h1>
            ),
          )}

          {box(
            'item_highlights',
            isBlank(amazon.item_highlights) ? null : (
              <FieldText value={amazon.item_highlights} variant="amazon" />
            ),
          )}

          {box(
            'bullet_points',
            amazon.bullet_points?.length ? (
              <FieldList items={amazon.bullet_points} variant="amazon" />
            ) : null,
          )}

          {box(
            'product_description',
            isBlank(amazon.product_description) ? null : (
              <FieldText value={amazon.product_description} variant="amazon" />
            ),
          )}

          {box(
            'a_plus_modules',
            modules.length ? (
              <div className="space-y-4">
                {modules.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-[6px] p-3"
                    style={{ border: '1px solid #E7E7E7', background: '#F7F8F8' }}
                  >
                    <div className="text-[11px] font-bold" style={{ color: '#565959' }}>
                      MODULE {i + 1}
                    </div>
                    <div className="mt-2 grid gap-2">
                      {!isBlank(m.module_type) && (
                        <div>
                          <FieldLabel name="module_type" variant="amazon" />
                          <FieldText value={m.module_type} variant="amazon" />
                        </div>
                      )}
                      {!isBlank(m.heading) && (
                        <div>
                          <FieldLabel name="heading" variant="amazon" />
                          <FieldText value={m.heading} variant="amazon" />
                        </div>
                      )}
                      {!isBlank(m.body) && (
                        <div>
                          <FieldLabel name="body" variant="amazon" />
                          <FieldText value={m.body} variant="amazon" />
                        </div>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <SubtleEdit
                        label={`module ${i + 1}`}
                        placeholder="e.g. shorter heading, lead with the problem, cut the last sentence…"
                        onUpdate={onUpdate}
                        busy={busy}
                        compose={(instr) =>
                          `Update A+ module ${i + 1}${m.heading ? ` ("${m.heading}")` : ''} in the Amazon listing content, at path ["a_plus_modules", "${i}"]: ${instr}`
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null,
          )}

          {box(
            'a_plus_tier_note',
            isBlank(amazon.a_plus_tier_note) ? null : (
              <FieldText value={amazon.a_plus_tier_note} variant="amazon" />
            ),
          )}

          {box(
            'backend_search_terms',
            isBlank(amazon.backend_search_terms) ? null : (
              <div className="text-[13px] font-mono leading-[20px] break-words" style={{ color: '#0F1111' }}>
                {amazon.backend_search_terms}
              </div>
            ),
          )}

          {box(
            'contextual_attributes',
            contextual.length ? (
              <div className="grid gap-3">
                {contextual.map(([name, values]) => (
                  <div key={name}>
                    <FieldLabel name={name} variant="amazon" />
                    <FieldList items={values} variant="amazon" />
                  </div>
                ))}
              </div>
            ) : null,
          )}

          {box(
            'other_attributes',
            amazon.other_attributes?.length ? (
              <FieldPairs pairs={amazon.other_attributes} variant="amazon" />
            ) : null,
          )}
        </div>
      </div>
    </SiteFrame>
  );
}

// The markup layer. A page carries it, a shopper never sees it — but it is still a
// field of the artifact, so it renders like every other one rather than being
// hidden. Kept as a named set because the storefront schema is OPEN and this is the
// only block whose meaning is fixed.
// RETIRED — it lifted the metadata layer out of the page body, back when the
// preview simulated what a SHOPPER sees. The brief changed: every populated field
// of the artifact is shown, in schema order, under its own name — so the metadata
// block renders like any other block rather than being moved somewhere special.
//
// const SELLER_ONLY_FIELDS = new Set(['metadata', 'meta', 'seo_metadata', 'structured_data']);

// A block rendered as a field: its own `field` name upper-cased as the label, then
// its value in whichever of the four shapes its `kind` names. Recurses on 'dict',
// because 'dict' is still the only kind that nests and the depth is still the
// model's to choose.
//
// **The `label` the model wrote is shown too when it differs from the field name** —
// that is the heading a buyer would read, and it is content rather than plumbing.
function PageSection({ block, depth = 0, onUpdate, busy, compose, variant = 'store' }) {
  if (!block) return null;
  const amz = variant === 'amazon';
  const showLabel = !isBlank(block.label) && humanize(block.field).toLowerCase() !== block.label.toLowerCase();

  const body = (
    <>
      {showLabel && (
        <div
          className={depth === 0 ? 'text-[17px] font-semibold mb-2' : 'text-[14px] font-semibold mb-1.5'}
          style={{ color: amz ? '#0F1111' : STORE_INK }}
        >
          {block.label}
        </div>
      )}

      {block.kind === 'str' && !isBlank(block.text) && (
        <div
          className="text-[15px] leading-[1.7] max-w-[70ch]"
          style={{ color: amz ? '#0F1111' : STORE_BODY }}
        >
          <Markdown text={block.text} plain />
        </div>
      )}

      {block.kind === 'list' && !!block.items?.length && (
        <FieldList items={block.items} variant={variant} />
      )}

      {block.kind === 'pairs' && !!block.pairs?.length && (
        <FieldPairs pairs={block.pairs} variant={variant} />
      )}

      {block.kind === 'dict' &&
        (block.blocks || []).map((child, i) => (
          <div key={`${child.field}-${i}`} className="mt-4 pl-3" style={{ borderLeft: `2px solid ${STORE_RULE}` }}>
            <FieldLabel name={child.field} variant={variant} />
            <div className="mt-1.5">
              <PageSection block={child} depth={depth + 1} variant={variant} />
            </div>
          </div>
        ))}
    </>
  );

  // A nested block is wrapped by its parent, which already drew its label and rule.
  if (depth > 0) return body;

  return (
    <FieldRow
      name={block.field}
      variant={variant}
      edit={
        compose ? (
          <SubtleEdit
            label={humanize(block.field)}
            placeholder="e.g. shorter, answer the returns question here, add the size a buyer asks about…"
            onUpdate={onUpdate}
            busy={busy}
            compose={compose}
          />
        ) : null
      }
    >
      {body}
    </FieldRow>
  );
}

// EVERY OTHER STOREFRONT — every block the Studio wrote, in `blocks` order, each
// under its own `field` name, with all of the pictures above them.
//
// `blocks` IS the page order and there is no second ordering to disagree with it,
// so nothing is lifted out or reordered any more: the above-the-fold roster and the
// buy column are gone with the buy box, and the metadata block renders in place
// like every other field. Completeness is the contract, exactly as on the Amazon
// side — a populated block always appears, an empty one never does.
function StorefrontPagePreview({ generic, groups, onUpdate, busy }) {
  const blocks = generic.blocks || [];
  // A generic path is OPEN — validated only by resolution — so the `field` handle
  // is what the Studio needs to find the block. It is stable across turns by
  // design, which is exactly why it is the thing to quote.
  const editBlock = (block) => (instr) =>
    `Update the "${block.field}" block${block.label ? ` (${block.label})` : ''} on the product page content: ${instr}`;

  return (
    <SiteFrame label="Storefront product page">
      <div style={{ ...STORE_FONT, background: STORE_BG }} className="px-6 py-6">
        <AllImagesGallery groups={groups} variant="store" onUpdate={onUpdate} busy={busy} />

        <div className="mt-6">
          {blocks.map((block, i) => (
            <PageSection
              key={`${block.field}-${i}`}
              block={block}
              variant="store"
              onUpdate={onUpdate}
              busy={busy}
              compose={editBlock(block)}
            />
          ))}
        </div>
      </div>
    </SiteFrame>
  );
}

function StudioView({ content, imageSets, note, onUpdate, busy }) {
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
  const [mode, setMode] = useState('page'); // 'page' | 'fields'

  if (!page && !pictureCount) {
    return (
      <CanvasEmpty
        busy={Boolean(note)}
        note={note}
        busyTitle="Building your page…"
        busyBody="It writes the words first, then makes the pictures. Images take a few minutes."
        idleTitle="Nothing built yet"
        idleBody="Ask in the chat for your page to be written, or for the photos it still needs. The Studio produces what you publish — the audit says what is wrong, the strategy says what to change, this makes it."
      />
    );
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12.5px] text-navy-600 dark:text-slate-400 leading-relaxed max-w-[640px]">
          {content?.amazon
            ? 'Amazon fixes which fields exist, so this fills them — shown as the listing a shopper would see. Switch to Fields to copy each one into Seller Central.'
            : 'Your storefront lets you choose the sections, so this proposes them in order — shown as the page they build. Switch to Fields to copy them out.'}
        </p>
        <div className="flex rounded-lg border border-navy-100 dark:border-slate-600 overflow-hidden shrink-0">
          {[
            { key: 'page', label: 'Page' },
            { key: 'fields', label: 'Fields' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMode(t.key)}
              className={[
                'px-3 py-1.5 text-[12.5px] font-medium transition',
                mode === t.key
                  ? 'bg-meta-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-navy-700 dark:text-slate-200 hover:bg-mist dark:hover:bg-slate-700',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* THE PAGE. Content and pictures together, because that is what a page is —
          the two artifacts are independent on the backend, and this view is the one
          place a founder gets to see them as the single thing they publish. */}
      {mode === 'page' &&
        (content?.amazon ? (
          <AmazonPagePreview amazon={content.amazon} groups={groups} onUpdate={onUpdate} busy={busy} />
        ) : content?.generic ? (
          <StorefrontPagePreview generic={content.generic} groups={groups} onUpdate={onUpdate} busy={busy} />
        ) : (
          /* Pictures with no words yet — a real state, since the two artifacts land
             independently. Show the gallery rather than an empty page. */
          <div className="rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-5">
            <div className="font-display text-[15px] font-semibold text-navy-900 dark:text-slate-100">
              Pictures so far
            </div>
            <p className="mt-1 text-[12.5px] text-navy-600 dark:text-slate-400">
              No copy has been written yet, so there is no page to lay out. Ask for the words in
              the chat.
            </p>
            <div className="mt-4">
              <AllImagesGallery groups={groups} variant="store" onUpdate={onUpdate} busy={busy} />
            </div>
          </div>
        ))}

      {mode === 'fields' && page && (
        <div className="rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-5">
          <div className="font-display text-[17px] font-semibold text-navy-900 dark:text-slate-100">
            Your page, written
          </div>
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

      {mode === 'fields' && !!pictureCount && (
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
                      setKey={set.set_key}
                      onUpdate={onUpdate}
                      busy={busy}
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
function AuditView({ audit, areas, note }) {
  const html = audit?.html;

  if (!html) {
    const seen = areas?.size || 0;
    return (
      <CanvasEmpty
        busy={Boolean(note)}
        note={note}
        busyTitle="Auditing your page…"
        busyBody="Each area lands on its own — they finish at very different times, and the report is composed once they land."
        // The one thing only this tab knows. It stays a separate line from `note`
        // so the live webhook line ("SEO is ready") and the count sit side by side
        // instead of one overwriting the other.
        progress={
          seen ? `${seen} of ${AUDIT_AREAS.length} areas are in.` : null
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
// `plain` drops the app's colour and size so the CALLER's cascade wins. It exists
// for the simulated pages: those are light-only by design, and `dark:text-slate-200`
// would paint their body copy light-on-warm-white the moment the app is in dark
// mode. (`prose`/`dark:prose-invert` are inert here — @tailwindcss/typography is not
// installed — so the colour class was the whole of the problem.)
function Markdown({ text, plain = false }) {
  if (!text) return null;
  return (
    <div
      className={
        plain
          ? 'max-w-none'
          : 'prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed text-navy-800 dark:text-slate-200'
      }
    >
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
