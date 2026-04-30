import React, { useState } from 'react';
import { IconSend, IconAttach, IconX, IconLink, IconPlus } from './icons.jsx';
import { CHAT_FILE_EXTENSIONS, formatExtensions } from '../lib/fileTypes.js';

function fileNameFromUrl(url) {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    return last || u.hostname;
  } catch {
    return url;
  }
}

export default function Composer({ disabled, onSend, placeholder = 'Share your insights…' }) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showAttach, setShowAttach] = useState(false);
  const [draftUrl, setDraftUrl] = useState('');

  function submit() {
    const v = value.trim();
    if (!v || disabled) return;
    onSend(v, attachments.length > 0 ? attachments.slice() : undefined);
    setValue('');
    setAttachments([]);
    setShowAttach(false);
    setDraftUrl('');
  }

  function addDraftUrl() {
    const u = draftUrl.trim();
    if (!u) return;
    if (attachments.includes(u)) {
      setDraftUrl('');
      return;
    }
    setAttachments((prev) => [...prev, u]);
    setDraftUrl('');
  }

  function removeAttachment(url) {
    setAttachments((prev) => prev.filter((u) => u !== url));
  }

  return (
    <div className="border-t border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 md:px-10 py-4">
      <div className="max-w-[900px] mx-auto">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((url) => (
              <span
                key={url}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 text-[12px] rounded-md bg-ink-50 dark:bg-slate-800 border border-ink-200 dark:border-slate-700 text-ink-700 dark:text-slate-200 max-w-[280px]"
                title={url}
              >
                <IconLink width={12} height={12} className="text-ink-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">{fileNameFromUrl(url)}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(url)}
                  className="p-0.5 rounded hover:bg-ink-100 dark:hover:bg-slate-700 text-ink-400 dark:text-slate-500 hover:text-ink-700 dark:hover:text-slate-200 shrink-0"
                  aria-label="Remove attachment"
                >
                  <IconX width={12} height={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {showAttach && (
          <div className="mb-2 flex items-center gap-2 bg-white dark:bg-slate-800/60 border border-ink-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
            <IconLink width={14} height={14} className="text-ink-400 dark:text-slate-500 shrink-0" />
            <input
              type="url"
              value={draftUrl}
              autoFocus
              placeholder={`Paste a pre-signed file URL (${formatExtensions(CHAT_FILE_EXTENSIONS)})`}
              onChange={(e) => setDraftUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDraftUrl();
                } else if (e.key === 'Escape') {
                  setShowAttach(false);
                  setDraftUrl('');
                }
              }}
              className="flex-1 bg-transparent outline-none text-[13px] text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={addDraftUrl}
              disabled={!draftUrl.trim()}
              className="h-7 px-2 inline-flex items-center gap-1 rounded-md bg-brand-500 text-white hover:bg-brand-600 disabled:bg-ink-200 dark:disabled:bg-slate-700 disabled:text-ink-400 dark:disabled:text-slate-500 text-[12px] transition"
            >
              <IconPlus width={12} height={12} /> Add
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 bg-white dark:bg-slate-800/60 border border-ink-200 dark:border-slate-700 rounded-xl px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-500/20 transition">
          <textarea
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              setValue(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none resize-none text-[14px] text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500 py-1.5 max-h-40"
          />
          <button
            type="button"
            onClick={() => setShowAttach((s) => !s)}
            className={
              (showAttach
                ? 'text-brand-600 dark:text-brand-400 '
                : 'text-ink-400 dark:text-slate-500 hover:text-ink-700 dark:hover:text-slate-200 ') +
              'p-1.5 rounded-md transition'
            }
            aria-label="Attach"
            aria-pressed={showAttach}
          >
            <IconAttach width={16} height={16} />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !value.trim()}
            aria-label="Send"
            className="h-8 w-8 grid place-items-center rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:bg-ink-200 dark:disabled:bg-slate-700 disabled:text-ink-400 dark:disabled:text-slate-500 transition"
          >
            <IconSend width={14} height={14} />
          </button>
        </div>
        <div className="mt-1.5 text-[11px] text-ink-400 dark:text-slate-500 text-right pr-1">
          Enter to send · Shift + Enter for newline
        </div>
      </div>
    </div>
  );
}
