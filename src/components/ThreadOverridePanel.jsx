import React from 'react';

/**
 * Optional thread-id override input — used in the Execution
 * (EmailAgentScreen) right rail. The override state itself lives in
 * App.jsx so it survives tab switches.
 */
export default function ThreadOverridePanel({
  value,
  onChange,
  defaultThreadId,
  effectiveThreadId,
}) {
  const isOverridden =
    value.trim().length > 0 && value.trim() !== defaultThreadId;

  return (
    <div>
      <div className="text-[11px] tracking-wider uppercase text-ink-400 dark:text-slate-500 font-semibold">
        Thread
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultThreadId}
        className="mt-1.5 w-full text-[12px] font-mono px-2.5 py-1.5 rounded-md border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
      />
      <div className="mt-1.5 text-[10.5px] text-ink-400 dark:text-slate-500 break-all">
        Active: <span className="font-mono">{effectiveThreadId}</span>
        {isOverridden && (
          <span className="ml-1 text-amber-600 dark:text-amber-400">
            (overridden)
          </span>
        )}
      </div>
    </div>
  );
}
