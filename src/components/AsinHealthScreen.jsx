import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import AsinHealthChat from './AsinHealthChat.jsx';
import { IconCheck, IconClock, IconZap } from './icons.jsx';
import { getAsinHealthData, runAsinHealth } from '../lib/asinHealthApi.js';
// import { loadMockDailies } from '../lib/asinHealthApi.js';  // the weekly on our dailies, until 2026-10-30

// ASIN Health Checker — our TEST screen (see asinHealthApi.js for the wire). The real
// frontend is built elsewhere.
//
// The answers carry only what the run produced, so names, marketplaces and channels
// come from the raw dummy data this screen loads itself (the `Lookup` context).
//
// Four tabs:
//   - Daily digest — per company, the alert counts and one card per ASIN with an alert:
//     every rule that fired on it and one alert message.
//   - Weekly — per company, every ASIN to act on over the whole week, with the reasons
//     code picked it for and the model's note. Per ASIN only, like the daily.
//   - Content fixes — every listing's content score, its five dimensions and the
//     checks that lost points. Read from the daily run.
//   - ASIN data — every ASIN's raw figures on the latest day, from the dummy data API,
//     with the last daily run's alerts and content score merged in.
//
// Beside the tabs, the chat (`AsinHealthChat.jsx`): questions about one company,
// answered from its data.
//
// A run takes a minute or more and costs model calls, so it only starts on the Run
// button. The last result of each run is kept in localStorage (a per-viewer
// convenience — the backend stores nothing), so a reload shows it again.

// { accounts: account_id → account, names: asin → product name }, from the raw data.
const Lookup = createContext({ accounts: {}, names: {} });

const TABS = [
  { id: 'digest', label: 'Daily digest' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'content', label: 'Content fixes' },
  { id: 'data', label: 'ASIN data' },
];

const RUN_LABELS = { daily: 'Run daily check', weekly: 'Run weekly' };

// A version moves when a run's shape changes, so a result saved in the old shape is
// left behind rather than read: daily `v4` is one alert per ASIN and weekly `v6` the
// ASINs to act on from the raw data (2026-10-30).
const STORAGE_VERSION = { daily: 'v4', weekly: 'v6' };
const STORAGE_KEY = (run) => `growvana.asinHealth.lastRun.${STORAGE_VERSION[run]}.${run}`;

function readStored(run) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(run));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(run, value) {
  try {
    localStorage.setItem(STORAGE_KEY(run), JSON.stringify(value));
  } catch {
    /* storage unavailable — the result simply is not kept across reloads */
  }
}

// ── formatting ──────────────────────────────────────────────────────────────────
// Null always renders as NONE, never as 0.

const NONE = '—';

function isNone(value) {
  return value === null || value === undefined;
}

function money(value, digits = 0) {
  if (isNone(value)) return NONE;
  return `$${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function num(value) {
  if (isNone(value)) return NONE;
  return Number(value).toLocaleString('en-US');
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

// Content points and scores: one decimal at most, "66" rather than "66.0".
function points(value) {
  if (isNone(value)) return NONE;
  return String(round1(value));
}

function pct(value) {
  if (isNone(value)) return NONE;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${round1(Math.abs(value))}%`;
}

function pctTone(value) {
  if (isNone(value)) return 'text-ink-400 dark:text-slate-500';
  if (value <= -20) return 'text-rose-600 dark:text-rose-400';
  if (value < 0) return 'text-amber-600 dark:text-amber-400';
  return 'text-brand-600 dark:text-brand-400';
}

function days(value) {
  if (isNone(value)) return NONE;
  return `${round1(value)}d`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// An ISO day ("2026-10-28") as "28 Oct 2026", read as a calendar day rather than a
// UTC instant so no time zone moves it.
function dayLabel(iso, withYear = true) {
  if (!iso) return NONE;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return String(iso);
  return withYear ? `${d} ${MONTHS[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]}`;
}

function rangeLabel(range) {
  if (!range) return NONE;
  return `${dayLabel(range.start, false)} – ${dayLabel(range.end)}`;
}

const BAD = 'text-rose-600 dark:text-rose-400';
const MUTED = 'text-ink-400 dark:text-slate-500';

function scoreText(score) {
  if (isNone(score)) return MUTED;
  if (score < 50) return BAD;
  if (score < 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-brand-600 dark:text-brand-400';
}

function scoreRing(score) {
  if (isNone(score)) return `${MUTED} border-ink-200 dark:border-slate-700`;
  if (score < 50) return `${scoreText(score)} border-rose-200 dark:border-rose-500/40`;
  if (score < 70) return `${scoreText(score)} border-amber-200 dark:border-amber-500/40`;
  return `${scoreText(score)} border-brand-300 dark:border-brand-500/40`;
}

function shareBar(share) {
  if (isNone(share)) return 'bg-ink-300 dark:bg-slate-600';
  if (share < 0.5) return 'bg-rose-500';
  if (share < 0.7) return 'bg-amber-500';
  return 'bg-brand-500';
}

function elapsedLabel(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

// ── vocabulary ──────────────────────────────────────────────────────────────────

// 1P = Vendor Central (Amazon buys from the company), 3P = Seller Central (it sells
// to shoppers itself).
const CHANNEL_TITLES = {
  '1P': 'Vendor Central: Amazon buys from the company and sells to shoppers',
  '3P': 'Seller Central: the company sells to shoppers itself',
};
const CHANNEL_NAMES = { '1P': '1P · Vendor Central', '3P': '3P · Seller Central' };

function channelsText(channels) {
  return channels?.length ? channels.join(' + ') : NONE;
}

// Who holds the buy box, in a word or two.
const HOLDER_TEXT = {
  us_1p: 'us · 1P',
  us_3p: 'us · 3P',
  amazon: 'Amazon',
  other_3p: 'other seller',
  none: 'nobody',
};

function holdsBuyBox(holder) {
  return holder === 'us_1p' || holder === 'us_3p';
}

// A7's cause, as the digest names it.
const CAUSE_TEXT = { supply: 'supply-driven', demand: 'demand-driven', unknown: 'cause unclear' };

const SEVERITY_RANK = { high: 0, medium: 1 };

// The five content dimensions, short enough for a bar label.
const DIMENSION_SHORT = {
  'Structured Attributes': 'Attributes',
  'Title Quality': 'Title',
  'Variant Compliance': 'Variants',
  'Images + A+ Content': 'Images + A+',
  'Bullet Points + Description': 'Bullets + desc',
};

// The share of the 100 points code scores alone; the model judges the rest.
const CODE_POINTS = 56.5;

// The answers carry the rule id only.
const RULE_NAMES = {
  A1: 'Buy box lost with PO decline',
  A2: 'Buy box lost',
  A4: 'Prime eligibility lost',
  A5: 'Listing suppressed or issue raised',
  A6: 'Price mismatch',
  A7: 'Revenue drop',
  A8: 'Amazon stock-out risk',
  A9: 'Content regression',
  A10: 'Content gap on a priority ASIN',
};

/* Evidence chips, until 2026-10-29 when alerts stopped carrying `evidence`: which of an
   ASIN's figures each rule's card showed. Restore with `evidence` on the backend's
   DigestAlert and EvidenceChip / EvidenceChips below.

const RULE_CHIPS = {
  A1: ['buyBox', 'po', 'priceVsBuyBox', 'masterfile', 'stock', 'content'],
  A2: ['buyBox', 'featured', 'priceVsBuyBox', 'masterfile', 'stock'],
  A4: ['prime', 'buyBox', 'stock'],
  A5: ['listing', 'revenue', 'buyBox', 'content'],
  A6: ['masterfile', 'buyBox', 'featured'],
  A7: ['revenue', 'sessions', 'po', 'buyBox', 'stock', 'batavia'],
  A8: ['stock', 'batavia', 'po'],
  A9: ['contentTrend', 'revenue'],
  A10: ['content', 'revenue'],
};

function evidenceChip(key, e) {
  switch (key) {
    case 'buyBox':
      return {
        label: 'Buy box',
        value: `${HOLDER_TEXT[e.buy_box_holder] || e.buy_box_holder}${e.buy_box_lost_days ? ` × ${e.buy_box_lost_days}d` : ''}`,
        tone: holdsBuyBox(e.buy_box_holder) ? undefined : BAD,
      };
    case 'featured':
      return { label: 'Featured offer', value: isNone(e.featured_offer_pct) ? NONE : `${round1(e.featured_offer_pct)}%` };
    case 'po':
      // A purchase order exists only on a 1P ASIN; on a 3P one the chip says nothing.
      if (!(e.channels || []).includes('1P')) return null;
      return {
        label: 'PO $ WoW',
        value: pct(e.po_change_pct),
        detail: `${money(e.po_dollars_prev_7d)} → ${money(e.po_dollars_7d)}`,
        tone: pctTone(e.po_change_pct),
      };
    case 'revenue':
      return {
        label: 'Revenue WoW',
        value: pct(e.revenue_change_pct),
        detail: `${money(e.revenue_prev_7d)} → ${money(e.revenue_7d)}`,
        tone: pctTone(e.revenue_change_pct),
      };
    case 'sessions':
      return {
        label: 'Sessions WoW',
        value: pct(e.sessions_change_pct),
        detail: `${num(e.sessions_prev_7d)} → ${num(e.sessions_7d)}`,
        tone: pctTone(e.sessions_change_pct),
      };
    case 'priceVsBuyBox':
      return { label: 'Our price / buy box', value: `${money(e.our_price, 2)} / ${money(e.buy_box_price, 2)}` };
    case 'masterfile':
      return {
        label: 'Our price / masterfile',
        value: `${money(e.our_price, 2)} / ${money(e.masterfile_price, 2)}`,
        detail: e.price_mismatch_days ? `differs ${e.price_mismatch_days}d` : undefined,
        tone: e.price_mismatch_days ? BAD : undefined,
      };
    case 'stock':
      return {
        label: 'Amazon on-hand',
        value: `${num(e.amazon_on_hand)} u · ${days(e.days_of_cover)} cover`,
        detail: e.amazon_inbound ? `${num(e.amazon_inbound)} inbound` : undefined,
        tone: !isNone(e.days_of_cover) && e.days_of_cover < 10 ? BAD : undefined,
      };
    case 'batavia':
      return {
        label: 'Batavia on-hand',
        value: num(e.internal_on_hand),
        detail: e.internal_inbound ? `${num(e.internal_inbound)} inbound` : undefined,
        tag: e.internal_on_hand_confidence === 'manual' ? 'manual' : undefined,
      };
    case 'prime':
      return {
        label: 'Prime',
        value: isNone(e.prime_eligible) ? NONE : e.prime_eligible ? 'yes' : e.prime_lost ? 'lost' : 'no',
        tone: e.prime_eligible === false ? BAD : undefined,
      };
    case 'listing':
      return {
        label: 'Listing',
        value: e.listing_status,
        detail: e.suppression_reasons?.length ? e.suppression_reasons.join(', ') : undefined,
        tone: e.listing_status === 'active' ? undefined : BAD,
      };
    case 'content':
      return { label: 'Content score', value: points(e.cdq_score), tone: scoreText(e.cdq_score) };
    case 'contentTrend':
      return {
        label: 'Content score 7d',
        value: `${points(e.cdq_7d_ago)} → ${points(e.cdq_score)}`,
        tone: scoreText(e.cdq_score),
      };
    default:
      return null;
  }
}

function chipsFor(ruleIds, evidence) {
  if (!evidence) return [];
  const keys = [...new Set(ruleIds.flatMap((id) => RULE_CHIPS[id] || []))];
  return keys.map((k) => evidenceChip(k, evidence)).filter(Boolean);
}

(EvidenceChip and EvidenceChips are commented out below RuleIds.)
*/

// ── small parts ─────────────────────────────────────────────────────────────────

function SeverityChip({ severity }) {
  const high = severity === 'high';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        high
          ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
      }`}
    >
      {severity}
    </span>
  );
}

// `A1 · Buy box lost with PO decline`, and A7's cause after it.
function RulePill({ id, name, cause }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-ink-100 dark:bg-slate-800 px-2 py-0.5 text-[12px] text-ink-700 dark:text-slate-300">
      <span className="font-mono font-semibold">{id}</span>
      {name && <span className="font-medium">· {name}</span>}
      {cause && <span className="text-ink-500 dark:text-slate-400">— {CAUSE_TEXT[cause] || cause}</span>}
    </span>
  );
}

// Compact rule ids coloured by severity, for tables and lists.
function RuleIds({ rules }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {rules.map((r, i) => (
        <span
          key={`${r.rule_id}-${i}`}
          title={[r.name, r.severity, r.cause && CAUSE_TEXT[r.cause]].filter(Boolean).join(' · ')}
          className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
            r.severity === 'high'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
          }`}
        >
          {r.rule_id}
        </span>
      ))}
    </span>
  );
}

