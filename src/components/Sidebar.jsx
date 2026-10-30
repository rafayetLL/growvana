import React from 'react';
import Logo from './Logo.jsx';
import {
  IconSettings,
  IconBell,
  IconHelp,
  IconChevronDown,
  IconSun,
  IconMoon,
  IconZap,
  IconPlus,
  IconMail,
  IconTarget,
  IconCompass,
  IconChart,
  IconBook,
  IconPulse,
} from './icons.jsx';
import ThreadHistory from './ThreadHistory.jsx';
import { useTheme } from '../lib/theme.js';
import { useThreadNav } from '../lib/threadNav.jsx';

// The agent entries, in the order they appear. Data rather than five near-identical
// JSX blocks, because every one of them now carries a sub-entry AND a thread list and
// the repetition was already where they drifted apart.
//
// `historyAgent` is the slug `/api/v1/threads/{agent}` takes, and its ABSENCE is
// meaningful: an entry without one shows no thread list. Execution is not an agent at
// all, and the Forecast agent keeps its own thread store on a different wire, so
// neither can be listed here.
const AGENT_ITEMS = [
  {
    view: 'email_agent',
    label: 'Email Agent',
    sub: 'Campaign Builder',
    icon: <IconMail />,
    historyAgent: 'email',
  },
  {
    view: 'meta_ad_agent',
    label: 'Meta Ad Agent',
    sub: 'Ad Workbench',
    icon: <IconTarget />,
    historyAgent: 'meta-ad',
  },
  {
    view: 'pdp_agent',
    label: 'PDP Agent',
    sub: 'Product Audit',
    icon: <IconCompass />,
    historyAgent: 'pdp',
  },
  {
    view: 'forecast_agent',
    label: 'Forecast Agent',
    sub: 'Forecast Workbench',
    icon: <IconChart />,
    historyAgent: null,
  },
  {
    view: 'asin_health',
    label: 'ASIN Health',
    sub: 'Daily & Weekly Checks',
    icon: <IconPulse />,
    // No threads: a run is one request and nothing is kept server-side.
    historyAgent: null,
  },
];

