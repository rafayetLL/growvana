import React, { useRef, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Logo from './Logo.jsx';
import MetaAdAgentDoc, { META_AD_DOC_META } from './docs/MetaAdAgentDoc.jsx';
import { downloadWordDoc } from './docs/wordExport.js';
import {
  IconTarget,
  IconMail,
  IconCompass,
  IconChart,
  IconDownload,
  IconArrowLeft,
  IconBook,
} from './icons.jsx';

// The Documentation section. One entry per agent; the doc itself is a static
// React component, not fetched — these pages describe how an agent works, so
// they change when the agent changes, not per session.
//
// To add another agent's documentation: write its component under `docs/`,
// import it, and give its row a `doc`. A row without one renders as a
// not-written-yet card and cannot be opened.
const DOCS = [
  {
    id: 'meta_ad_agent',
    name: 'Meta Ad Agent',
    blurb: 'The sync, the two flows, the files you attach, and the four specialists behind each ad.',
    icon: IconTarget,
    tint: 'text-meta-600 dark:text-meta-300',
    tintBg: 'bg-meta-50 dark:bg-meta-600/10',
    doc: MetaAdAgentDoc,
    meta: META_AD_DOC_META,
  },
  {
    id: 'email_agent',
    name: 'Email Marketing Agent',
    blurb: 'Campaign briefs, copy, design and compliance for email sequences.',
    icon: IconMail,
    tint: 'text-rose-500 dark:text-rose-400',
    tintBg: 'bg-rose-50 dark:bg-rose-500/10',
  },
  {
    id: 'pdp_agent',
    name: 'PDP Agent',
    blurb: 'Product page audits across search, AI engines, buyers and platform rules.',
    icon: IconCompass,
    tint: 'text-violet-500 dark:text-violet-400',
    tintBg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  {
    id: 'forecast_agent',
    name: 'Forecast Agent',
    blurb: 'Sales forecasting workbooks built from your real Vendor Central files.',
    icon: IconChart,
    tint: 'text-sky-500 dark:text-sky-400',
    tintBg: 'bg-sky-50 dark:bg-sky-500/10',
  },
];

export default function DocsScreen({
  projectName = 'Untitled project',
  onSelectView,
  onNewProject,
  onBack,
  hideFoundation = false,
  // Opened from the landing page, before any project exists. The sidebar's
  // agent nav would be dead there — every item needs a session behind it — so
  // it is replaced by the logo and a plain way back.
  standalone = false,
}) {
  const [openId, setOpenId] = useState(null);
  const [wordState, setWordState] = useState('idle');
  // The rendered page itself, which is what the Word export reads — it walks the
  // real DOM rather than the React tree, because the diagrams have to be
  // rasterized from laid-out SVG elements.
  const pageRef = useRef(null);
  const open = DOCS.find((d) => d.id === openId) || null;
  const DocBody = open?.doc;

  // "Download PDF" is the browser's own print-to-PDF. The page carries a print
  // stylesheet (index.css) that drops the app chrome, forces the light palette
  // and keeps figures and cards from splitting across pages — so what prints is
  // the document, not a screenshot of the app.
  function downloadPdf() {
    window.print();
  }

  // "Download for Word" is a different document, not the same one in another
  // wrapper: the prose goes across as plain text with the design stripped, and
  // each diagram goes as a PNG. See wordExport.js. It takes a moment because
  // every diagram is rasterized, so the button says so rather than looking dead.
  async function downloadWord() {
    if (!pageRef.current || wordState === 'working') return;
    setWordState('working');
    try {
      await downloadWordDoc(pageRef.current, open.meta.title);
      setWordState('idle');
    } catch (err) {
      console.error('Word export failed', err);
      setWordState('failed');
    }
  }

  return (
    <div className="h-screen flex bg-canvas dark:bg-slate-950">
      {!standalone && (
        <div className="no-print contents">
          <Sidebar
            projectName={projectName}
            activeView="documentation"
            onSelectView={onSelectView}
            onNewProject={onNewProject}
            hideFoundation={hideFoundation}
          />
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="no-print h-14 shrink-0 px-5 flex items-center gap-3 bg-white dark:bg-slate-900 border-b border-ink-200 dark:border-slate-800">
          {standalone && !open && (
            <span className="mr-1">
              <Logo />
            </span>
          )}
          {open ? (
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 dark:border-slate-700 px-2.5 py-1.5 text-[12px] font-medium text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-800 transition"
            >
              <IconArrowLeft width={13} height={13} /> All documentation
            </button>
          ) : (
            !standalone && (
              <span className="inline-flex items-center gap-2 text-ink-400 dark:text-slate-500">
                <IconBook width={16} height={16} />
              </span>
            )
          )}

          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-ink-900 dark:text-slate-100 truncate">
              {open ? open.name : 'Documentation'}
            </div>
            <div className="text-[11.5px] text-ink-500 dark:text-slate-400 truncate">
              {open ? open.meta.subtitle : 'How each agent works, what it reads, and what it produces'}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {open && (
              <button
                type="button"
                onClick={downloadWord}
                disabled={wordState === 'working'}
                className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 dark:border-slate-700 px-2.5 py-1.5 text-[12px] font-medium text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-800 disabled:opacity-60 transition"
              >
                <IconDownload width={13} height={13} />
                {wordState === 'working'
                  ? 'Preparing…'
                  : wordState === 'failed'
                    ? 'Try again'
                    : 'Download for Word'}
              </button>
            )}
            {open && (
              <button
                type="button"
                onClick={downloadPdf}
                className="inline-flex items-center gap-1.5 rounded-md bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 text-[12px] font-medium transition"
              >
                <IconDownload width={13} height={13} /> Download PDF
              </button>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 dark:border-slate-700 px-2.5 py-1.5 text-[12px] font-medium text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-800 transition"
              >
                {standalone ? 'Back' : 'Close'}
              </button>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="doc-scroll flex-1 overflow-y-auto thin-scroll">
          {open && DocBody ? (
            <article className="doc-page" ref={pageRef}>
              <header className="doc-masthead">
                <p className="doc-eyebrow">Growvana · Agent documentation</p>
                <h1>{open.meta.title}</h1>
                <p className="doc-deck">{open.meta.subtitle}</p>
              </header>
              <DocBody />
              {/* Named from the open row, not hardcoded — a second agent's doc
                  would otherwise footer itself as the Meta Ad Agent's. */}
              <footer className="doc-foot">Growvana — {open.name} documentation.</footer>
            </article>
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-10">
              <h2 className="font-display text-[26px] leading-tight text-ink-900 dark:text-slate-100">
                Agent documentation
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600 dark:text-slate-400 max-w-2xl">
                Written guides to how each agent works — where its data comes from, what it is allowed
                to see, the craft it applies, and what lands on your canvas. Every page can be saved as
                a PDF to share.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {DOCS.map((d) => {
                  const Icon = d.icon;
                  const ready = Boolean(d.doc);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={!ready}
                      onClick={() => ready && setOpenId(d.id)}
                      className={[
                        'text-left rounded-xl border p-4 transition',
                        ready
                          ? 'bg-white dark:bg-slate-900 border-ink-200 dark:border-slate-800 hover:border-navy-300 dark:hover:border-slate-600 hover:shadow-card'
                          : 'bg-ink-50/60 dark:bg-slate-900/40 border-dashed border-ink-200 dark:border-slate-800 cursor-default',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`shrink-0 w-9 h-9 rounded-lg grid place-items-center ${d.tintBg} ${d.tint} ${ready ? '' : 'opacity-50'}`}
                        >
                          <Icon width={17} height={17} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                'text-[14px] font-semibold',
                                ready
                                  ? 'text-ink-900 dark:text-slate-100'
                                  : 'text-ink-500 dark:text-slate-500',
                              ].join(' ')}
                            >
                              {d.name}
                            </span>
                            {!ready && (
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-400 dark:text-slate-500 border border-ink-200 dark:border-slate-700 rounded px-1.5 py-0.5">
                                Not written yet
                              </span>
                            )}
                          </div>
                          <p
                            className={[
                              'mt-1 text-[12.5px] leading-relaxed',
                              ready
                                ? 'text-ink-600 dark:text-slate-400'
                                : 'text-ink-400 dark:text-slate-500',
                            ].join(' ')}
                          >
                            {d.blurb}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
