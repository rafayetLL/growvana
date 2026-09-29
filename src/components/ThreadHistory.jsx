import React, { useCallback, useEffect, useState } from 'react';
import { IconClock, IconChevronDown, IconChevronRight, IconPlus } from './icons.jsx';
import { BLUEPRINT_LABELS, listThreads } from '../lib/threadHistoryApi.js';

// The per-agent thread list that hangs under an agent's sidebar entry.
//
// ONE component serves all four agents, because a roster row is the same shape
// whichever agent wrote it — an id, a title, a blueprint tag and a last-active time.
// What differs between agents is only what the title says, and the backend has
// already decided that.
//
// It fetches on OPEN, not on mount. The list is only visible under the agent the
// user is actually in, and a thread list that refetched every time any sidebar
// re-rendered would hit the backend on every keystroke of a running turn.

// Turns an ISO timestamp into the kind of thing a sidebar says. Deliberately coarse:
// the exact minute is never the question here, "is this the one I had open" is.
function whenText(iso) {
  if (!iso) return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// The three tags, each in its own colour so the list can be read at a glance rather
// than word by word. `none` is deliberately the quiet one — it is an ordinary state,
// not a warning.
const TAG_STYLE = {
  foundation:
    'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
  pdf: 'bg-moss-100 text-moss-700 dark:bg-moss-500/15 dark:text-moss-300',
  none: 'bg-ink-100 text-ink-500 dark:bg-slate-800 dark:text-slate-400',
};

export function BlueprintTag({ blueprint, agent }) {
  const style = TAG_STYLE[blueprint] || TAG_STYLE.none;
  // The Foundation agent MAKES Blueprints rather than consuming one, so the same
  // value answers a different question there and must not read as "came from".
  const label =
    agent === 'foundation'
      ? blueprint === 'foundation'
        ? 'Blueprint ready'
        : 'In progress'
      : BLUEPRINT_LABELS[blueprint] || BLUEPRINT_LABELS.none;
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${style}`}
    >
      {label}
    </span>
  );
}

export default function ThreadHistory({
  agent,
  activeThreadId,
  onOpenThread,
  // Start a fresh thread in THIS agent. Distinct from "New project" at the top of
  // the sidebar, which throws the whole session away — this leaves every other
  // agent where it is.
  onNewThread,
  // Bumped by the parent whenever a turn finishes, so a thread that just gained a
  // title or moved to the top of the list is not stale behind the user.
  refreshKey = 0,
  open: openProp,
  onToggle,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(true);
  const open = openProp === undefined ? uncontrolledOpen : openProp;
  const toggle = onToggle || (() => setUncontrolledOpen((v) => !v));

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    (signal) => {
      setLoading(true);
      setError(null);
      listThreads(agent, { signal })
        .then((rows) => {
          if (!signal?.aborted) setThreads(Array.isArray(rows) ? rows : []);
        })
        .catch((e) => {
          if (signal?.aborted || e.name === 'AbortError') return;
          // A failed list is not a failed session — the agent still works, the
          // user just cannot browse back. Say so quietly and let them retry.
          setError(e.message || 'Could not load threads');
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [agent],
  );

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [open, load, refreshKey]);

  return (
    <div className="mt-0.5">
      {/* Two controls on one row, and they are SEPARATE buttons rather than one with
          an icon inside it: nesting a button in a button is invalid, and collapsing
          the list must never be one mis-click away from starting a new thread. */}
      <div className="ml-7 flex w-[calc(100%-1.75rem)] items-center">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400 transition hover:bg-ink-50 hover:text-ink-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          {open ? (
            <IconChevronDown width={11} height={11} />
          ) : (
            <IconChevronRight width={11} height={11} />
          )}
          <span className="flex-1 truncate text-left">Recent threads</span>
          {loading && <IconClock width={11} height={11} />}
        </button>
        {onNewThread && (
          <button
            type="button"
            onClick={onNewThread}
            title="Start a new thread in this agent"
            aria-label="Start a new thread in this agent"
            className="shrink-0 rounded-md p-1.5 text-ink-400 transition hover:bg-ink-50 hover:text-brand-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-brand-500"
          >
            <IconPlus width={12} height={12} />
          </button>
        )}
      </div>

      {open && (
        <div className="ml-7 mt-0.5 flex flex-col gap-0.5">
          {error && (
            <button
              type="button"
              onClick={() => load()}
              className="rounded-md px-2 py-1.5 text-left text-[11.5px] text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              {error} — retry
            </button>
          )}

          {!error && !loading && threads.length === 0 && (
            <p className="px-2 py-1.5 text-[11.5px] text-ink-400 dark:text-slate-500">
              No threads yet.
            </p>
          )}

          {threads.map((t) => {
            const active = t.thread_id === activeThreadId;
            return (
              <button
                key={t.thread_id}
                type="button"
                onClick={() => onOpenThread?.(t.thread_id)}
                // The id is the tooltip because a title can repeat — three audits of
                // one product look identical in the list otherwise.
                title={`${t.title || 'Untitled'}\n${t.thread_id}`}
                className={[
                  'group rounded-md px-2 py-1.5 text-left transition',
                  active
                    ? 'bg-brand-50 dark:bg-brand-500/15'
                    : 'hover:bg-ink-50 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                <span
                  className={[
                    'block truncate text-[12.5px]',
                    active
                      ? 'font-medium text-brand-700 dark:text-brand-400'
                      : 'text-ink-600 dark:text-slate-300',
                  ].join(' ')}
                >
                  {/* A thread whose init failed part way has no title at all; the
                      id is the only thing that identifies it, so show that rather
                      than a blank row. */}
                  {t.title || t.thread_id.slice(0, 18)}
                </span>
                <span className="mt-1 flex items-center gap-1.5">
                  <BlueprintTag blueprint={t.blueprint} agent={agent} />
                  <span className="truncate text-[10px] text-ink-400 dark:text-slate-500">
                    {whenText(t.updated_at)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