export default function Sidebar({
  projectName = 'Untitled project',
  foundationPercent = 0,
  activeView = 'foundations',
  onSelectView,
  onNewProject,
  // PDF flow: hide the Foundations tab since no foundation chat ran for
  // this thread. Execution + Email Agent stay accessible.
  hideFoundation = false,
  // Hides every thread list, for the one caller that must not show them: the docs
  // screen, whose sidebar is a mirror of the nav rather than a working one.
  hideThreads = false,
}) {
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === 'dark';

  // Straight from context rather than through props: seven components render this
  // sidebar, and drilling these through all of them is the thing the context exists
  // to avoid. Outside a provider the hook answers inert, so nothing has to guard.
  const { openThreadIds, openThread, refreshKey, startNewThread } = useThreadNav();
  const showThreads = !hideThreads;

  // Ask the screen to reopen the thread, then switch to that agent's view. The
  // navigation happens HERE rather than inside the provider, because this is where
  // both halves are already in hand: the thread nav and the app's own `onSelectView`.
  function reopen(historyAgent, view, threadId) {
    openThread(historyAgent, threadId);
    if (activeView !== view) onSelectView?.(view);
  }

  // One agent's thread list, shown only under the entry the user is actually in.
  // Rendering all four at once would fetch four rosters on every sidebar mount.
  function historyFor(item) {
    if (!item.historyAgent || activeView !== item.view || !showThreads) return null;
    return (
      <ThreadHistory
        agent={item.historyAgent}
        activeThreadId={openThreadIds[item.historyAgent]}
        onOpenThread={(threadId) => reopen(item.historyAgent, item.view, threadId)}
        onNewThread={() => startNewThread(item.historyAgent)}
        refreshKey={refreshKey}
      />
    );
  }

  return (
    <aside className="w-[220px] shrink-0 bg-white dark:bg-slate-900 border-r border-ink-200 dark:border-slate-800 flex flex-col">
      <div className="h-14 px-4 flex items-center border-b border-ink-100 dark:border-slate-800">
        <Logo />
      </div>

      <div className="px-4 pt-4 pb-3">
        {onNewProject && (
          <button
            type="button"
            onClick={onNewProject}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-ink-200 dark:border-slate-700 px-2.5 py-1.5 text-[12px] font-medium text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-800 transition"
          >
            <IconPlus width={12} height={12} /> New project
          </button>
        )}
        <div className="mt-3 text-[11px] tracking-wider uppercase text-ink-400 dark:text-slate-500 font-semibold">
          Project
        </div>
        <button className="mt-1.5 w-full flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-ink-50 dark:hover:bg-slate-800 transition">
          <span className="text-[13.5px] font-semibold text-ink-900 dark:text-slate-100 truncate" title={projectName}>{projectName}</span>
          <IconChevronDown width={14} height={14} className="text-ink-400 dark:text-slate-500" />
        </button>
      </div>

      {/* The nav scrolls: a thread list under the open agent can be longer than the
          space left below it, and without this the theme toggle and Documentation at
          the foot get pushed off the screen. */}
      <nav className="px-2 mt-2 flex flex-col gap-0.5 flex-1 overflow-y-auto min-h-0">
        {!hideFoundation && (
          <>
            <NavItem
              icon={<IconSettings />}
              label="Foundations"
              right={`${foundationPercent}%`}
              active={activeView === 'foundations'}
              onClick={() => onSelectView?.('foundations')}
            />
            {/* The Foundation agent's own threads. It is listed like any other agent
                because it IS one — it produces the Blueprint the other four consume,
                rather than being a step inside the email flow. */}
            {activeView === 'foundations' && showThreads && (
              <ThreadHistory
                agent="foundation"
                activeThreadId={openThreadIds.foundation}
                onOpenThread={(threadId) =>
                  reopen('foundation', 'foundations', threadId)
                }
                // A new FOUNDATION thread is a new project: this agent's thread is
                // what a project IS, and building one starts at the company URL
                // rather than at a setup form inside an existing session. So this
                // one alone routes to the app's new-project flow.
                onNewThread={onNewProject}
                refreshKey={refreshKey}
              />
            )}
            <NavItem
              icon={<IconZap />}
              label="Execution"
              active={activeView === 'execution'}
              onClick={() => onSelectView?.('execution')}
            />
          </>
        )}

        {AGENT_ITEMS.map((item) => (
          <React.Fragment key={item.view}>
            <NavItem
              icon={item.icon}
              label={item.label}
              active={activeView === item.view}
              onClick={() => onSelectView?.(item.view)}
            />
            {activeView === item.view && (
              <button
                type="button"
                onClick={() => onSelectView?.(item.view)}
                className="ml-7 mt-0.5 flex items-center gap-2 px-3 py-1.5 rounded-md text-[12.5px] font-medium bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-500 border-l-2 border-brand-500"
              >
                {item.sub}
              </button>
            )}
            {historyFor(item)}
          </React.Fragment>
        ))}
      </nav>

      <div className="mt-auto px-2 pb-3 flex flex-col gap-0.5">
        {/* Documentation sits above the utility row, not in the agent list: it
            describes the agents rather than being one, and it is reachable from
            every flow (including the standalone ones) so it can't hang off a
            project session. */}
        <NavItem
          icon={<IconBook />}
          label="Documentation"
          active={activeView === 'documentation'}
          onClick={() => onSelectView?.('documentation')}
        />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition text-[13px] text-ink-500 dark:text-slate-400 hover:bg-ink-50 dark:hover:bg-slate-800 hover:text-ink-700 dark:hover:text-slate-200"
        >
          <span className="text-ink-400 dark:text-slate-500">
            {isDark ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
          </span>
          <span className="flex-1 text-left">{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <NavItem icon={<IconBell />} label="Notifications" />
        <NavItem icon={<IconHelp />} label="Help" />
      </div>
    </aside>
  );
}

function NavItem({ icon, label, right, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition text-[13px]',
        active
          ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-500 font-medium'
          : 'text-ink-500 dark:text-slate-400 hover:bg-ink-50 dark:hover:bg-slate-800 hover:text-ink-700 dark:hover:text-slate-200',
      ].join(' ')}
    >
      <span className={active ? 'text-brand-600 dark:text-brand-500' : 'text-ink-400 dark:text-slate-500'}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {right && <span className="text-[11px] text-ink-400 dark:text-slate-500">{right}</span>}
    </button>
  );
}
