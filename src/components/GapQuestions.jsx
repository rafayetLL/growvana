import React, { useState } from 'react';
import { milestoneLabel } from '../lib/milestones.js';
import { IconArrowRight, IconSparkle } from './icons.jsx';

/**
 * Gap questions inline card. Rendered inside the chat stream as the first
 * assistant "message" after /init resolves. Answers array is positionally
 * aligned with the original gap_questions list.
 */
export default function GapQuestions({ questions, disabled, onSubmit }) {
  // selections[i] = Set of selected option strings for question i.
  const [selections, setSelections] = useState(() =>
    questions.map(() => new Set())
  );
  // freeText[i] = optional free-text answer for question i.
  const [freeText, setFreeText] = useState(() => questions.map(() => ''));

  function toggle(qIdx, opt) {
    setSelections((prev) => {
      const next = prev.map((s, i) => (i === qIdx ? new Set(s) : s));
      const set = next[qIdx];
      if (set.has(opt)) set.delete(opt);
      else set.add(opt);
      return next;
    });
  }

  function submit() {
    const payload = selections.map((s, i) => {
      const arr = Array.from(s);
      const extra = (freeText[i] || '').trim();
      if (extra) arr.push(extra);
      return arr;
    });
    onSubmit(payload);
  }

  return (
    <div className="flex gap-3 max-w-[760px]">
      <div className="h-7 w-7 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-500 dark:text-pink-300 grid place-items-center shrink-0 mt-0.5">
        <IconSparkle width={14} height={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-slate-800/60 border border-ink-200 dark:border-slate-700 rounded-2xl rounded-tl-sm p-5 shadow-card">
          <div className="text-[11px] tracking-wider uppercase text-ink-400 dark:text-slate-500 font-semibold">
            Gap Questions
          </div>
          <p className="mt-1 text-[13px] text-ink-500 dark:text-slate-400 leading-relaxed">
            Pick the options that apply — or leave blank to skip a question.
          </p>

          <div className="mt-4 flex flex-col gap-5">
            {questions.map((q, i) => (
              <div key={i} className="border-t border-ink-100 dark:border-slate-700 pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-start gap-2">
                  <span className="text-[11px] rounded-md bg-ink-100 dark:bg-slate-700 text-ink-500 dark:text-slate-300 px-1.5 py-0.5 font-medium mt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <div className="text-[13.5px] font-semibold text-ink-900 dark:text-slate-100 leading-snug">
                      {q.question}
                    </div>
                    {q.milestone && (
                      <div className="mt-0.5 text-[11px] text-ink-400 dark:text-slate-500">
                        For: {milestoneLabel(q.milestone)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(q.options || []).map((opt) => {
                    const picked = selections[i].has(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggle(i, opt)}
                        className={[
                          'px-3 py-1.5 rounded-full border text-[12.5px] transition',
                          picked
                            ? 'bg-brand-500 border-brand-500 text-white'
                            : 'bg-white dark:bg-slate-800 border-ink-200 dark:border-slate-600 text-ink-700 dark:text-slate-200 hover:border-brand-300 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10',
                          disabled && 'opacity-60 cursor-not-allowed',
                        ].filter(Boolean).join(' ')}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <input
                    type="text"
                    value={freeText[i]}
                    disabled={disabled}
                    onChange={(e) =>
                      setFreeText((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                    }
                    placeholder="Or type your own answer…"
                    className="w-full bg-white dark:bg-slate-800 border border-ink-200 dark:border-slate-600 rounded-lg px-3 py-2 text-[13px] text-ink-900 dark:text-slate-100 placeholder:text-ink-400 dark:placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20 transition disabled:opacity-60"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={submit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-medium shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Submit Answers <IconArrowRight width={14} height={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
