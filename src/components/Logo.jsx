import React from 'react';

export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-7 w-7 rounded-md bg-brand-500 grid place-items-center shadow-sm">
        <span className="text-white text-[13px] font-bold leading-none">G</span>
      </div>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-ink-900 dark:text-slate-100">Growvana</span>
      )}
    </div>
  );
}
