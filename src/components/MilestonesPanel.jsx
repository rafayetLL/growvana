import React, { useState, useEffect } from 'react';
import { MILESTONES } from '../lib/milestones.js';
import {
  IconTarget,
  IconChart,
  IconBook,
  IconUsers,
  IconCompass,
  IconCheck,
} from './icons.jsx';
import { Spinner } from './MessageRenderers.jsx';

const SELECTABLE_STATUSES = new Set(['drafted', 'redrafted']);

const MILESTONE_ICON = {
  competitive_analysis: IconTarget,
  market_analysis: IconChart,
  brand_bible: IconBook,
  buyer_personas: IconUsers,
  blueprint: IconCompass,
};

// Status: 'not_started' | 'drafting' | 'drafted' | 'accepted' | 'redrafted'
//   drafting  → spinner (node is running right now)
//   drafted   → amber (fresh draft waiting for you)
//   accepted  → emerald/brand (locked in)
//   redrafted → sky (was accepted, new revision pending)
const STATUS_DOT = {
  not_started: 'bg-ink-200 dark:bg-slate-700',
  drafting: 'bg-violet-500 animate-pulse',
  drafted: 'bg-amber-400',
  accepted: 'bg-brand-500',
  redrafted: 'bg-sky-500',
};

function statusLabel(status) {
  switch (status) {
    case 'drafting': return 'Drafting';
    case 'drafted': return 'Drafted';
    case 'accepted': return 'Accepted';
    case 'redrafted': return 'Revised';
    default: return 'Not Started';
  }
}

function LegendDot({ status, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-500 dark:text-slate-400">
      {status === 'drafting' ? (
        <Spinner size={10} />
      ) : (
        <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
      )}
      {label}
    </span>
  );
}