function ManualTag() {
  return (
    <span
      className="ml-1 rounded bg-amber-50 dark:bg-amber-500/15 px-1 text-[10.5px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300"
      title="The Batavia count is entered by hand, so it is shown but never fires an alert on its own"
    >
      manual
    </span>
  );
}

/* The evidence chips' components (alerts carry no `evidence` since 2026-10-29).
function EvidenceChip({ chip }) {
  return (
    <span className="inline-flex flex-col rounded-lg bg-ink-100 dark:bg-slate-800 px-2.5 py-1.5 min-w-0">
      <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-500 dark:text-slate-400">{chip.label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${chip.tone || 'text-ink-800 dark:text-slate-200'}`}>
        {chip.value}
        {chip.tag === 'manual' && <ManualTag />}
      </span>
      {chip.detail && <span className="text-[11px] tabular-nums text-ink-500 dark:text-slate-400">{chip.detail}</span>}
    </span>
  );
}

function EvidenceChips({ chips }) {
  if (!chips.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {chips.map((c) => (
        <EvidenceChip key={c.label} chip={c} />
      ))}
    </div>
  );
}
*/

function Tile({ label, value, sub, tone }) {
  return (
    <div className="rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-[22px] font-semibold tabular-nums ${tone || 'text-ink-900 dark:text-slate-100'}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[12px] text-ink-500 dark:text-slate-400 truncate">{sub}</div>}
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <section className="mt-6">
      <h3 className="text-[13px] font-semibold text-ink-900 dark:text-slate-100">
        {title}
        {typeof count === 'number' && (
          <span className="ml-2 text-ink-400 dark:text-slate-500 font-normal">{count}</span>
        )}
      </h3>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 dark:border-slate-800 px-4 py-3 text-[13px] text-ink-500 dark:text-slate-400">
      {children}
    </div>
  );
}

function AsinLabel({ asin, name }) {
  return (
    <div className="min-w-0">
      <div className="text-[13.5px] font-medium text-ink-900 dark:text-slate-100 truncate" title={name}>
        {name}
      </div>
      <div className="font-mono text-[11.5px] text-ink-500 dark:text-slate-400">{asin}</div>
    </div>
  );
}

function CompanyHeader({ name, marketplace, channels = [], status, meta }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <h2 className="text-[17px] font-semibold text-ink-900 dark:text-slate-100 mr-1">{name}</h2>
      {marketplace && (
        <span className="rounded-full bg-ink-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-ink-600 dark:text-slate-300">
          Amazon {marketplace}
        </span>
      )}
      {channels.length > 0 && (
        <span
          className="rounded-full bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300"
          title={channels.map((c) => CHANNEL_TITLES[c]).join(' · ')}
        >
          {channels.length > 1 ? `Hybrid · ${channelsText(channels)}` : CHANNEL_NAMES[channels[0]] || channels[0]}
        </span>
      )}
      {status === 'partial' && (
        <span className="rounded-full bg-amber-50 dark:bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          Partial
        </span>
      )}
      {meta && <span className="text-[12px] text-ink-500 dark:text-slate-400">{meta}</span>}
    </div>
  );
}

