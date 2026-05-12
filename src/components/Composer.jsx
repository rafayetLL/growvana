import React, { useState } from 'react';
import { IconSend, IconAttach, IconX, IconLink, IconPlus, IconImage } from './icons.jsx';
import { CHAT_FILE_EXTENSIONS, formatExtensions } from '../lib/fileTypes.js';

// Backend's EmailAssetInput.name pattern: ^[A-Za-z0-9_-]{1,64}$
const ASSET_NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;

// User types "image hero 1" → store/send "IMAGE_HERO_1". Same normalized
// form flows into placeholders, HTML, and the substitution lookup so the
// rendered email and the stored asset.name agree byte-for-byte.
function normalizeAssetName(raw) {
  return raw.trim().toUpperCase().replace(/\s+/g, '_');
}

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
 * Composer with two optional asset trays:
 * - Chat attachments — always available; `onSend(text, urls)` carries them.
 *   Plain pre-signed URLs the backend downloads as multimodal context.
 * - Email image assets — gated by `emailAssets` + `onUpdateEmailAssets`.
 *   Each is { url, name, alt_text? } and becomes a {{<name>}} token in
 *   the rendered email (user-supplied name verbatim — no prefix added).
 *   The screen tracks them across turns; they
 *   ride along on every stream call. We do NOT send them via onSend —
 *   they live in screen state, not per-message state.
 */
