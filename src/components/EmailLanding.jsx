import React, { useRef, useState } from 'react';
import Logo from './Logo.jsx';
import { IconAttach, IconZap } from './icons.jsx';

// Landing page — two large cards. PDF upload bypasses Foundation entirely
// by POSTing to /email-agent/init_with_pdf; the second card hands off to
// the existing Onboarding (company URL + reference docs) flow.
export default function EmailLanding({
  onSelectFoundation,
  onUploadPdf,
  uploading,
  error,
}) {
  const fileInputRef = useRef(null);
  const [pickedFile, setPickedFile] = useState(null);

  function pickFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedFile(file);
    onUploadPdf?.(file);
  }

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-slate-950 flex flex-col">
      <div className="h-14 px-6 flex items-center border-b border-ink-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Logo />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[920px]">
          <div className="text-center mb-10">
            <h1 className="text-[28px] md:text-[34px] font-semibold text-ink-900 dark:text-slate-100 leading-tight">
              Start an Email Campaign
            </h1>
            <p className="mt-3 text-[14px] text-ink-500 dark:text-slate-400">
              Bring your own brand blueprint, or let the AI build one with you first.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button
              type="button"
              onClick={pickFile}
              disabled={uploading}
              className="group text-left bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-2xl p-6 hover:border-moss-400 dark:hover:border-moss-500/60 hover:shadow-md transition disabled:opacity-60 disabled:cursor-wait"
            >
              <div className="h-11 w-11 rounded-xl bg-moss-100 dark:bg-moss-500/15 text-moss-700 dark:text-moss-300 grid place-items-center">
                <IconAttach width={20} height={20} />
              </div>
              <h2 className="mt-4 text-[18px] font-semibold text-ink-900 dark:text-slate-100">
                Upload Blueprint PDF
              </h2>
              <p className="mt-1.5 text-[13px] text-ink-500 dark:text-slate-400 leading-relaxed">
                Bring your own brand bible and buyer personas in a single PDF. We&apos;ll skip Foundation and take you straight to the email agent.
              </p>
              <p className="mt-3 text-[11.5px] text-ink-400 dark:text-slate-500">
                PDF must contain the headings <span className="font-mono">Brand Bible</span> and <span className="font-mono">Buyer Personas</span>.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-moss-600 text-white text-[13px] font-medium group-hover:bg-moss-700 transition">
                {uploading ? 'Uploading…' : 'Choose PDF'}
              </div>
              {pickedFile && (
                <p className="mt-2 text-[11.5px] text-ink-500 dark:text-slate-400 truncate" title={pickedFile.name}>
                  {pickedFile.name}
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </button>

            <button
              type="button"
              onClick={onSelectFoundation}
              disabled={uploading}
              className="text-left bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-2xl p-6 hover:border-brand-400 dark:hover:border-brand-500/60 hover:shadow-md transition disabled:opacity-60"
            >
              <div className="h-11 w-11 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400 grid place-items-center">
                <IconZap width={20} height={20} />
              </div>
              <h2 className="mt-4 text-[18px] font-semibold text-ink-900 dark:text-slate-100">
                Generate Blueprint in Foundation
              </h2>
              <p className="mt-1.5 text-[13px] text-ink-500 dark:text-slate-400 leading-relaxed">
                Don&apos;t have a blueprint yet? Drop a company URL and any reference docs and the AI will build the brand bible and buyer personas with you, then hand off to the email agent.
              </p>
              <p className="mt-3 text-[11.5px] text-ink-400 dark:text-slate-500">
                Takes a few minutes. Ideal when you&apos;re starting from scratch.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500 text-white text-[13px] font-medium hover:bg-brand-600 transition">
                Start Foundation →
              </div>
            </button>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 text-[13px]">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
