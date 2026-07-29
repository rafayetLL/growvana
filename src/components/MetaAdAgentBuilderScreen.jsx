import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Composer from './Composer.jsx';
import GapQuestions from './GapQuestions.jsx';
import { ChatMessageItem } from './MessageRenderers.jsx';
import { initMetaAdAgent, initMetaAdAgentWithPdf, streamMetaAdAgent } from '../lib/metaAdAgentApi.js';
import { buildWebhookRequest, subscribeProgress } from '../lib/webhookBus.js';
import {
  IconArrowLeft,
  IconTarget,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconPlus,
} from './icons.jsx';

// Inter is the reference shell's primary face; Fraunces for display, JetBrains for numbers.
const UI_FONT = { fontFamily: "'Inter', system-ui, sans-serif" };

function newTaskId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'task-' + Math.random().toString(36).slice(2, 10);
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

const money = (v) => (v == null ? '—' : `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
const pct = (v) => (v == null ? '—' : `${Number(v).toFixed(2)}%`);

// Loader copy per specialist agent (matches the `*_drafting` SSE events).
const DRAFTING_LABELS = {
  ad_diagnosis: 'Diagnosing your ads',
  competitor_lens: 'Reading the competitor landscape',
  strategy: 'Building your strategy',
  creative: 'Drafting the campaign & ads',
};

// Canvas tab labels, in arc order: diagnosis → competitor lens → strategy → creative.
const ARTIFACT_LABELS = {
  diagnosis: 'Ad Diagnosis',
  competitor_lens: 'Competitor Lens',
  strategy: 'Strategy',
  creative: 'Ad Creative',
};

// Topbar stepper, short labels, arc order.
const STEPS = [
  ['diagnosis', 'Ad Diagnosis'],
  ['competitor_lens', 'Competitor Lens'],
  ['strategy', 'Strategy'],
  ['creative', 'Creative'],
];
const DRAFTING_TO_STEP = {
  ad_diagnosis: 'diagnosis',
  competitor_lens: 'competitor_lens',
  strategy: 'strategy',
  creative: 'creative',
};

// The diagnosis payload is a uniform list: [{ad_id, ad_name, diagnosis_html}].
// The "combined" entry (ad_id === 'combined') is the account-wide roll-up — present
// only for ≥2 selected ads or the create/account-wide path. A single selected ad is
// its own lone entry (no combined). The canvas lists per-ad docs FIRST and the
// combined roll-up LAST, and defaults to the first per-ad doc (never combined unless
// combined is the only doc present).
const COMBINED_ID = 'combined';

// --- Meta ad-account tabs (client-side only) -------------------------------
// The backend resolves the ad account from the synced Stage-1 cache by
// tenant_id, so the ad-account id and Graph token are NEVER sent to it. The
// setup screen shows one TAB per configured account; picking a tab sends ONLY
// that account's tenant_id + account_id. Credentials live ONLY in .env
// (gitignored). Add a tenant by setting VITE_ACCOUNT<N>_{AAID,TOKEN,TENANT_ID,
// LABEL?} and copying an ACCOUNT_SLOTS row below.
const ACCOUNT_SLOTS = [
  {
    label: 'Liberate',
    aaid: import.meta.env.VITE_LIBERATE_AAID,
    token: import.meta.env.VITE_LIBERATE_TOKEN,
    tenant_id: import.meta.env.VITE_LIBERATE_TENANT_ID,
  },
  {
    label: import.meta.env.VITE_ACCOUNT2_LABEL || 'Account 2',
    aaid: import.meta.env.VITE_ACCOUNT2_AAID,
    token: import.meta.env.VITE_ACCOUNT2_TOKEN,
    tenant_id: import.meta.env.VITE_ACCOUNT2_TENANT_ID,
  },
  {
    label: import.meta.env.VITE_ACCOUNT3_LABEL || 'Account 3',
    aaid: import.meta.env.VITE_ACCOUNT3_AAID,
    token: import.meta.env.VITE_ACCOUNT3_TOKEN,
    tenant_id: import.meta.env.VITE_ACCOUNT3_TENANT_ID,
  },
  // Add more: copy the block above as VITE_ACCOUNT4_*, VITE_ACCOUNT5_*, …
];
// Only fully-configured accounts get a tab.
const ACCOUNTS = ACCOUNT_SLOTS.filter((a) => a.aaid && a.token && a.tenant_id);
// The "No account" tab: init with NEITHER tenant_id nor account_id (the backend
// takes them as an optional PAIR). Create path only — tune has no ads to pick —
// and the Blueprint PDF becomes REQUIRED (it is the only brand-context source).
const NO_ACCOUNT_TAB = { label: 'No account · PDF only', noAccount: true };
const ACCOUNT_TABS = [...ACCOUNTS, NO_ACCOUNT_TAB];
// Typed-credential gate RETIRED in favor of the account tabs — kept for restore.
// const ACCOUNT_MISMATCH_MSG =
//   "Those credentials don't match a connected ad account. Double-check your ad-account ID and access token, then try again.";

// Order docs so the account-wide "combined" roll-up sorts to the END — per-ad docs
// lead, combined comes last. Stable: per-ad docs keep their incoming order.
function orderDocs(docs) {
  if (!docs) return [];
  return [...docs].sort(
    (a, b) => (a.ad_id === COMBINED_ID ? 1 : 0) - (b.ad_id === COMBINED_ID ? 1 : 0)
  );
}
function defaultDiagnosisSel(diagnoses) {
  if (!diagnoses || !diagnoses.length) return '';
  // First per-ad doc (combined sorts last) — never default to the combined view
  // unless combined is the only doc present.
  return orderDocs(diagnoses)[0].ad_id;
}
function diagnosisOptionLabel(d) {
  return d.ad_id === COMBINED_ID ? 'Combined · account-wide' : (d.ad_name || d.ad_id);
}

// ---------------------------------------------------------------------------
// Granular meta-ad webhook merge helpers. The backend streams each artifact as it
// lands (a diagnosis/strategy doc as each generates, a creative ad/image as each
// finishes, the campaign+ad set / an edit batch as one `structure` payload); these
// fold each incoming piece into the screen's state IMMUTABLY (new objects so React
// re-renders). The SSE `done` frame remains authoritative and re-sets everything at
// end-of-turn, so a missed webhook is always backfilled.
// ---------------------------------------------------------------------------

// Upsert a diagnosis / strategy doc into its list by ad_id (the real ad id on tune,
// or 'combined'). Replaces an existing doc in place, else appends.
function upsertDoc(list, doc) {
  const arr = list || [];
  const i = arr.findIndex((d) => d.ad_id === doc.ad_id);
  if (i === -1) return [...arr, doc];
  const next = [...arr];
  next[i] = doc;
  return next;
}

// A shallow, mutation-safe copy of the creative tree (campaigns → adsets → ads),
// so each merge returns a fresh object graph without touching the previous one.
function cloneTree(tree) {
  const campaigns = (tree?.campaigns || []).map((g) => ({
    ...g,
    adsets: (g.adsets || []).map((a) => ({ ...a, ads: [...(a.ads || [])] })),
  }));
  return { campaigns };
}

// The campaign group index for a campaign_id. On tune, MATCH BY REAL ID — and return
// -1 when it isn't in the tree yet, so the caller creates a NEW group (selected ads
// can span several campaigns; never fold a second campaign into the first). Only the
// create path (null id → one implicit campaign group) falls back to index 0.
function campaignGroupIdx(campaigns, campaignId) {
  if (campaignId) {
    return campaigns.findIndex((g) => g.campaign?.campaign_id === campaignId);
  }
  return campaigns.length ? 0 : -1;
}

// A campaign / ad-set node in an incoming partial tree is a real object when it
// carries its defining fields, or a bare `{campaign_id}` / `{adset_id}` LOCATOR
// (present only to place a child — the full object rode `.structure` / `done`).
function hasRealCampaign(c) {
  return !!c && (c.name != null || c.objective != null);
}
function hasRealAdset(a) {
  return !!a && (a.name != null || a.optimization_goal != null);
}
// An ad from the `.image` fragment carries only `key` + `image_slots` (no `name`),
// so its slots MERGE into the existing ad; a full ad (from `.ad` / `.structure`)
// carries `name` and REPLACES the ad wholesale.
function isImageFragmentAd(ad) {
  return !!ad && ad.name == null && Array.isArray(ad.image_slots);
}

// Locate an ad anywhere in the tree by `key` (real ad id on tune, index on create).
function locateAdInTree(tree, key) {
  for (const g of tree.campaigns) {
    for (const asg of g.adsets) {
      const idx = asg.ads.findIndex((x) => x.key === key);
      if (idx !== -1) return { asg, idx };
    }
  }
  return null;
}

// Merge an `.image` fragment's image_slots into an existing ad — append / replace a
// variant in its ad → slot → aspect-lane, keyed by slot_key / aspect_ratio / variant_key
// (creating the slot + lane if new). Never touches copy pools.
function mergeImageSlots(ad, incomingSlots) {
  const slots = (ad.image_slots || []).map((s) => ({
    ...s,
    aspects: (s.aspects || []).map((asp) => ({ ...asp, variants: [...(asp.variants || [])] })),
  }));
  for (const inSlot of incomingSlots || []) {
    let slot = slots.find((s) => s.slot_key === inSlot.slot_key);
    if (!slot) {
      slot = { slot_key: inSlot.slot_key, aspects: [] };
      slots.push(slot);
    }
    for (const inAsp of inSlot.aspects || []) {
      let lane = slot.aspects.find((asp) => asp.aspect_ratio === inAsp.aspect_ratio);
      if (!lane) {
        lane = { aspect_ratio: inAsp.aspect_ratio, variants: [] };
        slot.aspects.push(lane);
      }
      for (const v of inAsp.variants || []) {
        const vi = lane.variants.findIndex((x) => x.variant_key === v.variant_key);
        if (vi === -1) lane.variants.push(v);
        else lane.variants[vi] = v;
      }
    }
  }
  return { ...ad, image_slots: slots };
}

// Fold ONE partial `{campaigns:[...]}` tree (the `done` frame's value shape) into the
// creative tree — the single merge for every `meta_ad.creative.*` webhook (structure /
// ad / image). Campaign + ad-set objects merge by real Meta id (the single group on
// create); an ad REPLACES by `key` (or is inserted), except an image-only fragment
// which merges its variants in. The SSE `done` frame stays authoritative and replaces
// the whole tree at end-of-turn, so a missed webhook is always backfilled.
function mergeCreativeTree(prev, incomingCampaigns) {
  const next = cloneTree(prev);
  for (const inCg of incomingCampaigns || []) {
    const cid = inCg.campaign?.campaign_id || null;
    let gi = campaignGroupIdx(next.campaigns, cid);
    if (gi === -1) {
      // New group — keep whatever came in (a real campaign, or a bare `{campaign_id}`
      // locator so a later real-campaign webhook matches by id and merges in).
      next.campaigns.push({ campaign: inCg.campaign ?? null, adsets: [] });
      gi = next.campaigns.length - 1;
    } else if (hasRealCampaign(inCg.campaign)) {
      // Existing group — only a REAL campaign overwrites; a locator never wipes it.
      next.campaigns[gi] = { ...next.campaigns[gi], campaign: inCg.campaign };
    }
    const grp = next.campaigns[gi];
    for (const inAsg of inCg.adsets || []) {
      const sid = inAsg.adset?.adset_id || null;
      let ai = sid
        ? grp.adsets.findIndex((a) => a.adset?.adset_id === sid)
        : grp.adsets.length
          ? 0
          : -1;
      if (ai === -1) {
        grp.adsets.push({ adset: inAsg.adset ?? null, ads: [] });
        ai = grp.adsets.length - 1;
      } else if (hasRealAdset(inAsg.adset)) {
        grp.adsets[ai] = { ...grp.adsets[ai], adset: inAsg.adset };
      }
      const asg = grp.adsets[ai];
      for (const inAd of inAsg.ads || []) {
        const found = locateAdInTree(next, inAd.key);
        if (isImageFragmentAd(inAd)) {
          if (found) found.asg.ads[found.idx] = mergeImageSlots(found.asg.ads[found.idx], inAd.image_slots);
        } else if (found) {
          found.asg.ads[found.idx] = inAd;
        } else {
          asg.ads.push(inAd);
        }
      }
    }
  }
  return next;
}

export default function MetaAdAgentBuilderScreen({
  threadId,
  isActive = true,
  onBack,
  onSelectView,
  projectName,
  onNewProject,
  // Standalone entry (picked from the campaign chooser): hide the
  // Foundations/Execution sidebar tabs since no project session backs them.
  hideFoundation = false,
}) {
  const taskId = useRef(newTaskId()).current;

  const [phase, setPhase] = useState('setup'); // 'setup' | 'ready'
  const [path, setPath] = useState('tune_existing_ads');
  const [pdfFile, setPdfFile] = useState(null); // Blueprint PDF → init_with_pdf (REQUIRED on the No-account tab)
  // Which account tab is selected — an index into ACCOUNT_TABS (last = "No account").
  const [accountIdx, setAccountIdx] = useState(0);
  // Typed-credential gate RETIRED in favor of the account tabs — kept for restore.
  // const [adAccountId, setAdAccountId] = useState('');
  // const [adAccountToken, setAdAccountToken] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState(null);

  const [messages, setMessages] = useState([]);
  const [gapQuestions, setGapQuestions] = useState([]);
  const [ads, setAds] = useState([]);
  // selectedAdIds = the NEW (pending, not-yet-sent) picks; confirmedAdIds = ads already
  // diagnosed (locked — the backend has them; they can't be unselected). New picks flow
  // to `selected_ad_ids` on the next stream and then move into the confirmed set.
  const [selectedAdIds, setSelectedAdIds] = useState([]);
  const [confirmedAdIds, setConfirmedAdIds] = useState([]);
  const [adsPanelOpen, setAdsPanelOpen] = useState(true);

  const [streamingText, setStreamingText] = useState(null);
  const [typing, setTyping] = useState(false);
  const [turnError, setTurnError] = useState(null);
  const [draftingAgent, setDraftingAgent] = useState(null);
  // Live "what's happening" feed for the running turn — fed by the SSE node-start
  // events AND every granular webhook message (tool calls, lens pipeline steps,
  // completions), so the user watches each step land instead of staring at a spinner.
  const [activity, setActivity] = useState([]); // [string] — the running turn's step log
  const pushActivity = (text) => {
    if (text) setActivity((prev) => [...prev, text].slice(-40));
  };

  const [latestDiagnoses, setLatestDiagnoses] = useState([]); // [{ad_id, ad_name, diagnosis_html}]
  const [latestCompetitorLens, setLatestCompetitorLens] = useState(null); // html string
  const [latestStrategy, setLatestStrategy] = useState([]); // [{ad_id, ad_name, strategy_html}]
  const [latestCreative, setLatestCreative] = useState(null); // structured draft { new|null, tune|null }
  const [artifactSel, setArtifactSel] = useState('diagnosis'); // 'diagnosis' | 'competitor_lens' | 'strategy' | 'creative'
  const [canvasSel, setCanvasSel] = useState(''); // diagnosis sub-view: an ad_id ('combined' or a real id)
  const [strategyCanvasSel, setStrategyCanvasSel] = useState(''); // strategy sub-view (multi-doc, like diagnosis)

  const [chatW, onSplitDown] = useSplit(460, 360, 720);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  const busy = typing || streamingText !== null;
  const showAdsPanel = path === 'tune_existing_ads' && ads.length > 0;
  // Tune path: the chat input appears once the user clicks "Diagnose" (ads get
  // confirmed). Before clicking, the user is just picking ads in the AdsPanel, so
  // there's no input at all. While the first diagnosis turn is running the
  // placeholder says so — but the lock itself is just `busy`: a turn can finish
  // WITHOUT a diagnosis (e.g. the agent declines a video-only selection and asks
  // a question instead), and the input must unlock so the user can answer.
  const tuneAwaitingFirstDiagnosis =
    path === 'tune_existing_ads' && busy && latestDiagnoses.length === 0;
  const showComposer =
    path !== 'tune_existing_ads' || confirmedAdIds.length > 0 || latestDiagnoses.length > 0;
  const composerDisabled = busy || gapQuestions.length > 0;

  // Stepper state derived from which artifacts exist + what's drafting now.
  const doneMap = {
    diagnosis: latestDiagnoses.length > 0,
    competitor_lens: !!latestCompetitorLens,
    strategy: latestStrategy.length > 0,
    creative: !!latestCreative,
  };
  const draftingStep = draftingAgent ? DRAFTING_TO_STEP[draftingAgent] : null;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingText, gapQuestions, draftingAgent]);

  async function handleStart() {
    const account = ACCOUNT_TABS[accountIdx];
    if (!account) {
      setInitError('Pick an ad account to continue.');
      return;
    }
    if (account.noAccount) {
      // Backend NO-ACCOUNT mode. Tune is impossible without an account (there
      // are no ads to pick), and brand context must come from the PDF.
      if (path === 'tune_existing_ads') {
        setInitError(
          'Tuning existing ads needs a connected ad account — pick an account tab, or switch to Create.'
        );
        return;
      }
      if (!pdfFile) {
        setInitError(
          'The No-account option needs a Brand Blueprint PDF for brand context — upload one to continue.'
        );
        return;
      }
    }
    // Typed-credential gate RETIRED in favor of the account tabs — kept for restore.
    // const aaid = adAccountId.trim();
    // const token = adAccountToken.trim();
    // if (!aaid || !token) {
    //   setInitError('Enter your ad account ID and access token to continue.');
    //   return;
    // }
    // const account = ACCOUNTS.find((a) => aaid === a.aaid && token === a.token);
    // if (!account) {
    //   setInitError(ACCOUNT_MISMATCH_MSG);
    //   return;
    // }
    setInitLoading(true);
    setInitError(null);
    try {
      const common = {
        thread_id: threadId,
        path,
        // "No account": omit the pair entirely — the backend takes tenant_id +
        // account_id as an optional PAIR (both or neither).
        ...(account.noAccount
          ? {}
          : { tenant_id: account.tenant_id, account_id: account.aaid }),
      };
      // A selected PDF supplies brand context (skips phase-1); otherwise pull it
      // from the phase-1 checkpoint via foundation_thread_id.
      const res = pdfFile
        ? await initMetaAdAgentWithPdf({ ...common, pdfFile })
        : await initMetaAdAgent({ ...common, foundation_thread_id: threadId });
      if (res.path === 'create_ads') {
        setMessages(res.ai_message ? [{ role: 'assistant', content: res.ai_message, time: Date.now() }] : []);
        setGapQuestions(res.questions || []);
      } else {
        const fetched = res.ads || [];
        setAds(fetched);
        setAdsPanelOpen(true);
        setMessages([
          {
            role: 'assistant',
            content: `I pulled ${fetched.length} active ad${fetched.length === 1 ? '' : 's'} from your account. Pick the ones you want me to diagnose from the panel above — you can always add more later.`,
            time: Date.now(),
          },
        ]);
      }
      setPhase('ready');
    } catch (e) {
      setInitError(e.message || 'Failed to start the Meta Ad Agent.');
    } finally {
      setInitLoading(false);
    }
  }

  async function runStream({ user_message, gap_answers, selected_ad_ids, attachment_urls }) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setTurnError(null);
    setTyping(true);
    setStreamingText(null);
    setDraftingAgent(null);
    setActivity([]);

    const webhook_request = buildWebhookRequest({
      task_id: taskId,
      event_type: 'workflow.meta_ad_agent',
      data: { thread_id: threadId },
    });
    let sub = null;
    if (webhook_request) {
      sub = subscribeProgress(taskId, (evt) => {
        if (evt.status !== 'success' || !evt.data) return;
        const { stage, data } = evt;

        // Every webhook carries a user-facing `success_message` — stream it into the
        // live activity feed so the user watches each step land (tool calls, lens
        // pipeline steps, completions), exactly like the email agent's toasts.
        if (evt.success_message) pushActivity(evt.success_message);

        // Every completion webhook carries the artifact in the SAME value shape the
        // SSE `done` frame uses, so we reduce webhook + `done` with the same helpers.
        // Diagnosis / strategy docs stream one at a time — UPSERT each (the list holds
        // just the one doc that landed) by ad_id (the real id on tune / 'combined') so
        // an edit of one doc doesn't blank the others.
        if (stage === 'meta_ad.diagnosis.doc') {
          setLatestDiagnoses((prev) => (data.diagnoses || []).reduce(upsertDoc, prev));
          const first = (data.diagnoses || [])[0];
          if (first) setCanvasSel((cur) => cur || first.ad_id);
          setArtifactSel('diagnosis');
        } else if (stage === 'meta_ad.strategy.doc') {
          setLatestStrategy((prev) => (data.strategies || []).reduce(upsertDoc, prev));
          const first = (data.strategies || [])[0];
          if (first) setStrategyCanvasSel((cur) => cur || first.ad_id);
          setArtifactSel('strategy');
        } else if (stage === 'meta_ad.competitor_lens.html') {
          setLatestCompetitorLens(data.competitor_lens || '');
          setArtifactSel('competitor_lens');
        } else if (
          stage === 'meta_ad.creative.structure' ||
          stage === 'meta_ad.creative.ad' ||
          stage === 'meta_ad.creative.image'
        ) {
          // All three carry a partial `{campaigns:[...]}` tree — one merge folds a
          // campaign+ad set batch, a streamed ad, or a rendered image into the draft.
          setLatestCreative((prev) => mergeCreativeTree(prev, data.campaigns));
          setArtifactSel('creative');
        }
        // competitor_lens.planning / .search / .filtering / .ads / .analysis are
        // progress-only — their `success_message` already drove the activity feed above.
      });
    }

    let assistantText = '';
    let lastDrafting = null; // dedupe the SSE node-start activity across loop re-entries
    try {
      for await (const ev of streamMetaAdAgent({
        thread_id: threadId,
        user_message,
        gap_answers,
        selected_ad_ids,
        attachment_urls,
        webhook_request,
        signal: controller.signal,
      })) {
        if (ev.type === 'ai_message_token') {
          assistantText += ev.content || '';
          setStreamingText(assistantText);
        } else if (ev.type === 'diagnosis_drafting' || ev.type === 'competitor_lens_drafting' || ev.type === 'strategy_drafting' || ev.type === 'creative_drafting') {
          // The node-start SSE event marks a section transition (diagnosis → lens →
          // strategy → creative). Set the loader agent + push a one-line section header
          // into the activity feed — deduped, since the event re-fires each ReAct loop.
          const agent = { diagnosis_drafting: 'ad_diagnosis', competitor_lens_drafting: 'competitor_lens', strategy_drafting: 'strategy', creative_drafting: 'creative' }[ev.type];
          setDraftingAgent(agent);
          if (lastDrafting !== agent) {
            pushActivity(`${DRAFTING_LABELS[agent] || 'Working'}…`);
            lastDrafting = agent;
          }
        } else if (ev.type === 'done') {
          if (assistantText) {
            setMessages((prev) => [...prev, { role: 'assistant', content: assistantText, time: Date.now() }]);
          }
          // A turn can produce several artifacts (the diagnosis → strategy
          // chain); land the canvas on the last one produced.
          let nextArtifact = null;
          if (ev.diagnosis) {
            const diags = ev.diagnosis.diagnoses || [];
            setLatestDiagnoses(diags);
            setCanvasSel(defaultDiagnosisSel(diags));
            nextArtifact = 'diagnosis';
          }
          if (ev.competitor_lens) {
            setLatestCompetitorLens(ev.competitor_lens);
            nextArtifact = 'competitor_lens';
          }
          if (ev.strategy) {
            const strats = ev.strategy.strategies || [];
            setLatestStrategy(strats);
            setStrategyCanvasSel(defaultDiagnosisSel(strats));
            nextArtifact = 'strategy';
          }
          if (ev.creative) {
            setLatestCreative(ev.creative);
            nextArtifact = 'creative';
          }
          if (nextArtifact) setArtifactSel(nextArtifact);
        } else if (ev.type === 'error') {
          setTurnError(ev.message || 'Something went wrong this turn.');
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setTurnError(e?.message || 'The stream failed.');
    } finally {
      setTyping(false);
      setStreamingText(null);
      setDraftingAgent(null);
      abortRef.current = null;
      sub?.close();
    }
  }

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
      { role: 'user', content: summary || 'Submitted campaign answers.', time: Date.now() },
    ]);
    setGapQuestions([]);
    runStream({ gap_answers: answers });
  }

  // Confirmed ads are locked — only NEW (pending) ads toggle.
  function toggleAd(adId) {
    if (confirmedAdIds.includes(adId)) return;
    setSelectedAdIds((prev) =>
      prev.includes(adId) ? prev.filter((x) => x !== adId) : [...prev, adId]
    );
  }

  // Send only the NEW picks (the backend unions them onto the prior selection),
  // then move them into the locked/confirmed set.
  function handleAddAds() {
    if (busy) return;
    // Only the GENUINELY new picks (defensive: never re-send an already-diagnosed ad).
    const adding = selectedAdIds.filter((id) => !confirmedAdIds.includes(id));
    if (!adding.length) return;
    // Build the chat label DIRECTLY from the new picks (exact set, selection order) —
    // not via ads.filter, which reorders and silently drops ids not found in `ads`.
    const byId = new Map(ads.map((a) => [a.ad_id, a]));
    const names = adding.map((id) => byId.get(id)?.ad_name || id);
    const verb = confirmedAdIds.length ? 'Also diagnose these ads' : 'Diagnose these ads';
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: `${verb}: ${names.join(', ')}`, time: Date.now() },
    ]);
    setConfirmedAdIds((prev) => [...new Set([...prev, ...adding])]);
    setSelectedAdIds([]);
    // Collapse the picker once ads are sent for diagnosis — it rests until the
    // user re-opens it to add more. The diagnosis takes over the canvas.
    setAdsPanelOpen(false);
    runStream({ selected_ad_ids: adding });
  }

  // Canvas edit boxes show ONLY the user's instruction in chat, but send the full
  // POSITIONED message (which ad / campaign / ad set / slot it targets) to the
  // endpoint, so the agent knows what to change without the user seeing the plumbing.
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
        activeView="meta_ad_agent"
        onSelectView={onSelectView}
        onNewProject={onNewProject}
        hideFoundation={hideFoundation}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onBack={onBack}
          phase={phase}
          path={path}
          doneMap={doneMap}
          draftingStep={draftingStep}
          current={artifactSel}
        />

        {phase === 'setup' ? (
          <SetupView
            path={path}
            setPath={setPath}
            accountTabs={ACCOUNT_TABS}
            accountIdx={accountIdx}
            setAccountIdx={setAccountIdx}
            initLoading={initLoading}
            initError={initError}
            onStart={handleStart}
            pdfFile={pdfFile}
            setPdfFile={setPdfFile}
          />
        ) : (
          <div className="flex-1 flex min-h-0">
            {chatCollapsed ? (
              <CollapsedRail label="Conversation" onExpand={() => setChatCollapsed(false)} />
            ) : (
            <div className="flex flex-col bg-white dark:bg-slate-900 min-w-0" style={{ width: chatW }}>
              <PanelBar label="Conversation" onCollapse={() => setChatCollapsed(true)} />
              {showAdsPanel && (
                <AdsPanel
                  ads={ads}
                  confirmed={confirmedAdIds}
                  pending={selectedAdIds}
                  onToggle={toggleAd}
                  onAdd={handleAddAds}
                  busy={busy}
                  open={adsPanelOpen}
                  setOpen={setAdsPanelOpen}
                />
              )}

              <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scroll px-5 py-5">
                <div className="flex flex-col gap-4">
                  {messages.map((m, i) => (
                    <ChatMessageItem key={i} message={m} />
                  ))}

                  {gapQuestions.length > 0 && !busy && (
                    <GapQuestions questions={gapQuestions} disabled={busy} onSubmit={handleSubmitGapAnswers} />
                  )}

                  {streamingText !== null && (
                    <ChatMessageItem message={{ role: 'assistant', content: streamingText, time: null }} streaming />
                  )}
                  {/* While the turn runs, the live activity feed shows each step landing
                      (SSE node starts + granular webhook messages); before any step has
                      streamed it falls back to a simple loader pill. */}
                  {busy && activity.length > 0 ? (
                    <ActivityFeed items={activity} />
                  ) : (
                    <>
                      {(typing && !draftingAgent) && <DraftingPill label="Thinking" />}
                      {draftingAgent && <DraftingPill label={DRAFTING_LABELS[draftingAgent] || 'Working'} />}
                    </>
                  )}
                </div>
              </div>

              {turnError && (
                <div className="mx-5 mb-3 text-[12px] text-danger bg-danger/5 border border-danger/30 rounded-lg px-3 py-2">
                  {turnError}
                </div>
              )}

              {showComposer && (
                <Composer
                  disabled={composerDisabled}
                  onSend={handleSendText}
                  placeholder={
                    tuneAwaitingFirstDiagnosis
                      ? 'Diagnosing your ads…'
                      : 'Ask about the diagnosis, or what to do next…'
                  }
                />
              )}
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
              <ArtifactCanvas
                diagnoses={latestDiagnoses}
                competitorLens={latestCompetitorLens}
                strategy={latestStrategy}
                creative={latestCreative}
                artifactSel={artifactSel}
                setArtifactSel={setArtifactSel}
                canvasSel={canvasSel}
                setCanvasSel={setCanvasSel}
                strategyCanvasSel={strategyCanvasSel}
                setStrategyCanvasSel={setStrategyCanvasSel}
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
// Header — navy topbar + 4-step stepper
// =============================================================

function Header({ onBack, phase, path, doneMap, draftingStep, current }) {
  const hint =
    path === 'create_ads'
      ? 'Create · account pulse → brief → diagnosis'
      : 'Tune · diagnose your live ads';
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
        <IconTarget width={18} height={18} />
      </div>
      <div className="leading-tight">
        <div className="font-display text-[18px] font-semibold text-white">Meta Ad Agent</div>
        <div className="text-[11.5px] text-navy-200">Diagnose your ads and shape the play</div>
      </div>

      <div className="ml-auto">
        {phase === 'setup' ? (
          <span className="text-[11px] tracking-wider uppercase font-semibold text-navy-300">{hint}</span>
        ) : (
          <Stepper doneMap={doneMap} draftingStep={draftingStep} current={current} />
        )}
      </div>
    </header>
  );
}

function Stepper({ doneMap, draftingStep, current }) {
  return (
    <div className="flex items-center">
      {STEPS.map(([key, label], i) => {
        const done = doneMap[key];
        const drafting = draftingStep === key;
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
                      : 'bg-white/10 text-navy-300',
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
                  lit || isCurrent ? 'text-white' : 'text-navy-300',
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
// Setup view — path choice + account tabs
// =============================================================

function SetupView({
  path, setPath, accountTabs, accountIdx, setAccountIdx,
  initLoading, initError, onStart, pdfFile, setPdfFile,
}) {
  const noAccount = !!accountTabs[accountIdx]?.noAccount;
  function pickTab(i) {
    setAccountIdx(i);
    // The No-account tab can't tune (no ads to pick) — flip to Create.
    if (accountTabs[i]?.noAccount && path === 'tune_existing_ads') setPath('create_ads');
  }
  return (
    <div className="flex-1 overflow-y-auto thin-scroll bg-canvas dark:bg-slate-950">
      <div className="max-w-[760px] mx-auto px-6 py-10">
        <div className="font-display text-[27px] font-semibold text-navy-900 dark:text-slate-100">
          Tune an existing ad, or build something new
        </div>
        <p className="mt-1.5 text-[14px] text-navy-600 dark:text-slate-400 leading-relaxed">
          Pick a path. Either way I read your live ad account and your brand blueprint, then put a
          diagnosis on the canvas before proposing anything.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PathCard
            active={path === 'tune_existing_ads'}
            disabled={noAccount}
            onClick={() => { if (!noAccount) setPath('tune_existing_ads'); }}
            title="Tune existing ad"
            body="Pick live ads to diagnose together. I find the pattern, name the top and bottom performers, and recommend the fix."
          />
          <PathCard
            active={path === 'create_ads'}
            onClick={() => setPath('create_ads')}
            title="Create · new campaign"
            body="Answer a few questions. I read your account-wide pulse and blueprint, then ground a new campaign in real performance."
          />
        </div>

        <div className="mt-6 rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-card">
          <div className="text-[11px] tracking-wider uppercase text-navy-400 dark:text-slate-500 font-semibold">
            Ad account &amp; brand context
          </div>
          <p className="mt-1.5 text-[11.5px] text-navy-500 dark:text-slate-500 leading-relaxed">
            Pick the ad account to run against — credentials stay in the app and never leave it.
            Choose “No account” to build a campaign from a Blueprint PDF alone.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <Field label="Ad account">
              <div className="flex flex-wrap gap-2">
                {accountTabs.map((t, i) => (
                  <button
                    key={`${t.label}-${i}`}
                    type="button"
                    onClick={() => pickTab(i)}
                    className={[
                      'px-3.5 py-2 rounded-lg border text-[13px] font-medium transition',
                      i === accountIdx
                        ? 'border-meta-600 bg-meta-50 dark:bg-meta-500/10 text-meta-700 dark:text-meta-300 ring-2 ring-meta-100 dark:ring-meta-500/20'
                        : 'border-navy-100 dark:border-slate-600 bg-white dark:bg-slate-800 text-navy-700 dark:text-slate-200 hover:border-meta-500',
                    ].join(' ')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {noAccount && (
                <div className="mt-1.5 text-[11.5px] text-navy-600 dark:text-slate-400">
                  No ad account will be connected — the diagnosis canvas shows a
                  no-ad-data notice, and the campaign is built from your Blueprint PDF.
                </div>
              )}
            </Field>
            {/* Typed-credential gate RETIRED in favor of the account tabs — kept for restore.
            <Field label="Ad account ID">
              <input
                type="text"
                value={adAccountId}
                onChange={(e) => setAdAccountId(e.target.value)}
                placeholder="e.g. 1234567890123456"
                className="w-full bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-600 rounded-lg px-3 py-2 text-[13px] text-navy-900 dark:text-slate-100 placeholder:text-navy-400 dark:placeholder:text-slate-500 outline-none focus:border-meta-600 focus:ring-2 focus:ring-meta-100 dark:focus:ring-meta-500/20 transition"
              />
            </Field>
            <Field label="Ad account access token">
              <input
                type="password"
                value={adAccountToken}
                onChange={(e) => setAdAccountToken(e.target.value)}
                placeholder="Meta Graph API access token"
                autoComplete="off"
                className="w-full bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-600 rounded-lg px-3 py-2 text-[13px] text-navy-900 dark:text-slate-100 placeholder:text-navy-400 dark:placeholder:text-slate-500 outline-none focus:border-meta-600 focus:ring-2 focus:ring-meta-100 dark:focus:ring-meta-500/20 transition"
              />
            </Field>
            */}
            <Field label={noAccount ? 'Brand Blueprint PDF (required — no account connected)' : 'Brand Blueprint PDF (optional — overrides phase-1)'}>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="w-full text-[12.5px] text-navy-700 dark:text-slate-200 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-meta-600 file:text-white file:text-[12.5px] file:cursor-pointer hover:file:bg-meta-700"
              />
              {pdfFile && (
                <div className="mt-1.5 text-[11.5px] text-navy-600 dark:text-slate-400">
                  Using <span className="font-medium">{pdfFile.name}</span> for brand context — phase-1 is skipped.
                </div>
              )}
            </Field>
          </div>

          {initError && (
            <div className="mt-4 text-[12.5px] text-danger bg-danger/5 border border-danger/30 rounded-lg px-3 py-2">
              {initError}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={initLoading}
              onClick={onStart}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-meta-600 hover:bg-meta-700 text-white text-[13px] font-medium shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {initLoading ? 'Reading your account…' : path === 'create_ads' ? 'Start a campaign' : 'Pull my ads'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PathCard({ active, onClick, title, body, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'text-left rounded-2xl border p-5 transition',
        active
          ? 'border-meta-600 bg-meta-50 dark:bg-meta-500/10 ring-2 ring-meta-100 dark:ring-meta-500/20'
          : 'border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-meta-500',
        disabled ? 'opacity-50 cursor-not-allowed hover:border-navy-100 dark:hover:border-slate-700' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div className="font-display text-[16px] font-semibold text-navy-900 dark:text-slate-100">{title}</div>
        {active && <IconCheck width={16} height={16} className="text-meta-600" />}
      </div>
      <p className="mt-1.5 text-[12.5px] text-navy-600 dark:text-slate-400 leading-relaxed">{body}</p>
    </button>
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
// Ads panel — persistent, collapsible, tune-path only.
// Confirmed ads are locked (checked + disabled); new picks flow to the stream.
// =============================================================

// Delivery badge derived from the card's two DB-mirrored status fields —
// `effective_status` (Meta computed) first, then `status` (advertiser toggle) —
// the same order the backend's tiered selection uses, so the badge always
// matches the tier the ad was picked from.
function deliveryBadge(ad) {
  if (ad.effective_status === 'ACTIVE') {
    return { label: 'Live', cls: 'text-positive bg-mint-100 dark:bg-mint-500/15' };
  }
  if (ad.status === 'ACTIVE') {
    return { label: 'On · not delivering', cls: 'text-gold bg-gold/10 dark:bg-gold/20' };
  }
  return { label: 'Off', cls: 'text-navy-500 bg-navy-100 dark:text-slate-400 dark:bg-slate-700' };
}

function AdsPanel({ ads, confirmed, pending, onToggle, onAdd, busy, open, setOpen }) {
  const pendingCount = pending.length;
  return (
    <div className="shrink-0 border-b border-navy-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-5 py-3 text-left"
      >
        <span
          className={[
            'h-6 w-6 rounded-lg bg-meta-50 dark:bg-meta-500/15 grid place-items-center text-meta-600 dark:text-meta-500 shrink-0 transition-opacity',
            open ? '' : 'opacity-40',
          ].join(' ')}
        >
          <IconTarget width={13} height={13} />
        </span>
        <span className="text-[13px] font-semibold text-navy-900 dark:text-slate-100">Your ads</span>
        <span className="text-[11px] font-medium text-navy-500 dark:text-slate-400">
          {confirmed.length > 0
            ? `${confirmed.length} ad${confirmed.length === 1 ? '' : 's'} diagnosed`
            : 'Select ads to diagnose'}
          {pendingCount ? <span className="text-meta-600 dark:text-meta-500"> · {pendingCount} new</span> : ''}
        </span>
        <span className="ml-auto text-navy-400 dark:text-slate-500">
          {open ? <IconChevronDown width={16} height={16} /> : <IconChevronRight width={16} height={16} />}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-4">
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto thin-scroll pr-1">
            {ads.map((ad) => {
              const isConfirmed = confirmed.includes(ad.ad_id);
              const isPending = pending.includes(ad.ad_id);
              const checked = isConfirmed || isPending;
              const locked = isConfirmed || busy;
              const badge = deliveryBadge(ad);
              return (
                <button
                  key={ad.ad_id}
                  type="button"
                  disabled={locked}
                  onClick={() => onToggle(ad.ad_id)}
                  className={[
                    'flex items-center gap-3 text-left rounded-xl border p-2.5 transition',
                    isConfirmed
                      ? 'border-mint-400 bg-mint-100/60 dark:bg-mint-500/10 cursor-default'
                      : isPending
                        ? 'border-meta-600 bg-meta-50 dark:bg-meta-500/10'
                        : 'border-navy-100 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-meta-500',
                    busy && !isConfirmed && 'opacity-60 cursor-not-allowed',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="h-11 w-11 rounded-lg bg-navy-50 dark:bg-slate-700 overflow-hidden shrink-0 grid place-items-center">
                    {ad.thumbnail_url ? (
                      <img src={ad.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <IconTarget width={15} height={15} className="text-navy-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="text-[13px] font-semibold text-navy-900 dark:text-slate-100 truncate">
                        {ad.ad_name || ad.ad_id}
                      </div>
                      <span
                        className={`shrink-0 text-[9.5px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      {isConfirmed && (
                        <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-wide text-positive bg-mint-100 dark:bg-mint-500/15 rounded px-1.5 py-0.5">
                          Diagnosed
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-navy-500 dark:text-slate-400 truncate">
                      {[ad.format, ad.effective_status].filter(Boolean).join(' · ')}
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-navy-500 dark:text-slate-400 font-mono">
                      spend {money(ad.spend)} · CTR {pct(ad.ctr)} · CPC {money(ad.cpc)}
                    </div>
                  </div>
                  <div
                    className={[
                      'h-5 w-5 rounded-md border grid place-items-center shrink-0',
                      isConfirmed
                        ? 'bg-mint-500 border-mint-500 text-navy-900'
                        : isPending
                          ? 'bg-meta-600 border-meta-600 text-white'
                          : 'border-navy-200 dark:border-slate-500',
                    ].join(' ')}
                  >
                    {checked && <IconCheck width={12} height={12} />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11.5px] text-navy-500 dark:text-slate-400">
              {confirmed.length} diagnosed · {pendingCount} selected to add
            </span>
            <button
              type="button"
              disabled={busy || !pendingCount}
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-meta-600 hover:bg-meta-700 text-white text-[12.5px] font-medium shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconPlus width={13} height={13} />
              {confirmed.length ? 'Add to diagnosis' : 'Diagnose selected'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// Diagnosis canvas — tabs + combined / per-ad dropdown + iframe
// =============================================================

function ArtifactCanvas({
  diagnoses,
  competitorLens,
  strategy,
  creative,
  artifactSel,
  setArtifactSel,
  canvasSel,
  setCanvasSel,
  strategyCanvasSel,
  setStrategyCanvasSel,
  onUpdate,
  busy,
}) {
  // Which artifacts exist → which tabs to show (arc order).
  const tabs = [];
  const hasDiagnosis = !!(diagnoses && diagnoses.length);
  if (hasDiagnosis) tabs.push('diagnosis');
  if (competitorLens) tabs.push('competitor_lens');
  if (strategy && strategy.length) tabs.push('strategy');
  if (creative) tabs.push('creative');

  // Fall back to the first available tab when the selection isn't ready yet.
  const effectiveSel = tabs.includes(artifactSel) ? artifactSel : tabs[0];

  // HTML-iframe artifacts (diagnosis / competitor lens / strategy). Creative is
  // NOT HTML — it renders as a structured tree below.
  const html = useMemo(() => {
    if (effectiveSel === 'competitor_lens') return competitorLens || '';
    if (effectiveSel === 'diagnosis' && diagnoses.length) {
      const doc = diagnoses.find((d) => d.ad_id === canvasSel) || orderDocs(diagnoses)[0];
      return doc?.diagnosis_html || '';
    }
    if (effectiveSel === 'strategy' && strategy.length) {
      const doc = strategy.find((d) => d.ad_id === strategyCanvasSel) || orderDocs(strategy)[0];
      return doc?.strategy_html || '';
    }
    return '';
  }, [effectiveSel, diagnoses, competitorLens, strategy, canvasSel, strategyCanvasSel]);

  if (!tabs.length) {
    return (
      <div className="flex-1 grid place-items-center p-10 text-center">
        <div className="max-w-[420px]">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-navy-900 grid place-items-center text-mint-500">
            <IconTarget width={22} height={22} />
          </div>
          <div className="mt-3 font-display text-[18px] font-semibold text-navy-900 dark:text-slate-100">
            Nothing on the canvas yet
          </div>
          <p className="mt-1.5 text-[13px] text-navy-600 dark:text-slate-400 leading-relaxed">
            Answer the campaign questions or pick ads to diagnose. The diagnosis renders here — then ask
            for the recommended play and it'll appear as its own tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-12 px-5 flex items-center gap-2 border-b border-navy-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setArtifactSel(t)}
            className={[
              'px-3 py-1.5 rounded-lg text-[12px] font-medium transition',
              effectiveSel === t
                ? 'bg-meta-600 text-white'
                : 'text-navy-600 dark:text-slate-400 hover:bg-meta-50 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            {ARTIFACT_LABELS[t]}
          </button>
        ))}
        {(() => {
          const docs = effectiveSel === 'diagnosis' ? diagnoses : effectiveSel === 'strategy' ? strategy : [];
          if (!docs || docs.length <= 1) return null;
          const sel = effectiveSel === 'diagnosis' ? canvasSel : strategyCanvasSel;
          const setSel = effectiveSel === 'diagnosis' ? setCanvasSel : setStrategyCanvasSel;
          return (
            <select
              value={sel}
              onChange={(e) => setSel(e.target.value)}
              className="ml-auto bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-600 rounded-lg px-3 py-1.5 text-[12.5px] text-navy-900 dark:text-slate-100 outline-none focus:border-meta-600 transition"
            >
              {orderDocs(docs).map((d) => (
                <option key={d.ad_id} value={d.ad_id}>
                  {diagnosisOptionLabel(d)}
                </option>
              ))}
            </select>
          );
        })()}
      </div>

      {effectiveSel === 'creative' ? (
        <CreativeDraftView draft={creative} onUpdate={onUpdate} busy={busy} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto thin-scroll p-6 flex flex-col items-center gap-4">
          {/* The card gets an explicit VIEWPORT-relative height (chain-independent —
              does not rely on the flex ancestry resolving), and the iframe fills it
              and scrolls its own content NATIVELY. Native iframe scroll is reliable
              in every browser — this is what worked at the original fixed height,
              just responsive to the window instead of a magic number. Offset ≈
              header(64) + tab bar(48) + padding/gap/details(~108). */}
          <div className="w-full max-w-[1024px] h-[calc(100vh-220px)] min-h-[360px] bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-700 rounded-2xl shadow-card overflow-hidden">
            <iframe
              title={`${ARTIFACT_LABELS[effectiveSel]} preview`}
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
      )}
    </div>
  );
}

// =============================================================
// Creative draft — Meta-style Campaign › Ad Set › Ads tree + detail
// =============================================================

const AD_TYPE_LABEL = { image: 'Image', carousel: 'Carousel', video: 'Video' };

const variantSrc = (v) => v?.data_uri || v?.image_url || '';
const adThumb = (ad) => {
  const lane = (((ad?.image_slots || [])[0]?.aspects) || [])[0];
  return variantSrc((lane?.variants || [])[0]);
};
const minorMoney = (v, suffix = '') => (v == null ? null : `${money(Number(v) / 100)}${suffix}`);

// Copy pools: pick option `i`, falling back to the first (or '').
const pick = (arr, i) => (Array.isArray(arr) && arr.length ? (arr[i] ?? arr[0]) : '');
const ctaLabel = (s) => (s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

// Image aspect lanes ↔ placement families.
const LANE_LABEL = { '9:16': 'Story / Reels', '4:5': 'Feed', '1:1': 'Feed (square)', '16:9': 'Landscape' };
const laneLabel = (r) => LANE_LABEL[r] || (r || 'Current');
const isStoryLane = (r) => r === '9:16';
const aspectClass = (r) =>
  r === '9:16' ? 'aspect-[9/16]' : r === '4:5' ? 'aspect-[4/5]' : r === '16:9' ? 'aspect-video' : 'aspect-square';

// The draft already arrives as Meta's campaign → ad set(s) → ad(s) tree
// (`draft.campaigns: [{ campaign, adsets: [{ adset, ads }] }]`) for BOTH paths
// (create = one campaign group with null ids; tune = one group per real campaign).
// This only adds stable React keys.
function creativeCampaigns(draft) {
  if (!draft || !Array.isArray(draft.campaigns)) return [];
  return draft.campaigns.map((cg, ci) => ({
    key: cg.campaign?.campaign_id || `campaign-${ci}`,
    campaign: cg.campaign || {},
    adsets: (cg.adsets || []).map((asg, si) => ({
      key: asg.adset?.adset_id || `adset-${ci}-${si}`,
      adset: asg.adset || {},
      ads: asg.ads || [],
    })),
  }));
}

// Colored level indicator like Meta's account-structure chips.
function LevelChip({ kind }) {
  const map = {
    campaign: ['C', 'bg-navy-900 text-mint-500'],
    adset: ['AS', 'bg-meta-600 text-white'],
    ad: ['Ad', 'bg-mint-500 text-navy-900'],
  };
  const [txt, cls] = map[kind];
  return (
    <span className={`shrink-0 inline-grid place-items-center h-5 min-w-[22px] px-1 rounded text-[9px] font-bold tracking-wide ${cls}`}>
      {txt}
    </span>
  );
}

function TreeRow({ depth, active, expandable, expanded, onToggle, onSelect, kind, title, sub, thumb }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full flex items-center gap-2 pr-2 py-1.5 rounded-lg text-left transition',
        active ? 'bg-navy-50 dark:bg-slate-800' : 'hover:bg-navy-50/60 dark:hover:bg-slate-800/60',
      ].join(' ')}
      style={{ paddingLeft: 8 + depth * 16 }}
    >
      {expandable ? (
        <span
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="shrink-0 text-navy-400 hover:text-navy-700"
        >
          {expanded ? <IconChevronDown width={14} height={14} /> : <IconChevronRight width={14} height={14} />}
        </span>
      ) : (
        <span className="shrink-0 w-[14px]" />
      )}
      <LevelChip kind={kind} />
      {thumb ? <img src={thumb} alt="" className="shrink-0 h-7 w-7 rounded object-cover border border-navy-100" /> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-navy-900 dark:text-slate-100">{title}</span>
        {sub ? <span className="block truncate text-[11px] text-navy-500 dark:text-slate-400">{sub}</span> : null}
      </span>
    </button>
  );
}

function CreativeDraftView({ draft, onUpdate, busy }) {
  const campaigns = useMemo(() => creativeCampaigns(draft), [draft]);
  const [sel, setSel] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [treeCollapsed, setTreeCollapsed] = useState(false);

  const fp = useMemo(
    () => campaigns.map((c) => `${c.key}:${c.adsets.map((s) => `${s.key}#${s.ads.length}`).join(',')}`).join('|'),
    [campaigns]
  );
  useEffect(() => {
    const exp = {};
    let firstAd = null;
    campaigns.forEach((c, ci) => {
      exp['c:' + c.key] = true;
      c.adsets.forEach((s, si) => {
        exp['s:' + c.key + '/' + s.key] = true;
        if (!firstAd && s.ads.length) firstAd = { type: 'ad', ci, si, ai: 0 };
      });
    });
    setExpanded(exp);
    setSel(firstAd || (campaigns.length ? { type: 'campaign', ci: 0 } : null));
  }, [fp]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!campaigns.length) {
    return (
      <div className="flex-1 grid place-items-center p-10 text-center text-[13px] text-navy-600 dark:text-slate-400">
        No ad draft yet — ask the agent to build the campaign.
      </div>
    );
  }

  const selected = (() => {
    if (!sel) return null;
    const c = campaigns[sel.ci];
    if (!c) return null;
    if (sel.type === 'campaign') return { kind: 'campaign', campaign: c.campaign };
    const s = c.adsets[sel.si];
    if (!s) return null;
    if (sel.type === 'adset') return { kind: 'adset', adset: s.adset };
    const a = s.ads[sel.ai];
    return a ? { kind: 'ad', ad: a } : null;
  })();

  return (
    <div className="flex-1 flex min-h-0">
      {treeCollapsed ? (
        <CollapsedRail label="Campaigns" onExpand={() => setTreeCollapsed(false)} />
      ) : (
      <div className="w-[290px] shrink-0 border-r border-navy-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        <PanelBar label="Campaigns" onCollapse={() => setTreeCollapsed(true)} />
        <div className="flex-1 overflow-y-auto thin-scroll py-2">
        {campaigns.map((c, ci) => {
          const cExp = expanded['c:' + c.key];
          return (
            <div key={c.key}>
              <TreeRow
                depth={0}
                kind="campaign"
                active={sel?.type === 'campaign' && sel.ci === ci}
                expandable={c.adsets.length > 0}
                expanded={cExp}
                onToggle={() => setExpanded((e) => ({ ...e, ['c:' + c.key]: !e['c:' + c.key] }))}
                onSelect={() => setSel({ type: 'campaign', ci })}
                title={c.campaign.name || 'New campaign'}
                sub={c.campaign.objective || 'Campaign'}
              />
              {cExp &&
                c.adsets.map((s, si) => {
                  const sExp = expanded['s:' + c.key + '/' + s.key];
                  return (
                    <div key={s.key}>
                      <TreeRow
                        depth={1}
                        kind="adset"
                        active={sel?.type === 'adset' && sel.ci === ci && sel.si === si}
                        expandable={s.ads.length > 0}
                        expanded={sExp}
                        onToggle={() =>
                          setExpanded((e) => ({ ...e, ['s:' + c.key + '/' + s.key]: !e['s:' + c.key + '/' + s.key] }))
                        }
                        onSelect={() => setSel({ type: 'adset', ci, si })}
                        title={s.adset.name || 'New ad set'}
                        sub={s.adset.optimization_goal || 'Ad set'}
                      />
                      {sExp &&
                        s.ads.map((a, ai) => (
                          <TreeRow
                            key={a.key || ai}
                            depth={2}
                            kind="ad"
                            active={sel?.type === 'ad' && sel.ci === ci && sel.si === si && sel.ai === ai}
                            expandable={false}
                            onSelect={() => setSel({ type: 'ad', ci, si, ai })}
                            title={a.name || pick(a.headlines, 0) || `Ad ${a.key}`}
                            sub={`${AD_TYPE_LABEL[a.ad_type] || a.ad_type}${a.ad_id ? '' : ' · draft'}`}
                            thumb={adThumb(a)}
                          />
                        ))}
                    </div>
                  );
                })}
            </div>
          );
        })}
        </div>
      </div>
      )}

      <div className="flex-1 overflow-y-auto thin-scroll p-6">
        {selected?.kind === 'campaign' && (
          <CampaignDetail key={`campaign-${sel.ci}`} campaign={selected.campaign} onUpdate={onUpdate} busy={busy} />
        )}
        {selected?.kind === 'adset' && (
          <AdSetDetail key={`adset-${sel.ci}-${sel.si}`} adset={selected.adset} onUpdate={onUpdate} busy={busy} />
        )}
        {selected?.kind === 'ad' && (
          <AdDetail key={`ad-${sel.ci}-${sel.si}-${sel.ai}`} ad={selected.ad} onUpdate={onUpdate} busy={busy} />
        )}
      </div>
    </div>
  );
}

function DetailHead({ kind, title, sub }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <LevelChip kind={kind} />
      <div className="min-w-0">
        <div className="font-display text-[19px] font-semibold text-navy-900 dark:text-slate-100 leading-tight truncate">{title}</div>
        {sub ? <div className="text-[12px] text-navy-500 dark:text-slate-400">{sub}</div> : null}
      </div>
    </div>
  );
}

function DetailField({ label, value }) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;
  return (
    <div className="py-2.5 border-b border-navy-100/70 dark:border-slate-800 last:border-0 flex items-start gap-4">
      <div className="w-[140px] shrink-0 text-[11px] uppercase tracking-wide text-navy-500 dark:text-slate-400">{label}</div>
      <div className="text-[13px] text-navy-900 dark:text-slate-100 break-words">
        {Array.isArray(value) ? value.join(', ') : String(value)}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-5 mb-4">
      {title ? <div className="font-display text-[14px] font-semibold text-navy-900 dark:text-slate-100 mb-1.5">{title}</div> : null}
      {children}
    </div>
  );
}

const adRefLabel = (ad) => (ad.ad_id ? `ad id ${ad.ad_id}` : `ad ${ad.key}`);

function EditIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function Chevron({ dir = 'left', size = 16 }) {
  const d = {
    left: 'M15 18l-6-6 6-6',
    right: 'M9 18l6-6-6-6',
  }[dir];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// A thin collapsed rail with a vertical label + expand chevron (chat / tree).
function CollapsedRail({ label, onExpand }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      title={`Expand ${label.toLowerCase()}`}
      className="w-10 shrink-0 border-r border-navy-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center gap-3 py-3 hover:bg-navy-50 dark:hover:bg-slate-800 transition"
    >
      <span className="text-navy-500 dark:text-slate-400"><Chevron dir="right" /></span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-500 dark:text-slate-400 [writing-mode:vertical-rl]">
        {label}
      </span>
    </button>
  );
}

// Header strip with a title + collapse chevron (chat / tree panels).
function PanelBar({ label, onCollapse }) {
  return (
    <div className="flex items-center justify-between px-3 h-9 shrink-0 border-b border-navy-100 dark:border-slate-800">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-500 dark:text-slate-400">{label}</span>
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

// Per-section "Update" affordance: reveals an instruction box; on send it composes
// a section-SCOPED message (carrying the object's name/id) and hands it to the chat
// stream via onUpdate, so the agent edits exactly that campaign / ad set / ad / image.
function UpdateBox({ label, placeholder, compose, onUpdate, busy }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (!onUpdate) return null;
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    // Show only the user's instruction in chat; send the positioned message to the endpoint.
    onUpdate(t, compose(t));
    setText('');
    setOpen(false);
  };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-meta-200 dark:border-slate-600 bg-meta-50 dark:bg-slate-800 text-meta-700 dark:text-slate-200 hover:bg-meta-100 dark:hover:bg-slate-700 text-[12px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <EditIcon /> Update {label}
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
        <span className="ml-auto text-[10.5px] text-navy-400 dark:text-slate-500">⌘↵ to send</span>
      </div>
    </div>
  );
}

// Facebook / Instagram FEED preview — header + primary text + the creative at its
// lane aspect + a link footer. `copy` is the user's chosen option per pool.
function MetaAdPreview({ copy, variant, aspect, link }) {
  const src = variantSrc(variant);
  let domain = '';
  try { domain = link ? new URL(link).hostname.replace(/^www\./, '') : ''; } catch { domain = ''; }
  const cta = ctaLabel(copy.cta);
  return (
    <div className="w-full max-w-[400px] rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5">
        <div className="h-9 w-9 rounded-full bg-navy-900 text-mint-500 grid place-items-center text-[11px] font-bold shrink-0">Ad</div>
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold text-navy-900 dark:text-slate-100 leading-tight">Your Page</div>
          <div className="text-[10.5px] text-navy-400 dark:text-slate-500">Sponsored</div>
        </div>
      </div>
      {copy.primary_text ? (
        <div className="px-3.5 pb-2.5 text-[12.5px] text-navy-800 dark:text-slate-200 whitespace-pre-wrap leading-snug max-h-[160px] overflow-y-auto thin-scroll">
          {copy.primary_text}
        </div>
      ) : null}
      <div className={`bg-navy-50 dark:bg-slate-800 grid place-items-center overflow-hidden ${aspectClass(aspect)}`}>
        {src ? <img src={src} alt="" className="block w-full h-full object-cover" /> : <span className="text-[11px] text-navy-400">No image yet</span>}
      </div>
      <div className="flex items-center gap-3 px-3.5 py-2.5 bg-navy-50/70 dark:bg-slate-800/70 border-t border-navy-100 dark:border-slate-700">
        <div className="min-w-0 flex-1">
          {domain ? <div className="text-[10px] uppercase tracking-wide text-navy-400 dark:text-slate-500 truncate">{domain}</div> : null}
          <div className="text-[12.5px] font-semibold text-navy-900 dark:text-slate-100 truncate">{copy.headline || '—'}</div>
          {copy.description ? <div className="text-[11px] text-navy-500 dark:text-slate-400 truncate">{copy.description}</div> : null}
        </div>
        {cta ? <span className="shrink-0 px-3 py-1.5 rounded-md bg-navy-100 dark:bg-slate-700 text-[11.5px] font-semibold text-navy-800 dark:text-slate-100">{cta}</span> : null}
      </div>
    </div>
  );
}

// Stories / Reels FULL-SCREEN preview — 9:16 full-bleed creative with overlay
// chrome (profile top, headline + CTA bottom), like Meta's placement preview.
function MetaStoryPreview({ copy, variant }) {
  const src = variantSrc(variant);
  const cta = ctaLabel(copy.cta);
  return (
    <div className="w-full max-w-[270px] rounded-[22px] overflow-hidden border border-navy-200 dark:border-slate-700 bg-navy-900 shadow-card">
      <div className="relative aspect-[9/16] bg-navy-800 overflow-hidden">
        {src ? (
          <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[11px] text-white/50">No 9:16 image yet</div>
        )}
        <div className="absolute top-0 inset-x-0 p-3 flex items-center gap-2 bg-gradient-to-b from-black/55 to-transparent">
          <div className="h-7 w-7 rounded-full bg-white/90 text-navy-900 grid place-items-center text-[10px] font-bold shrink-0">Ad</div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-white leading-tight truncate">Your Page</div>
            <div className="text-[9px] text-white/70">Sponsored</div>
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/75 via-black/30 to-transparent">
          {copy.primary_text ? (
            <div className="text-[10.5px] text-white/90 mb-2 line-clamp-2 leading-snug">{copy.primary_text}</div>
          ) : null}
          {copy.headline ? <div className="text-[12px] font-semibold text-white mb-2 line-clamp-2">{copy.headline}</div> : null}
          <div className="flex items-center justify-between gap-2 rounded-lg bg-white/95 px-3 py-2">
            <span className="text-[11px] font-semibold text-navy-900 truncate">{cta || 'Learn More'}</span>
            <span className="text-navy-500 text-[13px] leading-none">›</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Copy-pool chooser: radio list when there are several options, plain value for one.
function OptionPicker({ label, options, idx, setIdx, format, onUpdate, compose, busy }) {
  if (!options || !options.length) return null;
  const fmt = format || ((x) => x);
  return (
    <div className="py-3 border-b border-navy-100/70 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[11px] uppercase tracking-wide text-navy-500 dark:text-slate-400">{label}</div>
        {options.length > 1 ? (
          <span className="px-1.5 py-0.5 rounded bg-meta-50 dark:bg-slate-800 text-meta-700 dark:text-slate-300 text-[10px] font-semibold">
            {options.length} options · pick one
          </span>
        ) : null}
      </div>
      {options.length > 1 ? (
        <div className="space-y-1.5">
          {options.map((o, i) => {
            const on = i === idx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={[
                  'w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-lg border transition',
                  on
                    ? 'border-mint-500 bg-mint-500/10'
                    : 'border-navy-100 dark:border-slate-700 hover:border-navy-300 dark:hover:border-slate-500',
                ].join(' ')}
              >
                <span
                  className={[
                    'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 grid place-items-center',
                    on ? 'border-mint-500' : 'border-navy-300 dark:border-slate-600',
                  ].join(' ')}
                >
                  {on ? <span className="h-2 w-2 rounded-full bg-mint-500" /> : null}
                </span>
                <span className="text-[13px] text-navy-900 dark:text-slate-100 break-words">{fmt(o)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-[13px] text-navy-900 dark:text-slate-100 break-words">{fmt(options[0])}</div>
      )}
      {onUpdate && compose ? (
        <div className="mt-2.5">
          <UpdateBox
            label={label.toLowerCase()}
            placeholder={`e.g. reword this ${label.toLowerCase()}, make it punchier, add another option…`}
            compose={compose}
            onUpdate={onUpdate}
            busy={busy}
          />
        </div>
      ) : null}
    </div>
  );
}

function CampaignDetail({ campaign: c, onUpdate, busy }) {
  const ref = c.campaign_id ? `the campaign "${c.name || 'campaign'}" (id ${c.campaign_id})` : 'the campaign';
  return (
    <div className="max-w-[640px]">
      <DetailHead kind="campaign" title={c.name || 'New campaign'} sub={c.campaign_id ? `Campaign ID ${c.campaign_id}` : 'Draft — no Meta ID yet'} />
      <Card title="Campaign settings">
        <DetailField label="Objective" value={c.objective} />
        <DetailField label="Status" value={c.status} />
        <DetailField label="Buying type" value={c.buying_type} />
        <DetailField label="Daily budget" value={minorMoney(c.daily_budget, '/day')} />
        <DetailField label="Lifetime budget" value={minorMoney(c.lifetime_budget)} />
        <DetailField label="Spend cap" value={minorMoney(c.spend_cap)} />
        <DetailField label="Bid strategy" value={c.bid_strategy} />
        <DetailField label="Special categories" value={c.special_ad_categories} />
      </Card>
      <UpdateBox
        label="campaign"
        placeholder="e.g. raise the daily budget to $80, switch the objective to Sales…"
        onUpdate={onUpdate}
        busy={busy}
        compose={(t) => `Update ${ref}: ${t}`}
      />
    </div>
  );
}

function AdSetDetail({ adset: s, onUpdate, busy }) {
  const t = s.targeting || {};
  const hasT = Object.keys(t).some((k) => t[k] != null && (!Array.isArray(t[k]) || t[k].length));
  const ref = s.adset_id ? `the ad set "${s.name || 'ad set'}" (id ${s.adset_id})` : 'the ad set';
  return (
    <div className="max-w-[640px]">
      <DetailHead kind="adset" title={s.name || 'New ad set'} sub={s.adset_id ? `Ad set ID ${s.adset_id}` : 'Draft — no Meta ID yet'} />
      <Card title="Delivery">
        <DetailField label="Optimization" value={s.optimization_goal} />
        <DetailField label="Billing event" value={s.billing_event} />
        <DetailField label="Daily budget" value={minorMoney(s.daily_budget, '/day')} />
        <DetailField label="Lifetime budget" value={minorMoney(s.lifetime_budget)} />
        <DetailField label="Bid amount" value={minorMoney(s.bid_amount)} />
        <DetailField label="Destination" value={s.destination_type} />
        <DetailField label="Schedule" value={[s.start_time, s.end_time].filter(Boolean).join(' → ') || null} />
        <DetailField label="Status" value={s.status} />
      </Card>
      {hasT && (
        <Card title="Audience">
          <DetailField label="Age" value={t.age_min != null || t.age_max != null ? `${t.age_min ?? '—'}–${t.age_max ?? '—'}` : null} />
          <DetailField label="Genders" value={(t.genders || []).map((g) => (g === 1 ? 'Male' : g === 2 ? 'Female' : g)).join(', ') || null} />
          <DetailField label="Countries" value={t.countries} />
          <DetailField label="Platforms" value={t.publisher_platforms} />
          <DetailField label="FB positions" value={t.facebook_positions} />
          <DetailField label="IG positions" value={t.instagram_positions} />
          <DetailField label="Devices" value={t.device_platforms} />
          <DetailField label="Interests" value={t.interests} />
          <DetailField label="Custom audiences" value={t.custom_audiences} />
          <DetailField label="Excluded" value={t.excluded_custom_audiences} />
        </Card>
      )}
      <UpdateBox
        label="ad set"
        placeholder="e.g. narrow the age range to 30–50, target the US only, add interest 'SaaS founders'…"
        onUpdate={onUpdate}
        busy={busy}
        compose={(instr) => `Update ${ref}: ${instr}`}
      />
    </div>
  );
}

function AdDetail({ ad, onUpdate, busy }) {
  const isCarousel = ad.ad_type === 'carousel';
  const headline0 = pick(ad.headlines, 0);
  const ref = `${adRefLabel(ad)}${headline0 ? ` ("${headline0}")` : ''}`;
  return (
    <div className="max-w-[1100px]">
      <DetailHead
        kind="ad"
        title={ad.name || headline0 || `Ad ${ad.key}`}
        sub={`${AD_TYPE_LABEL[ad.ad_type] || ad.ad_type} ad · ${ad.ad_id ? `ID ${ad.ad_id}` : 'draft — no Meta ID yet'}`}
      />
      {isCarousel ? (
        <CarouselAd ad={ad} onUpdate={onUpdate} busy={busy} adRef={ref} />
      ) : (
        <SingleImageAd ad={ad} onUpdate={onUpdate} busy={busy} adRef={ref} />
      )}
      <UpdateBox
        label="this ad"
        placeholder="e.g. add another headline option, change the CTA to Sign Up, give me a punchier primary text…"
        onUpdate={onUpdate}
        busy={busy}
        compose={(instr) => `Update ${ref}: ${instr}`}
      />
    </div>
  );
}

function SingleImageAd({ ad, onUpdate, busy, adRef }) {
  const slot = (ad.image_slots || [])[0];
  const slotKey = slot?.slot_key || 'slot-1';
  const aspects = slot?.aspects || [];
  const ratioKeys = aspects.map((a) => a.aspect_ratio ?? 'current').join('|');

  // Chosen copy option per pool.
  const [ci, setCi] = useState({ primary: 0, headline: 0, description: 0, cta: 0 });
  const copy = {
    primary_text: pick(ad.primary_texts, ci.primary),
    headline: pick(ad.headlines, ci.headline),
    description: pick(ad.descriptions, ci.description),
    cta: pick(ad.ctas, ci.cta),
  };

  // Active placement lane.
  const [activeRatio, setActiveRatio] = useState(aspects[0]?.aspect_ratio ?? null);
  useEffect(() => {
    if (!aspects.some((a) => (a.aspect_ratio ?? null) === activeRatio)) {
      setActiveRatio(aspects[0]?.aspect_ratio ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratioKeys]);
  const lane = aspects.find((a) => (a.aspect_ratio ?? null) === activeRatio) || aspects[0];
  const laneVariants = lane?.variants || [];
  const laneKey = activeRatio ?? 'current';

  // Chosen variant per lane (defaults to the latest).
  const [varMap, setVarMap] = useState({});
  // After a generation, auto-jump each lane that GREW to its newest variant.
  const prevCounts = useRef({});
  const countsKey = aspects.map((a) => `${a.aspect_ratio ?? 'current'}:${(a.variants || []).length}`).join('|');
  useEffect(() => {
    const advance = {};
    aspects.forEach((a) => {
      const k = a.aspect_ratio ?? 'current';
      const n = (a.variants || []).length;
      if (n > (prevCounts.current[k] ?? 0) && n > 0) advance[k] = n - 1;
      prevCounts.current[k] = n;
    });
    if (Object.keys(advance).length) setVarMap((p) => ({ ...p, ...advance }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey]);
  const vIdx = varMap[laneKey] != null ? varMap[laneKey] : laneVariants.length ? laneVariants.length - 1 : 0;
  const variant = laneVariants[vIdx];
  const story = isStoryLane(activeRatio);

  return (
    <div className="mb-4 flex flex-col lg:flex-row lg:items-start gap-6">
      <div className="lg:w-[400px] lg:shrink-0 lg:sticky lg:top-0 lg:self-start">
      {aspects.length ? (
        <div className="flex justify-center mb-3">
          <div className="inline-flex gap-1 p-1 rounded-xl bg-navy-50 dark:bg-slate-800">
            {aspects.map((a) => {
              const r = a.aspect_ratio ?? null;
              const on = r === activeRatio;
              return (
                <button
                  key={a.aspect_ratio ?? 'current'}
                  type="button"
                  onClick={() => setActiveRatio(r)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition',
                    on
                      ? 'bg-white dark:bg-slate-900 text-navy-900 dark:text-slate-100 shadow-sm'
                      : 'text-navy-500 dark:text-slate-400 hover:text-navy-800 dark:hover:text-slate-200',
                  ].join(' ')}
                >
                  {laneLabel(r)}{' '}
                  <span className="text-navy-400 dark:text-slate-500">{a.aspect_ratio || ''}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex justify-center">
        {story ? (
          <MetaStoryPreview copy={copy} variant={variant} />
        ) : (
          <MetaAdPreview copy={copy} variant={variant} aspect={activeRatio} link={ad.link} />
        )}
      </div>
      </div>

      <div className="flex-1 min-w-0">
      <Card title="Copy options">
        <OptionPicker label="Primary text" options={ad.primary_texts} idx={ci.primary} setIdx={(i) => setCi((p) => ({ ...p, primary: i }))}
          onUpdate={onUpdate} busy={busy}
          compose={(instr) => `Update ${adRef}: the primary text — ${instr}`} />
        <OptionPicker label="Headline" options={ad.headlines} idx={ci.headline} setIdx={(i) => setCi((p) => ({ ...p, headline: i }))}
          onUpdate={onUpdate} busy={busy}
          compose={(instr) => `Update ${adRef}: the headline — ${instr}`} />
        <OptionPicker label="Description" options={ad.descriptions} idx={ci.description} setIdx={(i) => setCi((p) => ({ ...p, description: i }))}
          onUpdate={onUpdate} busy={busy}
          compose={(instr) => `Update ${adRef}: the description — ${instr}`} />
        <OptionPicker label="Call to action" options={ad.ctas} idx={ci.cta} setIdx={(i) => setCi((p) => ({ ...p, cta: i }))} format={ctaLabel}
          onUpdate={onUpdate} busy={busy}
          compose={(instr) => `Update ${adRef}: the call-to-action — ${instr}`} />
        {ad.link ? <DetailField label="Link" value={ad.link} /> : null}
      </Card>

      <Card title="Images">
        {aspects.length ? (
          <div className="space-y-5">
            {aspects.map((a) => {
              const r = a.aspect_ratio ?? null;
              const k = r ?? 'current';
              const vs = a.variants || [];
              const idx = varMap[k] != null ? varMap[k] : vs.length ? vs.length - 1 : 0;
              const chosenV = vs[idx];
              return (
                <div key={a.aspect_ratio ?? 'current'} className="border-b border-navy-100/70 dark:border-slate-800 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12.5px] font-semibold text-navy-900 dark:text-slate-100">{laneLabel(r)}</span>
                    {r ? (
                      <span className="px-1.5 py-0.5 rounded bg-navy-100 dark:bg-slate-700 text-[10px] font-semibold text-navy-600 dark:text-slate-300">{r}</span>
                    ) : null}
                    {r === activeRatio ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-mint-600 dark:text-mint-400">● previewing</span>
                    ) : null}
                  </div>
                  <SlotGallery variants={vs} chosen={idx} setChosen={(i) => setVarMap((p) => ({ ...p, [k]: i }))} />
                  <div className="mt-2.5">
                    <UpdateBox
                      label={`${laneLabel(r)} image`}
                      placeholder="e.g. brighter background, show the product in use, no text overlay…"
                      onUpdate={onUpdate}
                      busy={busy}
                      compose={(instr) =>
                        `Regenerate the ${r || 'current'} image for ${adRef}, slot ${slotKey}${chosenV?.variant_key ? ` (from variant ${chosenV.variant_key})` : ''}: ${instr}`
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <SlotGallery variants={[]} />
            <div className="mt-3">
              <UpdateBox
                label="images"
                placeholder="e.g. a sunlit kitchen with the product on the counter, lifestyle, no text overlay…"
                onUpdate={onUpdate}
                busy={busy}
                compose={(instr) => `Generate the feed (4:5) and story (9:16) images for ${adRef}, slot ${slotKey}: ${instr}`}
              />
            </div>
          </>
        )}
      </Card>
      </div>
    </div>
  );
}

// Facebook / Instagram-style CAROUSEL preview — header + primary text + a
// horizontally swipeable row of cards (image + headline + description + CTA each).
function MetaCarouselPreview({ primaryText, adCta, aspect, cards, slotFor, variantFor, copyFor }) {
  const cardList = cards.length ? cards : [{ slot_key: 'card-1' }];
  const cardW = aspect === '9:16' ? 'w-[148px]' : 'w-[200px]';
  return (
    <div className="w-full max-w-[400px] rounded-2xl border border-navy-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5">
        <div className="h-9 w-9 rounded-full bg-navy-900 text-mint-500 grid place-items-center text-[11px] font-bold shrink-0">Ad</div>
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold text-navy-900 dark:text-slate-100 leading-tight">Your Page</div>
          <div className="text-[10.5px] text-navy-400 dark:text-slate-500">Sponsored</div>
        </div>
      </div>
      {primaryText ? (
        <div className="px-3.5 pb-2.5 text-[12.5px] text-navy-800 dark:text-slate-200 whitespace-pre-wrap leading-snug max-h-[140px] overflow-y-auto thin-scroll">
          {primaryText}
        </div>
      ) : null}
      <div className="flex gap-2 overflow-x-auto thin-scroll px-3.5 pb-3.5 snap-x">
        {cardList.map((card, i) => {
          const slot = slotFor(card, i);
          const variant = variantFor(slot);
          const src = variantSrc(variant);
          const cc = copyFor(card);
          const cta = ctaLabel(cc.cta || adCta);
          return (
            <div
              key={card.slot_key || i}
              className={`shrink-0 ${cardW} snap-start rounded-xl border border-navy-100 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900`}
            >
              <div className={`bg-navy-50 dark:bg-slate-800 grid place-items-center overflow-hidden ${aspectClass(aspect)}`}>
                {src ? (
                  <img src={src} alt="" className="block w-full h-full object-cover" />
                ) : (
                  <span className="text-[11px] text-navy-400">No image</span>
                )}
              </div>
              <div className="px-2.5 py-2 border-t border-navy-100 dark:border-slate-700">
                <div className="text-[12px] font-semibold text-navy-900 dark:text-slate-100 truncate">
                  {cc.headline || `Card ${i + 1}`}
                </div>
                {cc.description ? (
                  <div className="text-[10.5px] text-navy-500 dark:text-slate-400 truncate">{cc.description}</div>
                ) : null}
                {cta ? (
                  <div className="mt-1.5">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-navy-100 dark:bg-slate-700 text-[10.5px] font-semibold text-navy-800 dark:text-slate-100">
                      {cta}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CarouselAd({ ad, onUpdate, busy, adRef }) {
  const cards = ad.cards || [];
  const slots = ad.image_slots || [];
  const [primaryIdx, setPrimaryIdx] = useState(0);
  const [ctaIdx, setCtaIdx] = useState(0);

  // A carousel's ratio is CAROUSEL-WIDE (every card the same ratio). The available
  // ratios are the union across card slots; switching the tab switches all cards.
  const ratiosKey = slots
    .map((s) => (s.aspects || []).map((a) => a.aspect_ratio ?? 'current').join(','))
    .join('|');
  const ratios = useMemo(() => {
    const seen = [];
    slots.forEach((s) => (s.aspects || []).forEach((a) => {
      const r = a.aspect_ratio ?? null;
      if (!seen.includes(r)) seen.push(r);
    }));
    return seen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratiosKey]);

  const [activeRatio, setActiveRatio] = useState(ratios[0] ?? null);
  useEffect(() => {
    if (!ratios.includes(activeRatio)) setActiveRatio(ratios[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratiosKey]);

  // Chosen variant per (card, ratio); auto-jump a lane that just grew.
  const [varMap, setVarMap] = useState({});
  const vkey = (slotKey, ratio) => `${slotKey}@${ratio ?? 'current'}`;
  const prevCounts = useRef({});
  const countsKey = slots
    .map((s) => (s.aspects || []).map((a) => `${s.slot_key}@${a.aspect_ratio ?? 'current'}:${(a.variants || []).length}`).join(','))
    .join('|');
  useEffect(() => {
    const advance = {};
    slots.forEach((s) => (s.aspects || []).forEach((a) => {
      const k = vkey(s.slot_key, a.aspect_ratio ?? null);
      const n = (a.variants || []).length;
      if (n > (prevCounts.current[k] ?? 0) && n > 0) advance[k] = n - 1;
      prevCounts.current[k] = n;
    }));
    if (Object.keys(advance).length) setVarMap((p) => ({ ...p, ...advance }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey]);

  const slotFor = (card, i) => slots.find((s) => s.slot_key === card.slot_key) || slots[i];
  const laneFor = (slot, ratio) => (slot?.aspects || []).find((a) => (a.aspect_ratio ?? null) === ratio);
  const variantsFor = (slot, ratio) => laneFor(slot, ratio)?.variants || [];
  const chosenIdxFor = (slot, ratio) => {
    const vs = variantsFor(slot, ratio);
    const c = varMap[vkey(slot?.slot_key, ratio)];
    return c != null ? c : vs.length ? vs.length - 1 : 0;
  };
  const variantFor = (slot) => variantsFor(slot, activeRatio)[chosenIdxFor(slot, activeRatio)];

  const primaryText = pick(ad.primary_texts, primaryIdx);
  const adCta = pick(ad.ctas, ctaIdx);
  const hasStory = ratios.includes('9:16');

  // Chosen copy option per card (slot_key -> {headline, description, cta} indices).
  const [cardCopy, setCardCopy] = useState({});
  const cardIdx = (slotKey, kind) => cardCopy[slotKey]?.[kind] ?? 0;
  const setCardIdx = (slotKey, kind, i) =>
    setCardCopy((p) => ({ ...p, [slotKey]: { ...(p[slotKey] || {}), [kind]: i } }));
  const copyFor = (card) => ({
    headline: pick(card.headlines, cardIdx(card.slot_key, 'headline')),
    description: pick(card.descriptions, cardIdx(card.slot_key, 'description')),
    cta: pick(card.ctas, cardIdx(card.slot_key, 'cta')),
  });

  return (
    <div className="mb-4 flex flex-col lg:flex-row lg:items-start gap-6">
      <div className="lg:w-[400px] lg:shrink-0 lg:sticky lg:top-0 lg:self-start">
      {ratios.length ? (
        <div className="flex justify-center mb-3">
          <div className="inline-flex gap-1 p-1 rounded-xl bg-navy-50 dark:bg-slate-800">
            {ratios.map((r) => {
              const on = r === activeRatio;
              return (
                <button
                  key={r ?? 'current'}
                  type="button"
                  onClick={() => setActiveRatio(r)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition',
                    on
                      ? 'bg-white dark:bg-slate-900 text-navy-900 dark:text-slate-100 shadow-sm'
                      : 'text-navy-500 dark:text-slate-400 hover:text-navy-800 dark:hover:text-slate-200',
                  ].join(' ')}
                >
                  {laneLabel(r)} <span className="text-navy-400 dark:text-slate-500">{r || ''}</span>
                </button>
              );
            })}
            {!hasStory ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  onUpdate(
                    'Add a 9:16 (story) version',
                    `Generate 9:16 (stories) images for EVERY card of ${adRef} — same vertical ratio across all cards.`
                  )
                }
                className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium text-meta-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Story 9:16
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex justify-center">
        <MetaCarouselPreview
          primaryText={primaryText}
          adCta={adCta}
          aspect={activeRatio}
          cards={cards}
          slotFor={slotFor}
          variantFor={variantFor}
          copyFor={copyFor}
        />
      </div>
      </div>

      <div className="flex-1 min-w-0">
      <Card title="Carousel copy (shared across cards)">
        <OptionPicker label="Primary text" options={ad.primary_texts} idx={primaryIdx} setIdx={setPrimaryIdx}
          onUpdate={onUpdate} busy={busy}
          compose={(instr) => `Update ${adRef}: the carousel primary text — ${instr}`} />
        <OptionPicker label="Default CTA" options={ad.ctas} idx={ctaIdx} setIdx={setCtaIdx} format={ctaLabel}
          onUpdate={onUpdate} busy={busy}
          compose={(instr) => `Update ${adRef}: the default CTA — ${instr}`} />
      </Card>
      <div className="space-y-4">
        {cards.map((card, i) => {
          const slot = slotFor(card, i);
          const slotKey = card.slot_key || `card-${i + 1}`;
          const cardAspects = slot?.aspects || [];
          return (
            <Card key={slotKey} title={`Card ${i + 1}`}>
              <OptionPicker label="Headline" options={card.headlines} idx={cardIdx(slotKey, 'headline')} setIdx={(x) => setCardIdx(slotKey, 'headline', x)}
                onUpdate={onUpdate} busy={busy}
                compose={(instr) => `Update ${adRef}, card ${slotKey}: the headline — ${instr}`} />
              <OptionPicker label="Description" options={card.descriptions} idx={cardIdx(slotKey, 'description')} setIdx={(x) => setCardIdx(slotKey, 'description', x)}
                onUpdate={onUpdate} busy={busy}
                compose={(instr) => `Update ${adRef}, card ${slotKey}: the description — ${instr}`} />
              <OptionPicker label="CTA" options={card.ctas} idx={cardIdx(slotKey, 'cta')} setIdx={(x) => setCardIdx(slotKey, 'cta', x)} format={ctaLabel}
                onUpdate={onUpdate} busy={busy}
                compose={(instr) => `Update ${adRef}, card ${slotKey}: the CTA — ${instr}`} />
              <DetailField label="Link" value={card.link} />
              <div className="mt-3 pt-3 border-t border-navy-100/70 dark:border-slate-800">
                {cardAspects.length ? (
                  <div className="space-y-4">
                    {cardAspects.map((a) => {
                      const r = a.aspect_ratio ?? null;
                      const k = vkey(slotKey, r);
                      const cvs = a.variants || [];
                      const cidx = varMap[k] != null ? varMap[k] : cvs.length ? cvs.length - 1 : 0;
                      const chosenV = cvs[cidx];
                      return (
                        <div key={r ?? 'current'}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[11px] uppercase tracking-wide text-navy-500 dark:text-slate-400">
                              {laneLabel(r)} image{r ? ` (${r})` : ''}
                            </span>
                            {r === activeRatio ? (
                              <span className="text-[10px] font-semibold text-mint-600 dark:text-mint-400">● previewing</span>
                            ) : null}
                          </div>
                          <SlotGallery variants={cvs} chosen={cidx} setChosen={(x) => setVarMap((p) => ({ ...p, [k]: x }))} />
                          <div className="mt-2.5">
                            <UpdateBox
                              label={`${laneLabel(r)} image`}
                              placeholder="e.g. brighter, show the product, different angle…"
                              onUpdate={onUpdate}
                              busy={busy}
                              compose={(instr) =>
                                `Regenerate the ${r || '1:1'} image for ${adRef}, card ${slotKey}${chosenV?.variant_key ? ` (from variant ${chosenV.variant_key})` : ''}: ${instr}`
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <SlotGallery variants={[]} />
                )}
              </div>
              <div className="mt-3">
                <UpdateBox
                  label={`card ${i + 1} copy`}
                  placeholder="e.g. add another headline option, reword the description, change the CTA…"
                  onUpdate={onUpdate}
                  busy={busy}
                  compose={(instr) => `Update ${adRef}, card ${slotKey}: ${instr}`}
                />
              </div>
            </Card>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function SlotGallery({ variants, chosen, setChosen }) {
  const vs = variants || [];
  const controlled = chosen != null && typeof setChosen === 'function';
  const [localChosen, setLocalChosen] = useState(0);
  const sel = controlled ? chosen : localChosen;
  const setSel = controlled ? setChosen : setLocalChosen;

  if (!vs.length) {
    return (
      <div className="grid place-items-center h-28 rounded-xl border border-dashed border-navy-200 dark:border-slate-700 text-[12px] text-navy-400">
        No image yet — use “Update image” below to generate one.
      </div>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {vs.map((v, i) => {
          const src = variantSrc(v);
          const isChosen = i === sel;
          const existing = v.source === 'existing';
          return (
            <button
              key={v.variant_key || i}
              type="button"
              onClick={() => setSel(i)}
              title={existing ? 'Existing live image' : 'Generated variant'}
              className={[
                'relative rounded-xl overflow-hidden border-2 transition',
                isChosen ? 'border-mint-500 ring-2 ring-mint-500/30' : 'border-navy-100 dark:border-slate-700 hover:border-navy-300',
              ].join(' ')}
            >
              {src ? (
                <img src={src} alt="" className="block h-28 w-28 object-cover" />
              ) : (
                <div className="h-28 w-28 grid place-items-center text-[11px] text-navy-400">no preview</div>
              )}
              <span
                className={[
                  'absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold',
                  existing ? 'bg-navy-900/80 text-white' : 'bg-mint-500 text-navy-900',
                ].join(' ')}
              >
                {existing ? 'Live' : v.variant_key || 'New'}
              </span>
              {isChosen && (
                <span className="absolute top-1.5 right-1.5 h-5 w-5 grid place-items-center rounded-full bg-mint-500 text-navy-900">
                  <IconCheck width={12} height={12} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-navy-500 dark:text-slate-400">
        {vs.length} variant{vs.length > 1 ? 's' : ''} — pick one to publish; the chosen one shows in the preview.
      </div>
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

// Live "what's happening" feed for the running turn. Shows the recent step messages
// streamed from the SSE node-start events + every granular webhook (tool calls, lens
// pipeline steps, artifact completions) — the LATEST line spins (current step), the
// earlier lines settle to a done check, so the user watches progress land in real time.
function ActivityFeed({ items }) {
  if (!items || !items.length) return null;
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
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
            <span>{text}</span>
          </div>
        );
      })}
    </div>
  );
}
