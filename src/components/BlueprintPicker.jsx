import React, { useEffect, useId, useState } from 'react';
import { IconCheck, IconSettings } from './icons.jsx';
import { listThreads } from '../lib/threadHistoryApi.js';

// Pick an existing Foundation Blueprint to hand an agent as its brand context.
//
// This is what replaced "Generate Blueprint in Foundation" inside the email flow.
// Building a Blueprint is the Foundation agent's own job and now has its own entry;
// what the consuming agents need is to POINT AT one that already exists, which is a
// different action and a much shorter one.
//
// The list shows the Blueprints the backend can see, tagged `foundation` — on a
// Foundation thread that tag means "has accepted deliverables", so one still being
// built is counted separately rather than offered as finished.
//
// **THE LIST IS A CONVENIENCE, NOT THE LIMIT.** Any Foundation thread id can be used,
// typed or pasted, whether or not it appears above: the roster is capped, it only
// covers threads this backend's database holds, and someone may simply have the id
// from elsewhere. The backend is the real check — it reads the Blueprint at
// `phase_1::<id>` and refuses the init if there is nothing there — so the field is
// free text on purpose rather than validated against the list.

export default function BlueprintPicker({
  selectedId,
  onPick,
  onBuildNew,
  className = '',
  // Set false where a raw id makes no sense to the reader. On by default: the whole
  // point is that any Foundation thread can be used.
  allowManual = true,
}) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    // FILTERED SERVER-SIDE, and that is load-bearing. This used to fetch a page of
    // threads and filter it here, which silently capped what could ever be picked:
    // the page held the newest 50 threads of any kind, so a Blueprint older than the
    // 50th most recent Foundation thread never appeared — 38 existed and 28 showed.
    // `limit` now counts Blueprints rather than threads.
    listThreads('foundation', {
      blueprint: 'foundation',
      limit: 100,
      signal: controller.signal,
    })
      .then((rows) => {
        if (!controller.signal.aborted) setThreads(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        if (controller.signal.aborted || e.name === 'AbortError') return;
        setError(e.message || 'Could not load Blueprints');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  // The server already returned only finished Blueprints, so everything here is
  // ready. The `building` count that used to sit under this list is GONE with the
  // client-side filter that produced it: it was the remainder of one capped page
  // ("22 still being built" when the real figure was 33), which is worse than not
  // saying it — the note below states the rule instead of guessing a number.
  const ready = threads;

  // The free-text field shows the selection ONLY when it is not one of the rows
  // above. Otherwise clicking a row would fill the box too, and it would read as
  // two separate choices having been made when there is only ever one.
  const pickedFromList = ready.some((t) => t.thread_id === selectedId);
  const manualValue = pickedFromList ? '' : selectedId || '';
  const manualId = useId();

  return (
    <div className={className}>
      {loading && (
        <p className="text-[12.5px] text-ink-500 dark:text-slate-400">
          Looking for your Blueprints…
        </p>
      )}

      {error && (
        <p className="text-[12.5px] text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && ready.length === 0 && (
        <div className="rounded-lg border border-dashed border-ink-200 dark:border-slate-700 px-4 py-5 text-center">
          <p className="text-[13px] text-ink-600 dark:text-slate-300">
            No finished Blueprints yet.
          </p>
          <p className="mt-1 text-[12px] text-ink-500 dark:text-slate-400">
            Build one with the Foundation agent, or upload a Blueprint PDF instead.
          </p>
          {onBuildNew && (
            <button
              type="button"
              onClick={onBuildNew}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-[12.5px] font-medium text-white transition hover:bg-amber-600"
            >
              <IconSettings width={14} height={14} /> Build a Blueprint
            </button>
          )}
        </div>
      )}

      {ready.length > 0 && (
        <ul className="flex max-h-[240px] flex-col gap-1.5 overflow-y-auto">
          {ready.map((t) => {
            const picked = t.thread_id === selectedId;
            return (
              <li key={t.thread_id}>
                <button
                  type="button"
                  onClick={() => onPick?.(t.thread_id, t.title)}
                  className={[
                    'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition',
                    picked
                      ? 'border-brand-400 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
                      : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50 dark:border-slate-700 dark:hover:border-brand-500/40 dark:hover:bg-slate-800',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink-900 dark:text-slate-100">
                      {t.title || t.thread_id.slice(0, 20)}
                    </span>
                    <span className="block truncate text-[11px] text-ink-400 dark:text-slate-500">
                      {t.thread_id}
                    </span>
                  </span>
                  {picked && (
                    <span className="shrink-0 text-brand-600 dark:text-brand-400">
                      <IconCheck width={15} height={15} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {allowManual && (
        <div className={ready.length > 0 ? 'mt-3' : 'mt-2'}>
          <label
            htmlFor={manualId}
            className="block text-[11.5px] font-medium text-ink-500 dark:text-slate-400"
          >
            Or use any Foundation thread ID
          </label>
          <input
            id={manualId}
            type="text"
            value={manualValue}
            onChange={(e) => onPick?.(e.target.value.trim(), null)}
            placeholder="e.g. 50da3e9e-6e8b-4bb1-8a8d-c0a8f609c195"
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 font-mono text-[12px] text-ink-900 outline-none transition placeholder:font-sans placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-500/20"
          />
          <p className="mt-1 text-[11px] text-ink-400 dark:text-slate-500">
            The list above is only what this backend can see. Any thread that has a
            Blueprint works — the check happens when the agent starts.
          </p>
        </div>
      )}

      {ready.length > 0 && (
        <p className="mt-2.5 text-[11.5px] text-ink-400 dark:text-slate-500">
          Newest first. A Foundation thread appears here once its deliverables have
          been accepted — one still being built can be used by pasting its ID above.
        </p>
      )}
    </div>
  );
}