// What could not run for a company (`status: 'partial'`). Its alerts still stand,
// each with a plain sentence where the model's words are missing.
function ErrorsBand({ errors }) {
  if (!errors?.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-[13px] text-amber-800 dark:text-amber-200">
      <div className="font-semibold">Part of this check could not run</div>
      <ul className="mt-1 list-disc pl-5 space-y-0.5">
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

function Message({ text }) {
  if (!text) return null;
  return (
    <div className="mt-4 rounded-xl border border-brand-100 dark:border-brand-500/20 bg-brand-50/60 dark:bg-brand-500/5 px-4 py-3 text-[13.5px] leading-relaxed text-ink-800 dark:text-slate-200 whitespace-pre-line">
      {text}
    </div>
  );
}

function CompanyCard({ children }) {
  return (
    <div className="rounded-2xl border border-ink-200 dark:border-slate-800 bg-ink-50/50 dark:bg-slate-900/40 p-5">{children}</div>
  );
}

// ── tab 1: daily digest ─────────────────────────────────────────────────────────

// The counts are worked out here from the alerts; the answer carries none. Each alert is
// one ASIN with every rule that fired on it (since 2026-10-30), so "high" counts the
// ASINs with a high rule.
function SummaryStrip({ alerts, asinCount }) {
  const high = alerts.filter((a) => a.rules.some((r) => r.severity === 'high')).length;
  const rules = alerts.reduce((n, a) => n + a.rules.length, 0);
  const quiet = asinCount - alerts.length;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <span className="text-[19px] font-semibold text-ink-900 dark:text-slate-100">
        {num(alerts.length)} of {num(asinCount)} ASINs with an alert
      </span>
      <span className="rounded-full bg-rose-50 dark:bg-rose-500/15 px-2.5 py-0.5 text-[12px] font-semibold text-rose-700 dark:text-rose-300">
        {num(high)} high
      </span>
      <span className="rounded-full bg-amber-50 dark:bg-amber-500/15 px-2.5 py-0.5 text-[12px] font-semibold text-amber-700 dark:text-amber-300">
        {num(alerts.length - high)} medium
      </span>
      <span className="text-[13px] text-ink-500 dark:text-slate-400">
        · {num(rules)} rule{rules === 1 ? '' : 's'} fired · {num(quiet)} quiet
      </span>
    </div>
  );
}

// The company's header details, from the raw data.
function AccountHeader({ accountId, meta }) {
  const { accounts } = useContext(Lookup);
  const account = accounts[accountId] || {};
  return (
    <CompanyHeader
      name={account.name || accountId}
      marketplace={account.marketplace}
      channels={account.channels}
      meta={meta}
    />
  );
}

// One ASIN's alert: every rule that fired on it, most severe first, and one message.
function AlertCard({ alert }) {
  const { names } = useContext(Lookup);
  const severity = alert.rules[0]?.severity;
  const high = severity === 'high';
  return (
    <article
      className={`rounded-xl border border-ink-200 dark:border-slate-800 border-l-4 bg-white dark:bg-slate-900 px-4 py-3 ${
        high ? 'border-l-rose-500 dark:border-l-rose-500' : 'border-l-amber-500 dark:border-l-amber-500'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SeverityChip severity={severity} />
        {alert.rules.map((r) => (
          <RulePill key={r.rule_id} id={r.rule_id} name={RULE_NAMES[r.rule_id]} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-[12px] text-ink-500 dark:text-slate-400">{alert.asin}</span>
        <span className="text-[13.5px] font-medium text-ink-900 dark:text-slate-100">{names[alert.asin]}</span>
      </div>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-800 dark:text-slate-200">{alert.alert_message}</p>
      <AlertTags tags={alert.tags} />
      {alert.check_first && (
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-600 dark:text-slate-300">
          <span className="font-semibold text-ink-900 dark:text-slate-100">Check first:</span> {alert.check_first}
        </p>
      )}
    </article>
  );
}

// The model's notable figures for an ASIN (2026-10-30): `bad` ones in red-brown.
function AlertTags({ tags }) {
  if (!tags?.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {tags.map((t, i) => (
        <span
          key={`${t.label}-${i}`}
          className="inline-flex items-baseline gap-2 rounded-lg border border-[#e7e4da] bg-[#f6f4ee] px-2.5 py-1 text-[12.5px] dark:border-slate-700 dark:bg-slate-800"
        >
          <span className="text-ink-500 dark:text-slate-400">{t.label}</span>
          <span
            className={`font-mono font-semibold ${
              t.bad ? 'text-[#9a3b26] dark:text-rose-300' : 'text-[#0D1B4B] dark:text-slate-200'
            }`}
          >
            {t.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function DailyDigest({ account }) {
  const alerts = account.alerts || [];
  const asinCount = (account.content || []).length;
  return (
    <CompanyCard>
      <AccountHeader accountId={account.account_id} />
      <ErrorsBand errors={account.errors} />
      <SummaryStrip alerts={alerts} asinCount={asinCount} />
      <Section title="Alerts by ASIN" count={alerts.length}>
        {alerts.length === 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-[13.5px] text-ink-700 dark:text-slate-300">
            <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
            A quiet day — nothing fired on any of the {num(asinCount)} ASINs.
          </div>
        )}
        {alerts.map((a) => (
          <AlertCard key={a.asin} alert={a} />
        ))}
      </Section>
    </CompanyCard>
  );
}

// ── tab 2: weekly ───────────────────────────────────────────────────────────────

// One ASIN to act on: every reason code picked it, and the model's note.
function ActOnRow({ item }) {
  const { names } = useContext(Lookup);
  return (
    <div className="px-4 py-3">
      <AsinLabel asin={item.asin} name={names[item.asin]} />
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {item.reasons.map((r) => (
          <li
            key={r}
            className="rounded-md bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[12px] text-amber-800 dark:text-amber-200"
          >
            {r}
          </li>
        ))}
      </ul>
      {item.note && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-800 dark:text-slate-200">{item.note}</p>}
    </div>
  );
}

// The weekly is per ASIN only, like the daily: the ASINs to act on, judged over the
// whole week, each with its reasons and note.
function WeeklyActOn({ account }) {
  const { accounts } = useContext(Lookup);
  const actOn = account.act_on || [];
  return (
    <CompanyCard>
      <AccountHeader
        accountId={account.account_id}
        meta={`${num(actOn.length)} of ${num(accounts[account.account_id]?.asin_count)} ASINs to act on`}
      />
      <ErrorsBand errors={account.errors} />
      <Section title="ASINs to act on this week" count={actOn.length}>
        {actOn.length === 0 ? (
          <Empty>Nothing to act on this week.</Empty>
        ) : (
          <div className="rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-ink-100 dark:divide-slate-800">
            {actOn.map((a) => (
              <ActOnRow key={a.asin} item={a} />
            ))}
          </div>
        )}
      </Section>
    </CompanyCard>
  );
}

/* The weekly review on our 7 daily answers (2026-10-29, until 2026-10-30): the screen
   sent its mock dailies to /weekly and drew a day strip per ASIN from them. Restore with
   the backend's commented weekly on our dailies, `loadMockDailies` and the weekly POST
   in asinHealthApi.js, the `dailies` state in AsinHealthScreen and STORAGE_VERSION.weekly
   'v5'. Its `asinWeek` and `WeekStrip` read one alert per rule, the daily's shape until
   2026-10-30.

const DIRECTION_TEXT ={ worse: 'Worse', mixed: 'Mixed', same: 'No change', better: 'Better' };
const DIRECTION_TONE = {
  worse: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  mixed: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  same: 'bg-ink-100 text-ink-600 dark:bg-slate-800 dark:text-slate-300',
  better: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
};
// The order a Client Manager reads them in; an ASIN with no note (the call failed) last.
const DIRECTION_ORDER = { worse: 0, mixed: 1, same: 2, better: 3 };

function DirectionChip({ direction }) {
  if (!direction) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DIRECTION_TONE[direction]}`}>
      {DIRECTION_TEXT[direction]}
    </span>
  );
}

// Every rule an ASIN raised over the week, once each, at the highest severity it reached.
function weekRules(days) {
  const rules = {};
  for (const d of days) {
    for (const a of d.alerts) {
      const seen = rules[a.rule_id];
      if (!seen || SEVERITY_RANK[a.severity] < SEVERITY_RANK[seen.severity]) rules[a.rule_id] = a;
    }
  }
  return Object.values(rules).sort((a, b) => Number(a.rule_id.slice(1)) - Number(b.rule_id.slice(1)));
}

// One ASIN's week, from the daily answers this screen sent: per day its alerts and its
// content score (`cdq`).
function asinWeek(dailies, accountId, asin) {
  return dailies.map((d) => {
    const account = d.accounts.find((a) => a.account_id === accountId);
    return {
      date: d.date,
      alerts: (account?.alerts || []).filter((a) => a.asin === asin),
      content: account?.content.find((c) => c.asin === asin)?.cdq || null,
    };
  });
}

function lastScore(days) {
  return days[days.length - 1]?.content?.score;
}

// One column per stored daily check: a dot for that day's worst alert, and the
// content score under it.
function WeekStrip({ days: weekDays }) {
  return (
    <div className="flex gap-1.5">
      {weekDays.map((d) => {
        const worst = d.alerts.some((a) => a.severity === 'high') ? 'high' : d.alerts.length ? 'medium' : null;
        return (
          <div
            key={d.date}
            className="w-10 text-center"
            title={d.alerts.length ? d.alerts.map((a) => `${a.rule_id} · ${a.alert_message}`).join('\n') : 'No alert'}
          >
            <div className="text-[10.5px] text-ink-400 dark:text-slate-500">{dayLabel(d.date, false)}</div>
            <span
              className={`mx-auto mt-1 block h-2.5 w-2.5 rounded-full ${
                worst === 'high' ? 'bg-rose-500' : worst === 'medium' ? 'bg-amber-500' : 'bg-ink-200 dark:bg-slate-700'
              }`}
            />
            <div className={`mt-1 text-[11px] font-semibold tabular-nums ${scoreText(d.content?.score)}`}>
              {points(d.content?.score)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekAsinRow({ item, days: weekDays }) {
  const { names } = useContext(Lookup);
  const rules = weekRules(weekDays);
  const score = lastScore(weekDays);
  const lost = !isNone(score) && score < 70 ? lostChecks(weekDays[weekDays.length - 1].content.dimensions || []) : [];
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <AsinLabel asin={item.asin} name={names[item.asin]} />
        </div>
        <DirectionChip direction={item.direction} />
      </div>
      {rules.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rules.map((r) => (
            <RulePill key={r.rule_id} id={r.rule_id} name={RULE_NAMES[r.rule_id]} />
          ))}
        </div>
      )}
      {item.note && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-800 dark:text-slate-200">{item.note}</p>}
      <div className="mt-2.5">
        <WeekStrip days={weekDays} />
      </div>
      {lost.length > 0 && (
        <div className="mt-2.5 text-[12.5px] text-ink-600 dark:text-slate-400">
          <span className="font-semibold text-ink-700 dark:text-slate-300">Content still losing points:</span>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            {lost.map((c) => (
              <li key={c.sub_attribute}>
                {c.sub_attribute} {points(c.points)}/{points(c.weight)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// `dailies` are the daily answers this screen sent to the weekly.
function WeeklyReview({ account, dailies }) {
  const { accounts } = useContext(Lookup);
  const weeks = Object.fromEntries(
    (account.asins || []).map((a) => [a.asin, asinWeek(dailies, account.account_id, a.asin)]),
  );
  const asins = [...(account.asins || [])].sort(
    (a, b) => (DIRECTION_ORDER[a.direction] ?? 4) - (DIRECTION_ORDER[b.direction] ?? 4),
  );
  const count = (direction) => asins.filter((a) => a.direction === direction).length;
  const weak = asins.filter((a) => !isNone(lastScore(weeks[a.asin])) && lastScore(weeks[a.asin]) < 70).length;
  const first = dailies[0]?.date;
  const last = dailies[dailies.length - 1]?.date;
  return (
    <CompanyCard>
      <AccountHeader
        accountId={account.account_id}
        meta={first ? `Week ${rangeLabel({ start: first, end: last })} · ${dailies.length} daily checks sent` : undefined}
      />
      <ErrorsBand errors={account.errors} />
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile
          label="Needed attention"
          value={num(asins.length)}
          sub={`of ${num(accounts[account.account_id]?.asin_count)} ASINs`}
        />
        <Tile label="Worse" value={num(count('worse'))} sub={`${num(count('mixed'))} mixed`} tone={count('worse') ? BAD : undefined} />
        <Tile
          label="Better"
          value={num(count('better'))}
          sub={`${num(count('same'))} no change`}
          tone={count('better') ? 'text-brand-600 dark:text-brand-400' : undefined}
        />
        <Tile
          label="Content under 70"
          value={num(weak)}
          sub="on the last daily check"
          tone={weak ? 'text-amber-600 dark:text-amber-400' : undefined}
        />
      </div>
      <Message text={account.message} />
      <Section title="ASINs this week" count={asins.length}>
        {asins.length === 0 ? (
          <Empty>No alert and no content score under 70 on any day this week.</Empty>
        ) : (
          <div className="rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-ink-100 dark:divide-slate-800">
            {asins.map((a) => (
              <WeekAsinRow key={a.asin} item={a} days={weeks[a.asin]} />
            ))}
          </div>
        )}
      </Section>
    </CompanyCard>
  );
}
*/

/* The weekly review when the backend compared the dailies in code (2026-10-29,
   morning): issues resolved / new / still open, content changes, totals and movers.
   Restore with the backend's commented code-compared weekly and STORAGE_VERSION.weekly
   'v3'; rename this WeeklyReview back over the one above.

const STATUS_TEXT = { new: 'New', still_open: 'Still open', resolved: 'Resolved' };
const STATUS_TONE = {
  new: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  still_open: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  resolved: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
};
const TREND_TONE = { worse: BAD, better: 'text-brand-600 dark:text-brand-400', same: MUTED };

// The issue groups in the order a Client Manager reads them.
const ISSUE_GROUPS = [
  { status: 'still_open', title: 'Still open' },
  { status: 'new', title: 'New this week' },
  { status: 'resolved', title: 'Resolved this week' },
];

// A mover's cause, worded for the direction it moved.
function causeText(cause, falling) {
  const text = {
    buy_box: falling ? 'buy box lost' : 'buy box back',
    suppression: falling ? 'suppressed' : 'unsuppressed',
    prime: falling ? 'Prime lost' : 'Prime back',
    price: falling ? 'price mismatch' : 'price fixed',
    stock: 'low stock',
    supply: falling ? 'fewer POs' : 'more POs',
    demand: falling ? 'fewer shoppers' : 'more shoppers',
  };
  return text[cause] || cause;
}

// An issue's figure is named by the backend; its unit is in the name.
function figureValue(name, value) {
  if (isNone(value)) return NONE;
  if (name.includes('(%)')) return pct(value);
  if (name.includes('($)')) return money(value, 2);
  return points(value);
}

function StatusChip({ status }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[status]}`}>{STATUS_TEXT[status]}</span>
  );
}

// One dot per stored daily check: filled on the days the issue was open.
function DayDots({ issue, days: weekDays }) {
  const open = Object.fromEntries((issue.days || []).map((d) => [d.date, d.severity]));
  return (
    <span className="inline-flex gap-1" title={`Open ${issue.days_open} of ${weekDays.length} days`}>
      {weekDays.map((d) => (
        <span
          key={d}
          title={`${dayLabel(d, false)}${open[d] ? ` · ${open[d]}` : ' · clear'}`}
          className={`h-2.5 w-2.5 rounded-full ${
            open[d] === 'high' ? 'bg-rose-500' : open[d] === 'medium' ? 'bg-amber-500' : 'bg-ink-200 dark:bg-slate-700'
          }`}
        />
      ))}
    </span>
  );
}

function IssueRow({ issue, note, weekDays }) {
  const f = issue.figure;
  return (
    <div className="grid gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[220px_1fr_auto]">
      <AsinLabel asin={issue.asin} name={issue.product_name} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-medium text-ink-900 dark:text-slate-100">{issue.name}</span>
          <span className="font-mono text-[11px] text-ink-500 dark:text-slate-400">{issue.rule_ids.join(' → ')}</span>
          {issue.trend && (
            <span className={`text-[12px] font-semibold ${TREND_TONE[issue.trend]}`}>
              {issue.trend === 'same' ? 'no change' : issue.trend}
            </span>
          )}
        </div>
        {note && <p className="mt-1 text-[13px] leading-relaxed text-ink-700 dark:text-slate-300">{note}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-500 dark:text-slate-400">
          <DayDots issue={issue} days={weekDays} />
          <span>
            {dayLabel(issue.first_seen, false)}
            {issue.last_seen !== issue.first_seen && ` – ${dayLabel(issue.last_seen, false)}`} · {issue.days_open}d open
          </span>
          {f && (
            <span className="tabular-nums">
              {f.name}: {figureValue(f.name, f.then)} → {figureValue(f.name, f.now)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-1.5 md:justify-end">
        <StatusChip status={issue.status} />
        <SeverityChip severity={issue.severity_now || issue.severity_then} />
      </div>
    </div>
  );
}

function ContentChangeRow({ item, note }) {
  const up = item.direction === 'improved';
  return (
    <div className="grid gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[220px_1fr_auto]">
      <AsinLabel asin={item.asin} name={item.product_name} />
      <div className="min-w-0">
        {note && <p className="text-[13px] leading-relaxed text-ink-700 dark:text-slate-300">{note}</p>}
        <div className="mt-1.5 flex flex-wrap gap-2">
          {item.dimensions.map((d) => (
            <span key={d.dimension} className="rounded-md bg-ink-100 dark:bg-slate-800 px-2 py-0.5 text-[12px] tabular-nums text-ink-700 dark:text-slate-300">
              {DIMENSION_SHORT[d.dimension] || d.dimension} {points(d.then)} → {points(d.now)}
              <span className="text-ink-400 dark:text-slate-500"> / {d.weight}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="text-right tabular-nums">
        <div className={`text-[15px] font-semibold ${scoreText(item.score_now)}`}>
          {points(item.score_then)} → {points(item.score_now)}
        </div>
        <div className={`text-[12px] font-semibold ${up ? 'text-brand-600 dark:text-brand-400' : BAD}`}>
          {up ? '+' : '−'}
          {points(Math.abs(item.change))}
          {item.crossed_70 && ` · ${item.crossed_70 === 'up' ? 'now above' : 'now below'} 70`}
        </div>
      </div>
    </div>
  );
}

function MoverList({ title, movers, falling }) {
  return (
    <div className="rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-w-0">
      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500 dark:text-slate-400">{title}</div>
      {movers.length === 0 ? (
        <div className="px-4 pb-3 text-[13px] text-ink-500 dark:text-slate-400">No ASIN moved 5% or more.</div>
      ) : (
        <div className="divide-y divide-ink-100 dark:divide-slate-800">
          {movers.map((m) => (
            <div key={m.asin} className="flex items-start gap-3 px-4 py-2.5">
              <AsinLabel asin={m.asin} name={m.product_name} />
              <div className="ml-auto text-right shrink-0">
                <div className={`text-[13px] font-semibold tabular-nums ${pctTone(m.change_pct)}`}>
                  {pct(m.change_pct)} · {money(m.change)}
                </div>
                <div className="text-[11.5px] text-ink-500 dark:text-slate-400">
                  {round1(m.share_pct)}% of the {falling ? 'fall' : 'rise'}
                  {m.causes.length ? ` · ${m.causes.map((c) => causeText(c, falling)).join(', ')}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeeklyReview({ account }) {
  const c = account.counts;
  const t = account.totals;
  const issues = account.issues || [];
  const content = account.content || [];
  const weekDays = account.days_found || [];
  const issueNotes = Object.fromEntries((account.issue_notes || []).map((n) => [`${n.asin}|${n.name}`, n.note]));
  const contentNotes = Object.fromEntries((account.content_notes || []).map((n) => [n.asin, n.note]));
  const missing = account.days_missing || [];
  return (
    <CompanyCard>
      <CompanyHeader
        name={account.name}
        marketplace={account.marketplace}
        channels={account.channels}
        status={account.status}
        meta={`Week ${rangeLabel(account.week)} · ${weekDays.length} of 7 daily checks${
          missing.length ? ` (none on ${missing.map((d) => dayLabel(d, false)).join(', ')})` : ''
        }`}
      />
      <ErrorsBand errors={account.errors} />
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Resolved" value={num(c.resolved)} sub="issues cleared this week" tone={c.resolved ? 'text-brand-600 dark:text-brand-400' : undefined} />
        <Tile label="New" value={num(c.new)} sub="opened this week" tone={c.new ? 'text-amber-600 dark:text-amber-400' : undefined} />
        <Tile
          label="Still open"
          value={num(c.still_open)}
          sub={`open now: ${num(c.worse)} worse · ${num(c.better)} better`}
          tone={c.worse ? BAD : undefined}
        />
        <Tile
          label="Content"
          value={`${num(c.content_improved)} ↑ · ${num(c.content_declined)} ↓`}
          sub={`${num(c.clean_all_week)} of ${num(c.asins)} ASINs clean all week`}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
        <Tile label="Revenue · week" value={money(t.revenue)} sub={`${pct(t.revenue_change_pct)} on ${money(t.revenue_prev)}`} />
        <Tile label="Units" value={num(t.units)} sub={`${pct(t.units_change_pct)} on ${num(t.units_prev)}`} />
        <Tile label="PO $" value={money(t.po_dollars)} sub={isNone(t.po_dollars) ? 'sold 3P only' : `${pct(t.po_change_pct)} on ${money(t.po_dollars_prev)}`} />
        <Tile
          label="Buy box held"
          value={isNone(t.buy_box_held_pct) ? NONE : `${round1(t.buy_box_held_pct)}%`}
          sub={`last week ${isNone(t.buy_box_held_pct_prev) ? NONE : `${round1(t.buy_box_held_pct_prev)}%`}`}
        />
        <Tile
          label="Suppressed"
          value={num(t.suppressed_now)}
          sub={`a week ago ${num(t.suppressed_week_ago)} · Prime ${isNone(t.prime_pct) ? NONE : `${round1(t.prime_pct)}%`}`}
          tone={t.suppressed_now > t.suppressed_week_ago ? BAD : undefined}
        />
      </div>
      <Message text={account.message} />
      {issues.length === 0 && (
        <Section title="Issues">
          <Empty>No alert on any day this week.</Empty>
        </Section>
      )}
      {ISSUE_GROUPS.map((g) => {
        const rows = issues.filter((i) => i.status === g.status);
        if (!rows.length) return null;
        return (
          <Section key={g.status} title={g.title} count={rows.length}>
            <div className="rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-ink-100 dark:divide-slate-800">
              {rows.map((i) => (
                <IssueRow key={`${i.asin}-${i.name}`} issue={i} note={issueNotes[`${i.asin}|${i.name}`]} weekDays={weekDays} />
              ))}
            </div>
          </Section>
        );
      })}
      <Section title="Content that moved" count={content.length}>
        {content.length === 0 ? (
          <Empty>No content score moved this week.</Empty>
        ) : (
          <div className="rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-ink-100 dark:divide-slate-800">
            {content.map((item) => (
              <ContentChangeRow key={item.asin} item={item} note={contentNotes[item.asin]} />
            ))}
          </div>
        )}
      </Section>
      <Section title="What moved revenue">
        <div className="grid gap-3 md:grid-cols-2">
          <MoverList title="Down" movers={account.movers_down || []} falling />
          <MoverList title="Up" movers={account.movers_up || []} falling={false} />
        </div>
      </Section>
    </CompanyCard>
  );
}
*/

/* The weekly check-in before the weekly review replaced it (2026-10-29): the top 20
   by revenue, re-checked like a smaller daily. Restore with the backend's commented
   weekly check-in, the 'Weekly check-in' tab label and STORAGE_VERSION.weekly 'v2'.

function steadyFactsLine(facts, count) {
  if (!facts || !count) return null;
  const parts = [
    `buy box held all week ${facts.buy_box_held_all_week}/${count}`,
    `Prime all week ${facts.prime_all_week}/${count}`,
    `prices matched ${facts.prices_matched}/${count}`,
  ];
  if (!isNone(facts.lowest_cdq)) parts.push(`lowest content score ${points(facts.lowest_cdq)}`);
  if (!isNone(facts.revenue_change_min_pct) || !isNone(facts.revenue_change_max_pct)) {
    parts.push(`revenue ${pct(facts.revenue_change_min_pct)} to ${pct(facts.revenue_change_max_pct)} WoW`);
  }
  return parts.join(' · ');
}

function ActOnRow({ item }) {
  return (
    <div className="grid gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[220px_1fr_auto]">
      <AsinLabel asin={item.asin} name={item.product_name} />
      <div className="min-w-0">
        <p className="text-[13.5px] leading-relaxed text-ink-800 dark:text-slate-200">{item.what_happened}</p>
        <EvidenceChips chips={chipsFor(item.rules.map((r) => r.rule_id), item.evidence)} />
      </div>
      <div className="flex flex-wrap items-start gap-1.5 md:justify-end">
        <SeverityChip severity={item.severity} />
        <RuleIds rules={item.rules} />
      </div>
    </div>
  );
}

function WeeklyCheckIn({ account }) {
  const st = account.stats;
  const actOn = account.act_on || [];
  const steady = account.steady;
  const facts = steadyFactsLine(steady?.facts, steady?.count);
  return (
    <CompanyCard>
      <CompanyHeader
        name={account.name}
        marketplace={account.marketplace}
        channels={account.channels}
        status={account.status}
        meta={`Week ${rangeLabel(account.week)} · against ${rangeLabel(account.week_prev)}`}
      />
      <ErrorsBand errors={account.errors} />
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Top-20 revenue · week" value={money(st.top20_revenue)} sub={`last week ${money(st.top20_revenue_prev)}`} />
        <Tile label="Week over week" value={pct(st.top20_change_pct)} tone={pctTone(st.top20_change_pct)} />
        <Tile
          label="Need attention"
          value={num(st.need_attention)}
          tone={st.need_attention ? 'text-rose-600 dark:text-rose-400' : undefined}
          sub="top-20 ASINs with an alert"
        />
        <Tile label="Steady" value={num(st.steady)} sub="top 20, nothing firing" />
      </div>
      <Message text={account.message} />
      <Section title="ASINs to act on" count={actOn.length}>
        {actOn.length === 0 ? (
          <Empty>Nothing in the top 20 needs acting on this week.</Empty>
        ) : (
          <div className="rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-ink-100 dark:divide-slate-800">
            <div className="hidden md:grid grid-cols-[220px_1fr_auto] gap-x-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500 dark:text-slate-400">
              <span>ASIN</span>
              <span>What happened</span>
              <span>Severity</span>
            </div>
            {actOn.map((a) => (
              <ActOnRow key={a.asin} item={a} />
            ))}
          </div>
        )}
      </Section>
      {steady && (
        <Section title="Steady" count={steady.count}>
          <div className="flex items-start gap-2 rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
            <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
            <div className="min-w-0">
              <p className="text-[13.5px] text-ink-700 dark:text-slate-300">
                {steady.sentence ||
                  `${num(steady.count)} top-20 ASIN${steady.count === 1 ? '' : 's'} had nothing firing this week.`}
              </p>
              {facts && <p className="mt-1 text-[12px] text-ink-500 dark:text-slate-400">{facts}</p>}
            </div>
          </div>
        </Section>
      )}
    </CompanyCard>
  );
}
*/

// ── tab 3: content fixes ────────────────────────────────────────────────────────

function DimensionBars({ dimensions }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {dimensions.map((d) => {
        const share = isNone(d.points) || !d.weight ? null : d.points / d.weight;
        return (
          <div key={d.dimension} className="min-w-0" title={`${d.dimension}: ${points(d.points)} of ${points(d.weight)}`}>
            <div className="text-[10.5px] text-ink-500 dark:text-slate-400 truncate">
              {DIMENSION_SHORT[d.dimension] || d.dimension}
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-ink-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${shareBar(share)}`}
                style={{ width: `${share === null ? 100 : Math.max(4, share * 100)}%` }}
              />
            </div>
            <div className="mt-0.5 text-[10.5px] tabular-nums text-ink-500 dark:text-slate-400">
              {points(d.points)}/{points(d.weight)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Sub-attributes that lost points or were never scored, the biggest loss first.
function lostChecks(dimensions) {
  const lost = (s) => (isNone(s.points) ? s.weight : s.weight - s.points);
  return dimensions
    .flatMap((d) => d.sub_attributes || [])
    .filter((s) => isNone(s.points) || s.points < s.weight)
    .sort((a, b) => lost(b) - lost(a));
}

/* The PDP hand-off panel; the hand-off is later work (2026-10-29).
function PdpPanel({ input }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const text = JSON.stringify(input, null, 2);
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(text))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => setCopied(false));
  }
  const images = input.image_urls || [];
  return (
    <div className="rounded-xl border border-brand-100 dark:border-brand-500/20 bg-brand-50/60 dark:bg-brand-500/5 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink-900 dark:text-slate-100">Open in PDP Agent</div>
          <div className="text-[12px] text-ink-500 dark:text-slate-400">
            A ready raw-input body for an Amazon listing. Needs a Foundation thread to run.
          </div>
        </div>
        <button
          type="button"
          onClick={copy}
          className="ml-auto rounded-lg border border-brand-300 dark:border-brand-500/40 bg-white dark:bg-slate-900 px-3 py-1.5 text-[12.5px] font-medium text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition"
        >
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
      </div>
      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 px-3 py-2 text-[12px] leading-relaxed text-ink-700 dark:text-slate-300 font-sans">
        {input.product_text}
      </pre>
      <div className="mt-2 text-[12px] text-ink-500 dark:text-slate-400">
        {images.length} image{images.length === 1 ? '' : 's'} included
      </div>
    </div>
  );
}
*/

// `ruleIds`: the content alerts (A9 / A10) the daily raised on this ASIN.
function ContentCard({ item, ruleIds }) {
  const { names } = useContext(Lookup);
  const [open, setOpen] = useState(ruleIds.length > 0);
  const score = item.cdq?.score;
  const dimensions = item.cdq?.dimensions || [];
  return (
    <div className="rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div
          className={`h-12 w-12 shrink-0 rounded-full border-2 grid place-items-center text-[15px] font-semibold tabular-nums ${scoreRing(score)}`}
          title={isNone(score) ? 'Not fully scored — a judged check is missing' : 'Content score out of 100'}
        >
          {isNone(score) ? NONE : Math.round(score)}
        </div>
        <div className="flex-1 min-w-0">
          <AsinLabel asin={item.asin} name={names[item.asin]} />
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-500 dark:text-slate-400">
            {ruleIds.map((id) => (
              <span
                key={id}
                className="rounded bg-rose-50 dark:bg-rose-500/15 px-1.5 font-mono font-semibold text-rose-700 dark:text-rose-300"
              >
                {id}
              </span>
            ))}
          </div>
        </div>
        <div className="hidden md:block w-[420px] shrink-0">
          <DimensionBars dimensions={item.cdq?.dimensions || []} />
        </div>
        <span className={`text-ink-400 transition ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && (
        <div className="border-t border-ink-100 dark:border-slate-800 px-4 py-3 space-y-4 text-[13px]">
          <div className="md:hidden">
            <DimensionBars dimensions={item.cdq?.dimensions || []} />
          </div>
          {/* Until 2026-10-30 this listed only the checks that lost points, each with who
              scored it and why; the answer now carries each dimension with its
              sub-attributes, weight and points. */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 dark:text-slate-400">
                  <th className="py-1.5 pr-3 font-semibold">Dimension / sub-attribute</th>
                  <th className="py-1.5 pr-3 font-semibold text-right">Weight</th>
                  <th className="py-1.5 font-semibold text-right">Points</th>
                </tr>
              </thead>
              {dimensions.map((d) => (
                <tbody key={d.dimension} className="border-t border-ink-200 dark:border-slate-700">
                  <tr className="font-semibold text-ink-900 dark:text-slate-100">
                    <td className="pt-2 pb-1 pr-3">{d.dimension}</td>
                    <td className="pt-2 pb-1 pr-3 text-right tabular-nums">{points(d.weight)}</td>
                    <td className="pt-2 pb-1 text-right tabular-nums">{points(d.points)}</td>
                  </tr>
                  {(d.sub_attributes || []).map((s) => {
                    const short = isNone(s.points) || s.points < s.weight;
                    return (
                      <tr key={s.sub_attribute} className="text-ink-700 dark:text-slate-300">
                        <td className="py-1 pr-3 pl-4">{s.sub_attribute}</td>
                        <td className="py-1 pr-3 text-right tabular-nums">{points(s.weight)}</td>
                        <td
                          className={`py-1 text-right tabular-nums ${short ? 'font-semibold text-rose-700 dark:text-rose-300' : ''}`}
                          title={isNone(s.points) ? 'Not scored — the judgement is missing.' : undefined}
                        >
                          {points(s.points)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
          {/* The PDP hand-off is later work (2026-10-29): {item.pdp_input && <PdpPanel input={item.pdp_input} />} */}
        </div>
      )}
    </div>
  );
}

function ContentCompany({ account }) {
  const content = account.content || [];
  const contentRules = {};
  for (const a of account.alerts || []) {
    for (const r of a.rules || []) {
      if (r.rule_id === 'A9' || r.rule_id === 'A10') (contentRules[a.asin] ||= []).push(r.rule_id);
    }
  }
  const scored = content.filter((c) => !isNone(c.cdq?.score));
  const under = scored.filter((c) => c.cdq.score < 70).length;
  const unscored = content.length - scored.length;
  const meta = [
    `${content.length} listing${content.length === 1 ? '' : 's'}`,
    `${under} under 70`,
    unscored ? `${unscored} not fully scored` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <CompanyCard>
      <AccountHeader accountId={account.account_id} meta={meta} />
      <ErrorsBand errors={account.errors} />
      <div className="mt-4 space-y-2">
        {content.length === 0 && <Empty>No listing was scored.</Empty>}
        {content.map((c) => (
          <ContentCard key={c.asin} item={c} ruleIds={contentRules[c.asin] || []} />
        ))}
      </div>
    </CompanyCard>
  );
}

// ── tab 4: ASIN data (the preview) ──────────────────────────────────────────────

function Th({ children, right }) {
  return (
    <th className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500 dark:text-slate-400 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function Td({ children, right, mono, tone }) {
  return (
    <td className={`px-3 py-2 whitespace-nowrap align-top ${right ? 'text-right tabular-nums' : ''} ${mono ? 'font-mono text-[12px]' : ''} ${tone || 'text-ink-700 dark:text-slate-300'}`}>
      {children}
    </td>
  );
}

function Sub({ children, tone }) {
  return <div className={`text-[11px] ${tone || 'text-ink-500 dark:text-slate-400'}`}>{children}</div>;
}

// What the last run found for each ASIN, keyed `account_id → asin → { rules, score }`.
// Rules come from the daily run's `alerts`, the score from its `content`.
function findingsByAsin(result) {
  const out = {};
  for (const account of result?.accounts || []) {
    const byAsin = {};
    const entry = (asin) => (byAsin[asin] ||= { rules: [], score: null });
    for (const a of account.alerts || []) {
      for (const r of a.rules || []) {
        entry(a.asin).rules.push({ rule_id: r.rule_id, name: RULE_NAMES[r.rule_id], severity: r.severity });
      }
    }
    // The old weekly check-in's rules: for (const a of account.act_on || []) entry(a.asin).rules.push(...a.rules);
    for (const c of account.content || []) entry(c.asin).score = c.cdq?.score ?? null;
    out[account.account_id] = byAsin;
  }
  return out;
}

function RunCells({ finding, ran }) {
  if (!ran) {
    return (
      <>
        <Td tone={MUTED}>not run</Td>
        <Td right tone={MUTED}>{NONE}</Td>
      </>
    );
  }
  return (
    <>
      <Td>
        {finding?.rules.length ? <RuleIds rules={finding.rules} /> : <span className="text-brand-600 dark:text-brand-400">quiet</span>}
      </Td>
      <Td right tone={scoreText(finding?.score)}>{isNone(finding?.score) ? NONE : points(finding.score)}</Td>
    </>
  );
}

// Each ASIN's latest raw snapshot row, with its listing's name and channels.
function latestRows(company) {
  const latest = {};
  for (const r of company.snapshots || []) {
    if (!latest[r.asin] || r.snapshot_date > latest[r.asin].snapshot_date) latest[r.asin] = r;
  }
  return (company.listings || [])
    .filter((l) => latest[l.asin])
    .map((l) => ({ asin: l.asin, product_name: l.product_name, channels: l.channels, row: latest[l.asin] }));
}

function RawTable({ items, findings, ran }) {
  return (
    <table className="w-full text-[12.5px]">
      <thead className="bg-ink-50 dark:bg-slate-900/60">
        <tr>
          <Th>ASIN · product</Th>
          <Th>Sold</Th>
          <Th>Run alerts</Th>
          <Th right>Content</Th>
          <Th right>Revenue</Th>
          <Th right>Units</Th>
          <Th right>Sessions</Th>
          <Th right>PO $</Th>
          <Th>Buy box</Th>
          <Th>Prime</Th>
          <Th>Listing</Th>
          <Th right>Price / MF</Th>
          <Th right>Amazon stock</Th>
          <Th right>Batavia</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100 dark:divide-slate-800">
        {items.map(({ asin, product_name, channels, row: r }) => {
          const priceOff = !isNone(r.amazon_list_price) && !isNone(r.masterfile_list_price) && r.amazon_list_price !== r.masterfile_list_price;
          return (
            <tr key={asin}>
              <Td>
                <span className="block max-w-[260px] truncate text-ink-900 dark:text-slate-100" title={product_name}>
                  {product_name}
                </span>
                <span className="font-mono text-[11.5px] text-ink-500 dark:text-slate-400">{asin}</span>
              </Td>
              <Td>{channelsText(channels)}</Td>
              <RunCells finding={findings[asin]} ran={ran} />
              <Td right>{money(r.ordered_revenue, 2)}</Td>
              <Td right>{num(r.ordered_units)}</Td>
              <Td right>{num(r.sessions)}</Td>
              <Td right>{money(r.po_dollars)}</Td>
              <Td tone={holdsBuyBox(r.buy_box_holder) ? undefined : `${BAD} font-medium`}>
                {HOLDER_TEXT[r.buy_box_holder] || r.buy_box_holder}
                <Sub>
                  {money(r.buy_box_price, 2)} · {isNone(r.featured_offer_pct) ? NONE : `${round1(r.featured_offer_pct)}%`} featured
                </Sub>
              </Td>
              <Td tone={r.prime_eligible === false ? `${BAD} font-medium` : undefined}>
                {isNone(r.prime_eligible) ? NONE : r.prime_eligible ? 'yes' : 'no'}
              </Td>
              <Td tone={r.listing_status === 'active' ? undefined : `${BAD} font-medium`}>
                <span title={r.suppression_reasons?.join(', ') || undefined}>{r.listing_status}</span>
              </Td>
              <Td right tone={priceOff ? BAD : undefined}>
                {money(r.amazon_list_price, 2)} / {money(r.masterfile_list_price, 2)}
              </Td>
              <Td right>
                {num(r.amazon_on_hand)}
                <Sub>{num(r.amazon_inbound)} inbound</Sub>
              </Td>
              <Td right>
                {num(r.internal_on_hand)}
                {r.internal_on_hand_confidence === 'manual' && <ManualTag />}
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// `data`: the raw dummy data, every company; `result`: the last daily run.
function DataView({ data, result }) {
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const findings = useMemo(() => findingsByAsin(result), [result]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-ink-500 dark:text-slate-400">
        <span>
          The raw data the run reads (the dummy data API), on each ASIN's latest day.
          {result
            ? ` Run alerts and content scores are from the last daily run${result.ran_at ? ` (${new Date(result.ran_at).toLocaleString()})` : ''}.`
            : ' Run the daily check to see each ASIN’s alerts and content score here.'}
        </span>
        <label className="ml-auto inline-flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
          Only ASINs with an alert
        </label>
      </div>
      {data.accounts.map((company) => {
        const accountId = company.account.account_id;
        const accountFindings = findings[accountId] || {};
        const ran = Boolean(result?.accounts?.some((a) => a.account_id === accountId));
        const all = latestRows(company);
        const items = onlyFlagged ? all.filter((x) => accountFindings[x.asin]?.rules.length > 0) : all;
        const asOf = all.reduce((d, x) => (x.row.snapshot_date > d ? x.row.snapshot_date : d), '');
        return (
          <div key={accountId} className="rounded-2xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="px-5 pt-4 pb-3">
              <AccountHeader accountId={accountId} meta={`${all.length} ASINs · raw data for ${dayLabel(asOf)}`} />
            </div>
            <div className="overflow-x-auto border-t border-ink-100 dark:border-slate-800">
              {items.length === 0 ? (
                <div className="px-5 py-4 text-[13px] text-ink-500 dark:text-slate-400">No ASIN with an alert.</div>
              ) : (
                <RawTable items={items} findings={accountFindings} ran={ran} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* The ASIN data tab over the backend's `/daily/preview` (computed figures, code-only
   rules and code points), until that route was commented out on 2026-10-29.

function AsinTable({ rows, findings, ran }) {
  return (
    <table className="w-full text-[12.5px]">
      <thead className="bg-ink-50 dark:bg-slate-900/60">
        <tr>
          <Th>ASIN · product</Th>
          <Th>Sold</Th>
          <Th>Code rules</Th>
          <Th>Run alerts</Th>
          <Th right>Content</Th>
          <Th right>Revenue 7d</Th>
          <Th right>Sessions</Th>
          <Th right>PO $ 7d</Th>
          <Th>Buy box</Th>
          <Th>Prime</Th>
          <Th>Listing</Th>
          <Th right>Price / MF</Th>
          <Th right>Days of cover</Th>
          <Th right>Batavia</Th>
          <Th right>Code points</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100 dark:divide-slate-800">
        {rows.map((a) => {
          const prime = isNone(a.prime_eligible)
            ? { text: NONE, tone: MUTED }
            : a.prime_eligible
              ? { text: 'yes' }
              : { text: a.prime_lost ? 'lost' : 'no', tone: `${BAD} font-medium` };
          const cover = a.days_of_cover;
          return (
            <tr key={a.asin}>
              <Td>
                <span className="block max-w-[260px] truncate text-ink-900 dark:text-slate-100" title={a.product_name}>
                  {a.product_name}
                </span>
                <span className="font-mono text-[11.5px] text-ink-500 dark:text-slate-400">{a.asin}</span>
                {a.top_quartile && <span className="ml-1.5 text-[10.5px] text-ink-400 dark:text-slate-500">top 25%</span>}
              </Td>
              <Td>{channelsText(a.channels)}</Td>
              <Td>{a.rules?.length ? <RuleIds rules={a.rules} /> : <span className={MUTED}>none</span>}</Td>
              <RunCells finding={findings[a.asin]} ran={ran} />
              <Td right>
                {money(a.revenue_7d)}
                <Sub tone={pctTone(a.revenue_change_pct)}>{pct(a.revenue_change_pct)}</Sub>
              </Td>
              <Td right>
                {num(a.sessions_7d)}
                <Sub tone={pctTone(a.sessions_change_pct)}>{pct(a.sessions_change_pct)}</Sub>
              </Td>
              <Td right>
                {money(a.po_dollars_7d)}
                <Sub tone={pctTone(a.po_change_pct)}>{pct(a.po_change_pct)}</Sub>
              </Td>
              <Td tone={holdsBuyBox(a.buy_box_holder) ? undefined : `${BAD} font-medium`}>
                {HOLDER_TEXT[a.buy_box_holder] || a.buy_box_holder}
                <Sub>
                  {a.buy_box_lost_days ? `lost ${a.buy_box_lost_days}d · ` : ''}
                  {isNone(a.featured_offer_pct) ? NONE : `${round1(a.featured_offer_pct)}%`} featured
                </Sub>
              </Td>
              <Td tone={prime.tone}>{prime.text}</Td>
              <Td tone={a.listing_status === 'active' ? undefined : `${BAD} font-medium`}>
                <span title={a.suppression_reasons?.join(', ') || undefined}>{a.listing_status}</span>
              </Td>
              <Td right tone={a.price_mismatch_days ? BAD : undefined}>
                {money(a.our_price, 2)} / {money(a.masterfile_price, 2)}
                {a.price_mismatch_days > 0 && <Sub tone={BAD}>differs {a.price_mismatch_days}d</Sub>}
              </Td>
              <Td right tone={!isNone(cover) && cover < 10 ? `${BAD} font-medium` : undefined}>
                {days(cover)}
                <Sub>{num(a.amazon_on_hand)} on hand</Sub>
              </Td>
              <Td right>
                {num(a.internal_on_hand)}
                {a.internal_on_hand_confidence === 'manual' && <ManualTag />}
              </Td>
              <Td right>
                {points(a.content_code_points)}
                <span className="text-ink-400 dark:text-slate-500"> / {CODE_POINTS}</span>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function DataView({ run, preview, result, marketplaces }) {
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const findings = useMemo(() => findingsByAsin(result), [result]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-ink-500 dark:text-slate-400">
        <span>
          Every figure is worked out by the backend before any model call. Code rules are those that fire without the
          content score; code points are the {CODE_POINTS} of 100 content points code scores alone.
          {result
            ? ` Run alerts and content scores are from the last ${run} run${result.ran_at ? ` (${new Date(result.ran_at).toLocaleString()})` : ''}.`
            : ` Run the ${run} check to see each ASIN's alerts and content score here.`}
        </span>
        <label className="ml-auto inline-flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
          Only flagged ASINs
        </label>
      </div>
      {preview.accounts.map((account) => {
        const accountFindings = findings[account.account_id] || {};
        const ran = Boolean(result?.accounts?.some((a) => a.account_id === account.account_id));
        const flagged = (a) => a.rules?.length > 0 || accountFindings[a.asin]?.rules.length > 0;
        const rows = onlyFlagged ? account.asins.filter(flagged) : account.asins;
        const meta =
          run === 'daily'
            ? `${account.asins.length} ASINs · snapshot as of ${dayLabel(account.as_of)}`
            : `Top ${account.asins.length} by revenue · week ${rangeLabel(account.week)} · against ${rangeLabel(account.week_prev)}`;
        return (
          <div key={account.account_id} className="rounded-2xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="px-5 pt-4 pb-3">
              <CompanyHeader
                name={account.name}
                marketplace={account.marketplace || marketplaces[account.account_id]}
                channels={account.channels}
                meta={meta}
              />
            </div>
            <div className="overflow-x-auto border-t border-ink-100 dark:border-slate-800">
              {rows.length === 0 ? (
                <div className="px-5 py-4 text-[13px] text-ink-500 dark:text-slate-400">No flagged ASIN.</div>
              ) : (
                <AsinTable rows={rows} findings={accountFindings} ran={ran} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
*/

// ── the screen ──────────────────────────────────────────────────────────────────

function SegmentButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-[12.5px] font-medium transition ${
        active
          ? 'bg-ink-900 text-white dark:bg-slate-100 dark:text-slate-900'
          : 'text-ink-500 dark:text-slate-400 hover:text-ink-800 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function CompanyPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[12.5px] transition ${
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400'
          : 'border-ink-200 dark:border-slate-700 text-ink-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

export default function AsinHealthScreen({
  activeView = 'asin_health',
  onSelectView,
  projectName = 'ASIN Health',
  onNewProject,
  hideFoundation,
}) {
  const [tab, setTab] = useState('digest');
  const [data, setData] = useState(null); // the raw dummy data, every company
  // The mock daily answers the weekly was sent until 2026-10-30:
  // const [dailies, setDailies] = useState(null);
  const [selected, setSelected] = useState(null); // the company shown; the first once the data loads
  const [results, setResults] = useState(() => ({ daily: readStored('daily'), weekly: readStored('weekly') }));
  const [running, setRunning] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const runAbort = useRef(null);

  // Which run the open tab reads, and so which run its button starts. Content fixes
  // and ASIN data read the daily run.
  const tabRun = tab === 'weekly' ? 'weekly' : 'daily';

  // The raw data names every company and ASIN, and fills the ASIN data tab.
  useEffect(() => {
    const ctrl = new AbortController();
    getAsinHealthData(ctrl.signal)
      .then(setData)
      .catch((e) => e.name !== 'AbortError' && setError(e.message));
    return () => ctrl.abort();
  }, []);

  // The weekly on our dailies drew its day strips from the dailies it sent (until 2026-10-30):
  // useEffect(() => {
  //   if (tab === 'weekly' && !dailies) loadMockDailies().then(setDailies);
  // }, [tab, dailies]);

  const lookup = useMemo(() => {
    const accounts = {};
    const names = {};
    for (const c of data?.accounts || []) {
      accounts[c.account.account_id] = { ...c.account, asin_count: c.listings.length };
      for (const l of c.listings) names[l.asin] = l.product_name;
    }
    return { accounts, names };
  }, [data]);
  const companies = Object.values(lookup.accounts);

  useEffect(() => {
    if (!selected && companies.length) setSelected(companies[0].account_id);
  }, [selected, companies]);

  useEffect(() => {
    if (!running) return undefined;
    const started = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => () => runAbort.current?.abort(), []);

  async function startRun() {
    const ctrl = new AbortController();
    runAbort.current = ctrl;
    const which = tabRun;
    setRunning(which);
    setError(null);
    try {
      const body = await runAsinHealth(which, ctrl.signal);
      const stored = { ...body, ran_at: new Date().toISOString() };
      setResults((r) => ({ ...r, [which]: stored }));
      writeStored(which, stored);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setRunning(null);
    }
  }

  const pick = (list) => (list || []).filter((a) => a.account_id === selected);
  const shownResult = results[tabRun];

  function noRun(run) {
    return (
      <Empty>
        No {run} run yet. Press <span className="font-medium">{RUN_LABELS[run]}</span> to check every company — it takes a
        minute or two. Meanwhile,{' '}
        <button type="button" className="underline" onClick={() => setTab('data')}>
          ASIN data
        </button>{' '}
        shows the raw data the run will read.
      </Empty>
    );
  }

  let body;
  if (tab === 'data') {
    body = data ? (
      <DataView
        data={{ ...data, accounts: data.accounts.filter((c) => c.account.account_id === selected) }}
        result={results.daily}
      />
    ) : (
      <Empty>Loading the data…</Empty>
    );
  } else if (tab === 'digest') {
    body = results.daily ? (
      <div className="space-y-6">
        {pick(results.daily.accounts).map((a) => (
          <DailyDigest key={a.account_id} account={a} />
        ))}
      </div>
    ) : (
      noRun('daily')
    );
  } else if (tab === 'weekly') {
    body = results.weekly ? (
      <div className="space-y-6">
        {pick(results.weekly.accounts).map((a) => (
          <WeeklyActOn key={a.account_id} account={a} />
        ))}
      </div>
    ) : (
      noRun('weekly')
    );
    // The weekly on our dailies (until 2026-10-30):
    // body = !results.weekly ? (
    //   noRun('weekly')
    // ) : dailies ? (
    //   <div className="space-y-6">
    //     {pick(results.weekly.accounts).map((a) => (
    //       <WeeklyReview key={a.account_id} account={a} dailies={dailies} />
    //     ))}
    //   </div>
    // ) : (
    //   <Empty>Loading the daily checks the review was sent…</Empty>
    // );
  } else {
    body = results.daily ? (
      <div className="space-y-6">
        {pick(results.daily.accounts).map((a) => (
          <ContentCompany key={a.account_id} account={a} />
        ))}
      </div>
    ) : (
      <Empty>
        No run yet. Press <span className="font-medium">{RUN_LABELS.daily}</span> to score every listing's content.
      </Empty>
    );
  }

  return (
    <Lookup.Provider value={lookup}>
    <div className="h-screen flex bg-ink-50 dark:bg-slate-950">
      <Sidebar
        projectName={projectName}
        activeView={activeView}
        onSelectView={onSelectView}
        onNewProject={onNewProject}
        hideFoundation={hideFoundation}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="min-h-14 px-6 py-2 flex flex-wrap items-center gap-4 border-b border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-ink-900 dark:text-slate-100">ASIN Health</h1>
            <div className="text-[11px] text-ink-400 dark:text-slate-500">
              {companies.length
                ? `${companies.length} companies · ${companies.reduce((n, a) => n + a.asin_count, 0)} ASINs · mock data`
                : 'Loading companies…'}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {results[tabRun]?.ran_at && !running && (
              <span className="hidden md:inline-flex items-center gap-1 text-[12px] text-ink-500 dark:text-slate-400">
                <IconClock width={13} height={13} /> Last {tabRun} run {new Date(results[tabRun].ran_at).toLocaleString()}
              </span>
            )}
            <button
              type="button"
              onClick={startRun}
              disabled={Boolean(running)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-wait transition"
            >
              <IconZap width={15} height={15} />
              {running ? `Running ${running}… ${elapsedLabel(elapsed)}` : RUN_LABELS[tabRun]}
            </button>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
        <AsinHealthChat companies={companies} selected={selected} />
        <div className="flex-1 flex flex-col min-w-0">
        <nav
          role="tablist"
          aria-label="ASIN Health views"
          className="px-6 flex gap-1 overflow-x-auto border-b border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition ${
                tab === t.id
                  ? 'border-brand-600 text-ink-900 dark:border-brand-400 dark:text-slate-100'
                  : 'border-transparent text-ink-500 dark:text-slate-400 hover:text-ink-800 dark:hover:text-slate-200'
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold ${
                  tab === t.id
                    ? 'bg-brand-600 text-white dark:bg-brand-500'
                    : 'bg-ink-100 text-ink-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {i + 1}
              </span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1280px] mx-auto px-6 py-5">
            <div className="flex flex-wrap items-center gap-2">
              {companies.map((a) => (
                <CompanyPill key={a.account_id} active={selected === a.account_id} onClick={() => setSelected(a.account_id)}>
                  {a.name} <span className="text-ink-400 dark:text-slate-500">{a.asin_count}</span>
                </CompanyPill>
              ))}
              {/* The daily / weekly switch for ASIN data went with the weekly check-in's preview:
              {tab === 'data' && (
                <div className="ml-auto flex rounded-lg border border-ink-200 dark:border-slate-700 p-0.5">
                  <SegmentButton active={dataRun === 'daily'} onClick={() => setDataRun('daily')}>
                    Daily
                  </SegmentButton>
                  <SegmentButton active={dataRun === 'weekly'} onClick={() => setDataRun('weekly')}>
                    Weekly
                  </SegmentButton>
                </div>
              )} */}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-500 dark:text-slate-400">
              {shownResult?.date && (
                <span>
                  {tab === 'content' ? 'Content scores from the daily run for' : `${tabRun === 'daily' ? 'Daily' : 'Weekly'} run for`}{' '}
                  {dayLabel(shownResult.date)}
                </span>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-[13px] text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="mt-5">{body}</div>
          </div>
        </div>
        </div>
        </div>
      </main>
    </div>
    </Lookup.Provider>
  );
}
