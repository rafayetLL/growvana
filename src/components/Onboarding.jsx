import React, { useState } from 'react';
import Logo from './Logo.jsx';
import {
  IconLink,
  IconPlus,
  IconX,
  IconArrowRight,
  IconSun,
  IconMoon,
  IconCheck,
} from './icons.jsx';
import { Spinner } from './MessageRenderers.jsx';
import { useTheme } from '../lib/theme.js';
import { INIT_FILE_EXTENSIONS, formatExtensions } from '../lib/fileTypes.js';

const RECOMMENDED = [
  'Competitive Intelligence Reports',
  'Brand Guidelines & Assets',
  'Market Research & Analysis',
  'Customer Profiles & Personas',
  'Product Documentation',
  'Compliance & Legal Guidelines',
  'Marketing Materials & Campaigns',
  'Sales Presentations & Decks',
];

function isLikelyUrl(s) {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function ProgressStep({ label, done, message }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 h-5 w-5 shrink-0 grid place-items-center">
        {done ? (
          <span className="h-5 w-5 rounded-full bg-brand-500 text-white grid place-items-center">
            <IconCheck width={12} height={12} strokeWidth={3} />
          </span>
        ) : (
          <Spinner size={16} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={[
            'text-[13px] leading-tight',
            done
              ? 'text-ink-700 dark:text-slate-200'
              : 'text-ink-500 dark:text-slate-400',
          ].join(' ')}
        >
          {label}
        </div>
        {message && done && (
          <div className="mt-0.5 text-[11.5px] text-ink-400 dark:text-slate-500 truncate">
            {message}
          </div>
        )}
      </div>
    </li>
  );
}

export default function Onboarding({ onContinue, onSkip, loading, error, progress = {} }) {
  const [companyUrl, setCompanyUrl] = useState('');
  const [fileUrls, setFileUrls] = useState(['']);
  // Captured at submit so the progress stepper shows the right steps even
  // after the user-visible form state has been reset.
  const [submittedHasFiles, setSubmittedHasFiles] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === 'dark';

  const cleanedFileUrls = fileUrls.map((s) => s.trim()).filter(Boolean);
  const allFileUrlsValid = cleanedFileUrls.every(isLikelyUrl);
  // File URLs are optional — only the company URL is required.
  // If any file URL is entered, it must be a valid http(s) URL.
  const canContinue =
    !loading && isLikelyUrl(companyUrl) && allFileUrlsValid;

  const canSkip = !loading && isLikelyUrl(companyUrl);

  function updateAt(i, val) {
    setFileUrls((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }
  function removeAt(i) {
    setFileUrls((prev) => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i)));
  }
  function addRow() {
    setFileUrls((prev) => [...prev, '']);
  }

  function handleContinue() {
    if (!canContinue) return;
    setSubmittedHasFiles(cleanedFileUrls.length > 0);
    onContinue({ company_url: companyUrl.trim(), file_urls: cleanedFileUrls });
  }
  function handleSkip() {
    if (!canSkip) return;
    setSubmittedHasFiles(false);
    onSkip({ company_url: companyUrl.trim(), file_urls: [] });
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-50 dark:bg-slate-950">
      {/* Top bar */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-ink-200 dark:border-slate-800 flex items-center justify-between px-6">
        <Logo />
        <div className="flex items-center gap-3">
          <div className="text-[13px] text-ink-500 dark:text-slate-400">Setup: Knowledge Base</div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="h-8 w-8 grid place-items-center rounded-md text-ink-500 dark:text-slate-400 hover:bg-ink-100 dark:hover:bg-slate-800 hover:text-ink-700 dark:hover:text-slate-200 transition"
          >
            {isDark ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
          </button>
        </div>
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-start justify-center px-6 py-14">
        <div className="w-full max-w-[680px]">
          {loading ? (
            <>
              <h1 className="text-[26px] leading-[1.3] font-semibold text-ink-900 dark:text-slate-100 text-center tracking-tight">
                Analyzing{' '}
                <span className="text-ink-400 dark:text-slate-500 font-semibold">
                  {companyUrl || 'your company'}
                </span>
              </h1>
              <p className="mt-3 text-[12.5px] text-ink-500 dark:text-slate-400 text-center">
                We'll switch to the chat as soon as the foundation is ready.
              </p>

              <section className="mt-10 bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-xl p-5 shadow-card">
                <h3 className="text-[11px] tracking-wider uppercase text-ink-400 dark:text-slate-500 font-semibold mb-3">
                  Progress
                </h3>
                <ol className="divide-y divide-ink-100 dark:divide-slate-800">
                  <ProgressStep
                    label="Extracting homepage"
                    done={!!progress.homepage_extraction}
                    message={progress.homepage_extraction?.message}
                  />
                  <ProgressStep
                    label="Mapping website URLs"
                    done={!!progress.url_mapping}
                    message={progress.url_mapping?.message}
                  />
                  <ProgressStep
                    label="Analyzing URL contents"
                    done={!!progress.url_context_analysis}
                    message={progress.url_context_analysis?.message}
                  />
                  {submittedHasFiles && (
                    <ProgressStep
                      label="Analyzing documents"
                      done={!!progress.file_analysis}
                      message={progress.file_analysis?.message}
                    />
                  )}
                  <ProgressStep
                    label="Generating questions"
                    // No backend webhook for gap_analysis — shows a spinner
                    // until `loading` flips off (which unmounts this view).
                    done={false}
                  />
                </ol>
              </section>

              {error && (
                <div className="mt-5 text-[12.5px] text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
          <h1 className="text-[26px] leading-[1.3] font-semibold text-ink-900 dark:text-slate-100 text-center tracking-tight">
            Upload Documents <span className="text-ink-400 dark:text-slate-500 font-semibold">that showcase your</span>
            <br />
            <span className="text-ink-400 dark:text-slate-500 font-semibold">company's vision or key information.</span>
          </h1>
          <p className="mt-3 text-[12.5px] text-ink-500 dark:text-slate-400 text-center">
            Paste public URLs to supported files ({formatExtensions(INIT_FILE_EXTENSIONS)}). The AI analyzes them during onboarding.
          </p>

          {/* Company URL card */}
          <section className="mt-10 bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-xl p-5 shadow-card">
            <label className="block text-[12.5px] font-medium text-ink-700 dark:text-slate-200 mb-2">
              Company URL
            </label>
            <div className="flex items-center gap-2 border border-ink-200 dark:border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-500/20 transition">
              <IconLink className="text-ink-400 dark:text-slate-500 shrink-0" />
              <input
                type="url"
                autoFocus
                placeholder="https://yourcompany.com"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[14px] text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500"
              />
            </div>
            <p className="mt-2 text-[11.5px] text-ink-400 dark:text-slate-500">
              Used to extract public info about your brand and positioning.
            </p>
          </section>

          {/* File URLs card */}
          <section className="mt-5 bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-medium text-ink-700 dark:text-slate-200">
                Document URLs
              </label>
              <span className="text-[11.5px] text-ink-400 dark:text-slate-500">{formatExtensions(INIT_FILE_EXTENSIONS, { separator: ' · ' })}</span>
            </div>

            <div className="mt-3 space-y-2">
              {fileUrls.map((val, i) => {
                const isInvalid = val.trim() !== '' && !isLikelyUrl(val.trim());
                return (
                  <div key={i} className="group">
                    <div
                      className={[
                        'flex items-center gap-2 rounded-lg px-3 py-2.5 border transition',
                        isInvalid
                          ? 'border-red-300 dark:border-red-500/50 focus-within:ring-2 focus-within:ring-red-100 dark:focus-within:ring-red-500/20'
                          : 'border-ink-200 dark:border-slate-700 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-500/20',
                      ].join(' ')}
                    >
                      <IconLink className="text-ink-400 dark:text-slate-500 shrink-0" />
                      <input
                        type="url"
                        placeholder={`https://.../document-${i + 1}.pdf`}
                        value={val}
                        onChange={(e) => updateAt(i, e.target.value)}
                        className="flex-1 bg-transparent outline-none text-[14px] text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeAt(i)}
                        className="opacity-0 group-hover:opacity-100 text-ink-400 dark:text-slate-500 hover:text-ink-700 dark:hover:text-slate-200 transition"
                        aria-label="Remove"
                      >
                        <IconX width={14} height={14} />
                      </button>
                    </div>
                    {isInvalid && (
                      <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">Enter a valid http(s) URL.</p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-600 dark:text-brand-500 hover:text-brand-700 dark:hover:text-brand-500 transition"
            >
              <IconPlus width={14} height={14} /> Add another URL
            </button>
          </section>

          {/* Recommended */}
          <section className="mt-5 bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 rounded-xl p-5 shadow-card">
            <h3 className="text-[12.5px] font-semibold text-ink-900 dark:text-slate-100">Recommended Documents</h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {RECOMMENDED.map((r) => (
                <div key={r} className="flex items-center gap-2 text-[12.5px] text-ink-500 dark:text-slate-400">
                  <span className="text-ink-300 dark:text-slate-600">•</span> {r}
                </div>
              ))}
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="mt-5 text-[12.5px] text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col items-center">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSkip}
                disabled={!canSkip}
                className="px-5 py-2 rounded-lg border border-ink-200 dark:border-slate-700 text-[13px] text-ink-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-ink-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={!canContinue}
                className="px-5 py-2 rounded-lg text-[13px] font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-ink-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition inline-flex items-center gap-1.5 shadow-sm"
              >
                {loading ? 'Analyzing…' : <>Continue <IconArrowRight width={14} height={14} /></>}
              </button>
            </div>
            <p className="mt-3 text-[11.5px] text-ink-400 dark:text-slate-500">
              Document URLs are optional — only the company URL is required.
            </p>
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
