import React from 'react';
import Logo from './Logo.jsx';
import { IconMail, IconTarget } from './icons.jsx';

// First screen the user sees. Picks which agent to work in:
//   'email'   → the Email Campaign flow (PDF blueprint or Foundation).
//   'meta_ad' → the Meta Ad Agent (self-serves via ad-account creds / PDF;
//               no Foundation step required).
export default function CampaignChooser({ onSelect }) {
  return (
    <div className="min-h-screen bg-ink-50 dark:bg-slate-950 flex flex-col">
      <div className="h-14 px-6 flex items-center border-b border-ink-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Logo />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[920px]">
          <div className="text-center mb-10">
            <h1 className="text-[28px] md:text-[34px] font-semibold text-ink-900 dark:text-slate-100 leading-tight">
              What do you want to build?
            </h1>
            <p className="mt-3 text-[14px] text-ink-500 dark:text-slate-400">
              Pick a campaign type to get started.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button
              type="button"
              onClick={() => onSelect?.('email')}
              className="group text-left bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-2xl p-6 hover:border-brand-400 dark:hover:border-brand-500/60 hover:shadow-md transition"
            >
              <div className="h-11 w-11 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400 grid place-items-center">
                <IconMail width={20} height={20} />
              </div>
              <h2 className="mt-4 text-[18px] font-semibold text-ink-900 dark:text-slate-100">
                Email Campaign
              </h2>
              <p className="mt-1.5 text-[13px] text-ink-500 dark:text-slate-400 leading-relaxed">
                Generate a branded email campaign. Bring your own blueprint PDF, or let the AI build the brand bible and buyer personas with you first.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500 text-white text-[13px] font-medium group-hover:bg-brand-600 transition">
                Start Email Campaign →
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelect?.('meta_ad')}
              className="group text-left bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-2xl p-6 hover:border-moss-400 dark:hover:border-moss-500/60 hover:shadow-md transition"
            >
              <div className="h-11 w-11 rounded-xl bg-moss-100 dark:bg-moss-500/15 text-moss-700 dark:text-moss-300 grid place-items-center">
                <IconTarget width={20} height={20} />
              </div>
              <h2 className="mt-4 text-[18px] font-semibold text-ink-900 dark:text-slate-100">
                Meta Ad Campaign
              </h2>
              <p className="mt-1.5 text-[13px] text-ink-500 dark:text-slate-400 leading-relaxed">
                Diagnose existing Meta ads or plan a new campaign. Connect an ad account with your insight credentials, or upload a blueprint PDF for brand context.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-moss-600 text-white text-[13px] font-medium group-hover:bg-moss-700 transition">
                Start Meta Ad Campaign →
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