// Small corner badge on each milestone icon — spinner while drafting, dot otherwise.
function StatusBadge({ status }) {
  if (status === 'drafting') {
    return (
      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white dark:bg-slate-900 ring-2 ring-white dark:ring-slate-900 grid place-items-center">
        <Spinner size={10} />
      </span>
    );
  }
  return (
    <span
      className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${STATUS_DOT[status] || 'bg-ink-200 dark:bg-slate-700'}`}
    />
  );
}

function SelectBox({ checked, onToggle, label }) {
  // Rendered inside an outer <button>. Stop propagation so clicking the box
  // toggles selection without also opening the milestone viewer.
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }
      }}
      className={[
        'mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition cursor-pointer',
        checked
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-ink-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-ink-400 dark:hover:border-slate-500',
      ].join(' ')}
    >
      {checked && <IconCheck width={10} height={10} strokeWidth={3} />}
    </span>
  );
}

export default function MilestonesPanel({
  milestoneStatus,
  milestoneMarkdown,
  activeKey,
  onSelect,
  onAccept,
  acceptDisabled = false,
  overallProgress,
}) {
  const foundationKeys = ['competitive_analysis', 'brand_bible', 'market_analysis', 'buyer_personas'];
  const blueprintKey = 'blueprint';

  const acceptedFoundationCount = foundationKeys.filter(
    (k) => milestoneStatus[k] === 'accepted'
  ).length;

  const [selected, setSelected] = useState(() => new Set());

  // Drop any selected key whose status no longer qualifies (e.g. got accepted
  // in another turn, or re-entered drafting). Keeps the Accept list honest
  // without changing any of the derivation or SSE logic upstream.
  useEffect(() => {
    setSelected((prev) => {
      let changed = false;
      const next = new Set();
      for (const k of prev) {
        if (SELECTABLE_STATUSES.has(milestoneStatus[k])) next.add(k);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [milestoneStatus]);

  function toggleSelect(k) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function handleAcceptClick() {
    if (selected.size === 0 || acceptDisabled) return;
    onAccept?.(Array.from(selected));
    setSelected(new Set());
  }

  const selectedCount = selected.size;

  return (
    <aside className="w-[320px] shrink-0 border-l border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
      {/* Overall progress */}
      <div className="px-5 pt-5 pb-4 border-b border-ink-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-ink-900 dark:text-slate-100">Overall Progress</h3>
          <span className="text-[11.5px] text-ink-500 dark:text-slate-400">{overallProgress}%</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-500 dark:text-slate-400">
          <span>Foundations Phase</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-ink-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Status legend */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-x-3 gap-y-1.5 flex-wrap">
        <LegendDot status="drafting" label="Drafting" />
        <LegendDot status="drafted" label="Drafted" />
        <LegendDot status="accepted" label="Accepted" />
        <LegendDot status="redrafted" label="Revised" />
      </div>

      {/* Foundational deliverables */}
      <div className="px-5 pt-3 pb-3">
        <h4 className="text-[11px] tracking-wider uppercase text-ink-400 dark:text-slate-500 font-semibold">
          Foundational Deliverables
        </h4>
      </div>
      <div className="px-3 flex flex-col gap-1.5">
        {foundationKeys.map((k) => {
          const meta = MILESTONES.find((m) => m.key === k);
          const status = milestoneStatus[k] || 'not_started';
          const active = activeKey === k;
          const hasDraft = !!milestoneMarkdown[k];
          const Icon = MILESTONE_ICON[k];
          const selectable = SELECTABLE_STATUSES.has(status);
          const isSelected = selected.has(k);
          return (
            <button
              key={k}
              onClick={() => hasDraft && onSelect(k)}
              className={[
                'text-left rounded-lg px-3 py-3 border transition',
                active
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : 'border-transparent hover:bg-ink-50 dark:hover:bg-slate-800/80',
                !hasDraft && 'cursor-default',
              ].filter(Boolean).join(' ')}
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-md bg-ink-100 dark:bg-slate-800 grid place-items-center text-ink-500 dark:text-slate-400 shrink-0 relative">
                  {Icon && <Icon width={16} height={16} />}
                  <StatusBadge status={status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={[
                    'text-[13px] font-semibold leading-tight',
                    active ? 'text-ink-900 dark:text-slate-100' : 'text-ink-700 dark:text-slate-200',
                  ].join(' ')}>
                    {meta.label}
                  </div>
                  <div className="text-[11.5px] text-ink-500 dark:text-slate-400 mt-0.5">
                    {statusLabel(status)}
                  </div>
                </div>
                {selectable && (
                  <SelectBox
                    checked={isSelected}
                    onToggle={() => toggleSelect(k)}
                    label={`Select ${meta.label}`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Company Blueprint */}
      <div className="px-5 pt-6 pb-3">
        <h4 className="text-[11px] tracking-wider uppercase text-ink-400 dark:text-slate-500 font-semibold">
          Company Blueprint
        </h4>
      </div>
      <div className="px-3 pb-5">
        {(() => {
          const status = milestoneStatus[blueprintKey] || 'not_started';
          const active = activeKey === blueprintKey;
          const hasDraft = !!milestoneMarkdown[blueprintKey];
          const selectable = SELECTABLE_STATUSES.has(status);
          const isSelected = selected.has(blueprintKey);
          return (
            <button
              onClick={() => hasDraft && onSelect(blueprintKey)}
              className={[
                'w-full text-left rounded-lg px-3 py-3 border transition flex items-start gap-3',
                active
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : 'border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-ink-50 dark:hover:bg-slate-800/80',
                !hasDraft && 'cursor-default',
              ].filter(Boolean).join(' ')}
            >
              <div className="h-8 w-8 rounded-md bg-ink-100 dark:bg-slate-800 grid place-items-center text-ink-500 dark:text-slate-400 shrink-0 relative">
                <IconCompass width={16} height={16} />
                <StatusBadge status={status} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={[
                  'text-[13px] font-semibold leading-tight',
                  active ? 'text-ink-900 dark:text-slate-100' : 'text-ink-700 dark:text-slate-200',
                ].join(' ')}>
                  Company Blueprint
                </div>
                <div className="text-[11.5px] text-ink-500 dark:text-slate-400 mt-0.5">
                  {statusLabel(status)} · {acceptedFoundationCount} of 4 complete
                </div>
              </div>
              {selectable && (
                <SelectBox
                  checked={isSelected}
                  onToggle={() => toggleSelect(blueprintKey)}
                  label="Select Company Blueprint"
                />
              )}
            </button>
          );
        })()}
      </div>

      {selectedCount > 0 && (
        <div className="mt-auto px-3 pb-4 pt-3 border-t border-ink-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={handleAcceptClick}
            disabled={acceptDisabled}
            className={[
              'w-full rounded-lg px-3 py-2 text-[13px] font-medium transition',
              acceptDisabled
                ? 'bg-ink-200 dark:bg-slate-800 text-ink-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm',
            ].join(' ')}
          >
            Accept {selectedCount === 1 ? '1 milestone' : `${selectedCount} milestones`}
          </button>
        </div>
      )}
    </aside>
  );
}
