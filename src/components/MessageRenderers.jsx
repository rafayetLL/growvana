import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IconSparkle, IconCheck, IconChevronDown, IconChevronRight, IconLink } from './icons.jsx';

function fileNameFromUrl(url) {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    return last || u.hostname;
  } catch {
    return url;
  }
}

// Used by the commented-out streaming web-search UI below.
// See docs/streaming-search-results.md for the full plan.
// function hostnameFromUrl(url) {
//   try {
//     return new URL(url).hostname.replace(/^www\./, '');
//   } catch {
//     return url;
//   }
// }

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-400 dark:bg-slate-500" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-400 dark:bg-slate-500" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-400 dark:bg-slate-500" />
    </div>
  );
}

export function Spinner({ size = 12 }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-violet-300 dark:border-violet-500/30 border-t-violet-600 dark:border-t-violet-400 animate-spin"
      style={{ width: size, height: size }}
    />
  );
}

export function DraftingActivityCard({ label, status, content }) {
  const running = status === 'drafting';
  const hasContent = typeof content === 'string' && content.length > 0;
  const [expanded, setExpanded] = React.useState(true);
  const streamRef = React.useRef(null);
  // Streaming web-search UI (disabled) — signature would take `webSearch`.
  // const [searchExpanded, setSearchExpanded] = React.useState(false);
  // const queries = webSearch?.queries || [];
  // const sources = webSearch?.sources || [];
  // const hasSearch = queries.length > 0 || sources.length > 0;

  // Auto-scroll the streaming preview to the bottom as tokens arrive, so the
  // most recent markdown is always visible while expanded.
  React.useEffect(() => {
    if (!streamRef.current || !expanded) return;
    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [content, expanded]);

  return (
    <div className="flex gap-3 max-w-[760px]">
      <div className="h-7 w-7 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 grid place-items-center shrink-0 mt-0.5">
        <IconSparkle width={14} height={14} />
      </div>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => hasContent && setExpanded((v) => !v)}
          disabled={!hasContent}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse draft preview' : 'Expand draft preview'}
          className={[
            'inline-flex items-center gap-2 rounded-xl px-3 py-2 border text-[12.5px] font-medium transition',
            running
              ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/40 text-violet-700 dark:text-violet-200'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
            hasContent ? 'cursor-pointer hover:brightness-[0.98] dark:hover:brightness-110' : 'cursor-default',
          ].join(' ')}
        >
          {running ? (
            <Spinner />
          ) : (
            <span className="text-emerald-600 dark:text-emerald-300">
              <IconCheck width={12} height={12} strokeWidth={3} />
            </span>
          )}
          <span>
            {running ? 'Drafting ' : 'Drafted '}
            <span className="font-semibold">{label}</span>
            {running && <span className="ml-0.5 animate-pulse">…</span>}
          </span>
          {hasContent && (
            <span className="opacity-70">
              {expanded ? (
                <IconChevronDown width={14} height={14} />
              ) : (
                <IconChevronRight width={14} height={14} />
              )}
            </span>
          )}
        </button>

        {/* Streaming web-search UI (disabled). Re-enable by restoring the
            `webSearch` prop + state above and uncommenting this block. Also
            uncomment IconSearch in icons.jsx and add it back to the import
            at the top. See docs/streaming-search-results.md. */}
        {/*
        {hasSearch && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setSearchExpanded((v) => !v)}
              aria-expanded={searchExpanded}
              aria-label={searchExpanded ? 'Collapse search activity' : 'Expand search activity'}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 border border-sky-200 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[11.5px] font-medium hover:brightness-[0.98] dark:hover:brightness-110 transition"
            >
              <IconSearch width={12} height={12} />
              <span>
                {queries.length > 0 && `${queries.length} ${queries.length === 1 ? 'search' : 'searches'}`}
                {queries.length > 0 && sources.length > 0 && ' • '}
                {sources.length > 0 && `${sources.length} ${sources.length === 1 ? 'source' : 'sources'}`}
              </span>
              <span className="opacity-70">
                {searchExpanded ? (
                  <IconChevronDown width={12} height={12} />
                ) : (
                  <IconChevronRight width={12} height={12} />
                )}
              </span>
            </button>

            {searchExpanded && (
              <div className="mt-2 rounded-lg border border-sky-100 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-500/5 px-3 py-2 space-y-2">
                {queries.length > 0 && (
                  <div>
                    <div className="text-[10.5px] uppercase tracking-wide text-sky-700/70 dark:text-sky-300/70 font-semibold mb-1">
                      Queries
                    </div>
                    <ul className="space-y-0.5">
                      {queries.map((q, i) => (
                        <li key={i} className="text-[12px] text-ink-600 dark:text-slate-300 truncate">
                          <span className="text-sky-600 dark:text-sky-400 mr-1.5">›</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {sources.length > 0 && (
                  <div>
                    <div className="text-[10.5px] uppercase tracking-wide text-sky-700/70 dark:text-sky-300/70 font-semibold mb-1">
                      Sources
                    </div>
                    <ul className="space-y-0.5">
                      {sources.map((s, i) => (
                        <li key={i} className="text-[12px] truncate">
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ink-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300 hover:underline"
                            title={s.url}
                          >
                            <span className="text-ink-400 dark:text-slate-500 mr-1.5">[{hostnameFromUrl(s.url)}]</span>
                            {s.title || s.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        */}

        {hasContent && expanded && (
          <div
            ref={streamRef}
            className="mt-2 max-h-60 overflow-y-auto thin-scroll rounded-lg border border-ink-100 dark:border-slate-800 bg-ink-50/60 dark:bg-slate-900/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-600 dark:text-slate-300 md"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {running && (
              <span className="inline-block h-3 w-[2px] bg-violet-500 dark:bg-violet-400 ml-0.5 align-middle animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="h-7 w-7 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-500 dark:text-pink-300 grid place-items-center shrink-0 mt-0.5">
      <IconSparkle width={14} height={14} />
    </div>
  );
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function ChatMessageItem({ message, streaming }) {
  if (message.role === 'assistant') {
    return (
      <div className="flex gap-3 max-w-[760px]">
        <AssistantAvatar />
        <div className="flex-1 min-w-0">
          <div className="bg-ink-50 dark:bg-slate-800/60 border border-ink-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 text-[13.5px] leading-relaxed text-ink-700 dark:text-slate-200">
            {message.content ? (
              <div className="md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            ) : (
              <TypingIndicator />
            )}
            {streaming && message.content && (
              <span className="inline-block h-3 w-[2px] bg-ink-400 dark:bg-slate-400 ml-0.5 align-middle animate-pulse" />
            )}
          </div>
          {message.time && !streaming && (
            <div className="mt-1 text-[11px] text-ink-400 dark:text-slate-500 pl-2">{formatTime(message.time)}</div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 max-w-[760px] ml-auto justify-end">
      <div className="flex-1 min-w-0 flex flex-col items-end">
        <div className="bg-brand-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 justify-end max-w-full">
            {message.attachments.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                title={url}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11.5px] rounded-md bg-ink-50 dark:bg-slate-800 border border-ink-200 dark:border-slate-700 text-ink-700 dark:text-slate-200 hover:bg-ink-100 dark:hover:bg-slate-700 max-w-[220px]"
              >
                <IconLink width={11} height={11} className="text-ink-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">{fileNameFromUrl(url)}</span>
              </a>
            ))}
          </div>
        )}
        {message.time && (
          <div className="mt-1 text-[11px] text-ink-400 dark:text-slate-500 pr-2">{formatTime(message.time)}</div>
        )}
      </div>
      <div className="h-7 w-7 rounded-full bg-ink-200 dark:bg-slate-700 text-ink-700 dark:text-slate-200 grid place-items-center shrink-0 mt-0.5 text-[11px] font-semibold">
        GU
      </div>
    </div>
  );
}
