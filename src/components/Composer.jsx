import React, { useEffect, useRef, useState } from 'react';
import { IconSend, IconAttach, IconX, IconLink, IconPlus } from './icons.jsx';
import { CHAT_FILE_EXTENSIONS, formatExtensions } from '../lib/fileTypes.js';

const DEFAULT_ATTACH_HINT = 'a file the AI reads for context (not added to the email)';

function fileNameFromUrl(url) {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    return last || u.hostname;
  } catch {
    return url;
  }
}

/**
 * Composer with a chat-attachment tray: `onSend(text, urls)` carries the URLs,
 * which the backend downloads. `attachHint` says what an attachment does on the
 * screen using it — the Email agent puts an attached image into the email.
 *
 * `insert` ({ text, key }, optional) lets the screen add text to the message —
 * the Email screen's "Mention" on an image or file adds `[image-5]` / `[att-4]`.
 * A new `key` each time, so the same mention can be added twice.
 *
 * `allowFilesOnly` lets a message go with attachments and no text (`onSend('',
 * urls)`). Off by default: only the Email agent's `/stream` accepts a file-only turn.
 */
export default function Composer({
  disabled,
  onSend,
  placeholder = 'Share your insights…',
  attachHint = DEFAULT_ATTACH_HINT,
  insert,
  allowFilesOnly = false,
}) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showAttach, setShowAttach] = useState(false);
  const [draftUrl, setDraftUrl] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!insert?.text) return;
    setValue((prev) => `${prev && !/\s$/.test(prev) ? `${prev} ` : prev}${insert.text} `);
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    // After React writes the new value: grow the box to fit and put the caret at the end.
    requestAnimationFrame(() => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, [insert?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSend = !!value.trim() || (allowFilesOnly && attachments.length > 0);

  function submit() {
    const v = value.trim();
    if (!canSend || disabled) return;
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
          <div className="mb-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-400 dark:text-slate-500 mb-1">
              Chat attachments
            </div>
            <div className="flex flex-wrap gap-1.5">
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
                    aria-label="Remove chat attachment"
                  >
                    <IconX width={12} height={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {showAttach && (
          <div className="mb-2 bg-white dark:bg-slate-800/60 border border-ink-200 dark:border-slate-700 rounded-lg px-3 py-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <IconLink width={14} height={14} className="text-ink-400 dark:text-slate-500 shrink-0" />
              <span className="text-[11.5px] tracking-wider uppercase font-semibold text-ink-500 dark:text-slate-400">
                Add chat attachment
              </span>
              <span className="text-[11px] text-ink-400 dark:text-slate-500 font-normal">
                — {attachHint}
              </span>
            </div>
            <div className="flex items-center gap-2">
            <input
              type="url"
              value={draftUrl}
              autoFocus
              placeholder={`Paste a file URL (${formatExtensions(CHAT_FILE_EXTENSIONS)})`}
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
          </div>
        )}

        <div className="flex items-end gap-2 bg-white dark:bg-slate-800/60 border border-ink-200 dark:border-slate-700 rounded-xl px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-500/20 transition">
          <textarea
            ref={textareaRef}
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
                ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400 border-brand-300 dark:border-brand-500/40 '
                : 'text-ink-600 dark:text-slate-300 border-ink-200 dark:border-slate-700 hover:bg-ink-50 dark:hover:bg-slate-800 hover:text-ink-800 dark:hover:text-slate-100 ') +
              'h-8 px-2.5 rounded-md border inline-flex items-center gap-1.5 text-[12px] font-medium transition'
            }
            aria-label="Add chat attachment"
            aria-pressed={showAttach}
            title={`Chat attachment — ${attachHint}`}
          >
            <IconAttach width={14} height={14} />
            Chat attachment
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !canSend}
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