export default function Composer({
  disabled,
  onSend,
  placeholder = 'Share your insights…',
  emailAssets,
  onUpdateEmailAssets,
}) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showAttach, setShowAttach] = useState(false);
  const [draftUrl, setDraftUrl] = useState('');
  // Asset-images popover state — only used when the parent opted in.
  const [showAsset, setShowAsset] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [assetAlt, setAssetAlt] = useState('');
  const [assetError, setAssetError] = useState('');
  // Names added in the current turn — chip tray shows only these so prior
  // turns' assets don't linger in the composer UI. Full session list lives
  // in parent state for image substitution in the design canvas.
  const [freshAssetNames, setFreshAssetNames] = useState([]);

  const assetsEnabled = Array.isArray(emailAssets) && typeof onUpdateEmailAssets === 'function';
  const freshAssets = assetsEnabled
    ? emailAssets.filter((a) => freshAssetNames.includes(a.name))
    : [];

  function submit() {
    const v = value.trim();
    if (!v || disabled) return;
    onSend(v, attachments.length > 0 ? attachments.slice() : undefined);
    setValue('');
    setAttachments([]);
    setShowAttach(false);
    setDraftUrl('');
    setFreshAssetNames([]);
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

  function isLikelyUrl(s) {
    try {
      const u = new URL(s);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function addEmailAsset() {
    if (!assetsEnabled) return;
    const rawName = assetName.trim();
    const url = assetUrl.trim();
    const alt = assetAlt.trim();
    if (!rawName || !url) {
      setAssetError('Name and URL are both required.');
      return;
    }
    const name = normalizeAssetName(rawName);
    if (!ASSET_NAME_RE.test(name)) {
      setAssetError('Use letters, numbers, spaces, underscores or dashes (1–64 chars).');
      return;
    }
    if (!isLikelyUrl(url)) {
      setAssetError('URL must start with http:// or https://.');
      return;
    }
    if (emailAssets.some((a) => a.name === name)) {
      setAssetError(`An image named "${name}" already exists in this session.`);
      return;
    }
    onUpdateEmailAssets([...emailAssets, { name, url, alt_text: alt || undefined }]);
    setFreshAssetNames((prev) => [...prev, name]);
    setAssetName('');
    setAssetUrl('');
    setAssetAlt('');
    setAssetError('');
    setShowAsset(false);
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

        {assetsEnabled && freshAssets.length > 0 && (
          <div className="mb-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-400 dark:text-slate-500 mb-1">
              Asset images
            </div>
            <div className="flex flex-wrap gap-1.5">
              {freshAssets.map((a) => (
                <span
                  key={a.name}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-[12px] rounded-md bg-moss-100 dark:bg-moss-500/15 border border-moss-300 dark:border-moss-500/40 text-moss-700 dark:text-moss-300 max-w-[280px]"
                  title={`{{${a.name}}} → ${a.url}${a.alt_text ? `\nalt: ${a.alt_text}` : ''}`}
                >
                  <IconImage width={12} height={12} className="text-moss-600 dark:text-moss-400 shrink-0" />
                  <span className="truncate font-mono">{a.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {assetsEnabled && showAsset && (
          <div className="mb-2 bg-white dark:bg-slate-800/60 border border-ink-200 dark:border-slate-700 rounded-lg px-3 py-2.5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <IconImage width={14} height={14} className="text-moss-600 dark:text-moss-400 shrink-0" />
              <span className="text-[11.5px] tracking-wider uppercase font-semibold text-ink-500 dark:text-slate-400">
                Add asset image
              </span>
              <span className="text-[11px] text-ink-400 dark:text-slate-500 font-normal">
                — an image that will appear inside the final email
              </span>
            </div>
            <div className="grid grid-cols-[180px_1fr] gap-1.5">
              <input
                type="text"
                autoFocus
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="hero image 1"
                className="bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-600 rounded-md px-2 py-1.5 text-[12.5px] text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20"
              />
              <input
                type="url"
                value={assetUrl}
                onChange={(e) => setAssetUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEmailAsset();
                  } else if (e.key === 'Escape') {
                    setShowAsset(false);
                    setAssetError('');
                  }
                }}
                placeholder="https://… image URL"
                className="bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-600 rounded-md px-2 py-1.5 text-[12.5px] text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20"
              />
            </div>
            <input
              type="text"
              value={assetAlt}
              onChange={(e) => setAssetAlt(e.target.value)}
              placeholder="Alt text (optional)"
              className="bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-600 rounded-md px-2 py-1.5 text-[12px] text-ink-700 dark:text-slate-200 placeholder:text-ink-400 dark:placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20"
            />
            {assetError && (
              <div className="text-[11.5px] text-red-600 dark:text-red-300">{assetError}</div>
            )}
            <div className="flex items-center justify-between text-[11px] text-ink-400 dark:text-slate-500">
              <span>
                Stored as <code className="font-mono">{`{{${normalizeAssetName(assetName) || 'NAME'}}}`}</code> in the email HTML.
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setShowAsset(false); setAssetError(''); }}
                  className="text-[12px] px-2 py-1 rounded-md text-ink-500 dark:text-slate-400 hover:bg-ink-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addEmailAsset}
                  className="text-[12px] px-2.5 py-1 rounded-md bg-moss-600 text-white hover:bg-moss-700 transition inline-flex items-center gap-1"
                >
                  <IconPlus width={12} height={12} /> Add
                </button>
              </div>
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
                — a file the AI reads for context (not added to the email)
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
            title="Chat attachment — a file for the AI to read (not added to the email)"
          >
            <IconAttach width={14} height={14} />
            Chat attachment
          </button>
          {assetsEnabled && (
            <button
              type="button"
              onClick={() => { setShowAsset((s) => !s); setAssetError(''); }}
              className={
                (showAsset
                  ? 'bg-moss-100 dark:bg-moss-500/15 text-moss-700 dark:text-moss-300 border-moss-300 dark:border-moss-500/40 '
                  : 'text-ink-600 dark:text-slate-300 border-ink-200 dark:border-slate-700 hover:bg-ink-50 dark:hover:bg-slate-800 hover:text-ink-800 dark:hover:text-slate-100 ') +
                'h-8 px-2.5 rounded-md border inline-flex items-center gap-1.5 text-[12px] font-medium transition'
              }
              aria-label="Add asset image"
              aria-pressed={showAsset}
              title="Asset image — an image that will appear inside the final email"
            >
              <IconImage width={14} height={14} />
              Email asset
            </button>
          )}
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
