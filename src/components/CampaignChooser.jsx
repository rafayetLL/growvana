import React from 'react';
import Logo from './Logo.jsx';
import {
  IconMail,
  IconTarget,
  IconCompass,
  IconChart,
  IconBook,
  IconSettings,
  IconPulse,
} from './icons.jsx';

// First screen the user sees. Picks which agent to work in:
//   'foundation' → the Foundation Agent, which BUILDS the Company Blueprint the
//                  other four read. It is a first-class entry rather than a step
//                  inside the email flow: every agent below consumes its output, so
//                  reaching it only by starting an email campaign put the one thing
//                  they all depend on behind the one that needs it least.
//   'email'      → the Email Campaign flow.
//   'meta_ad'    → the Meta Ad Agent (self-serves via ad-account creds / PDF).
//   'pdp'        → the PDP Agent (one product per thread).
//   'forecast'   → the Forecast Agent (one continuous forecasting chat per thread;
//                  files attach by URL; no Foundation session is read in v1).
//   'asin_health'→ the ASIN Health dashboard (daily and weekly checks over every
//                  company; no thread, no brand context).
//
// The four consuming agents each take brand context the SAME way — an existing
// Foundation thread, an uploaded Blueprint PDF, or none — which is what the
// `blueprint` tag on every thread in the history reports back.
export default function CampaignChooser({ onSelect, onOpenDocs }) {
  return (
    <div className="min-h-screen bg-ink-50 dark:bg-slate-950 flex flex-col">
      <div className="h-14 px-6 flex items-center border-b border-ink-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Logo />
        {/* Docs are reachable before a project exists — someone deciding which
            agent to open is exactly who needs to read what one does. */}
        {onOpenDocs && (
          <button
            type="button"
            onClick={onOpenDocs}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-ink-200 dark:border-slate-700 px-2.5 py-1.5 text-[12.5px] font-medium text-ink-600 dark:text-slate-300 hover:bg-ink-50 dark:hover:bg-slate-800 hover:text-ink-900 dark:hover:text-slate-100 transition"
          >
            <IconBook width={14} height={14} /> Documentation
          </button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[1500px]">
          <div className="text-center mb-10">
            <h1 className="text-[28px] md:text-[34px] font-semibold text-ink-900 dark:text-slate-100 leading-tight">
              What do you want to build?
            </h1>
            <p className="mt-3 text-[14px] text-ink-500 dark:text-slate-400">
              Pick an agent to get started. Every one of them can pick up where you left off.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* FIRST, because it is what the other four read. It used to be reachable
                only through Email Campaign → "Generate Blueprint in Foundation",
                which hid the shared step behind one of its consumers. */}
            <button
              type="button"
              onClick={() => onSelect?.('foundation')}
              className="group text-left bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-2xl p-6 hover:border-amber-400 dark:hover:border-amber-500/60 hover:shadow-md transition"
            >
              <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 grid place-items-center">
                <IconSettings width={20} height={20} />
              </div>
              <h2 className="mt-4 text-[18px] font-semibold text-ink-900 dark:text-slate-100">
                Foundation Blueprint
              </h2>
              <p className="mt-1.5 text-[13px] text-ink-500 dark:text-slate-400 leading-relaxed">
                Build the brand bible, buyer personas, competitive and market analysis from a company URL and your documents. Every other agent can then read this Blueprint instead of asking you again.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 text-white text-[13px] font-medium group-hover:bg-amber-600 transition">
                Build a Blueprint →
              </div>
            </button>

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

            <button
              type="button"
              onClick={() => onSelect?.('pdp')}
              className="group text-left bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-2xl p-6 hover:border-violet-400 dark:hover:border-violet-500/60 hover:shadow-md transition"
            >
              <div className="h-11 w-11 rounded-xl bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 grid place-items-center">
                <IconCompass width={20} height={20} />
              </div>
              <h2 className="mt-4 text-[18px] font-semibold text-ink-900 dark:text-slate-100">
                Product Page Audit
              </h2>
              <p className="mt-1.5 text-[13px] text-ink-500 dark:text-slate-400 leading-relaxed">
                Paste a live product page — or describe a product that isn't published yet — and find out what stands between it and a winning page. Upload a blueprint PDF for brand context.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-[13px] font-medium group-hover:bg-violet-700 transition">
                Audit a Product Page →
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelect?.('forecast')}
              className="group text-left bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-2xl p-6 hover:border-sky-400 dark:hover:border-sky-500/60 hover:shadow-md transition"
            >
              <div className="h-11 w-11 rounded-xl bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300 grid place-items-center">
                <IconChart width={20} height={20} />
              </div>
              <h2 className="mt-4 text-[18px] font-semibold text-ink-900 dark:text-slate-100">
                Sales Forecast
              </h2>
              <p className="mt-1.5 text-[13px] text-ink-500 dark:text-slate-400 leading-relaxed">
                Forecast a 1P Vendor Central brand from its real files. Attach sales exports and PO history by URL, agree on the plan in chat, and receive verified Excel workbooks in the conversation.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-600 text-white text-[13px] font-medium group-hover:bg-sky-700 transition">
                Start a Forecast →
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelect?.('asin_health')}
              className="group text-left bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-2xl p-6 hover:border-rose-400 dark:hover:border-rose-500/60 hover:shadow-md transition"
            >
              <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 grid place-items-center">
                <IconPulse width={20} height={20} />
              </div>
              <h2 className="mt-4 text-[18px] font-semibold text-ink-900 dark:text-slate-100">
                ASIN Health
              </h2>
              <p className="mt-1.5 text-[13px] text-ink-500 dark:text-slate-400 leading-relaxed">
                Check every Amazon listing we manage. Daily: buy box, Prime, listing problems, low stock and weak content. Weekly: what moved last week and why.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600 text-white text-[13px] font-medium group-hover:bg-rose-700 transition">
                Open the Dashboard →
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
