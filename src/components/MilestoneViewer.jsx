import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { milestoneLabel } from '../lib/milestones.js';
import { IconX } from './icons.jsx';

export default function MilestoneViewer({ milestoneKey, markdown, status, onClose }) {
  if (!milestoneKey) return null;

  const statusCopy =
    status === 'accepted' ? 'Accepted' :
    status === 'redrafted' ? 'Revised' :
    status === 'drafting' ? 'Drafting' :
    status === 'drafted' ? 'Drafted' : 'Draft';

  return (
    <div className="absolute inset-0 bg-white dark:bg-slate-900 flex flex-col animate-in fade-in">
      <div className="flex items-center justify-between px-8 py-4 border-b border-ink-200 dark:border-slate-800">
        <div>
          <div className="text-[11px] tracking-wider uppercase text-ink-400 dark:text-slate-500 font-semibold">
            Milestone · {statusCopy}
          </div>
          <h2 className="mt-0.5 text-[18px] font-semibold text-ink-900 dark:text-slate-100 tracking-tight">
            {milestoneLabel(milestoneKey)}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-lg grid place-items-center text-ink-500 dark:text-slate-400 hover:text-ink-900 dark:hover:text-slate-100 hover:bg-ink-100 dark:hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <IconX />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto thin-scroll px-8 py-6">
        <div className="max-w-[760px] mx-auto md">
          {markdown ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          ) : (
            <p className="text-ink-400 dark:text-slate-500 text-[13px]">No content yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
