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
} from './icons.jsx';
import { useTheme } from '../lib/theme.js';

export default function Sidebar({
  projectName = 'Untitled project',
  foundationPercent = 0,
  activeView = 'foundations',
  onSelectView,
  onNewProject,
  // PDF flow: hide the Foundations tab since no foundation chat ran for
  // this thread. Execution + Email Agent stay accessible.
  hideFoundation = false,
}) {
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === 'dark';

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

      <nav className="px-2 mt-2 flex flex-col gap-0.5">
        {!hideFoundation && (
          <NavItem
            icon={<IconSettings />}
            label="Foundations"
            right={`${foundationPercent}%`}
            active={activeView === 'foundations'}
            onClick={() => onSelectView?.('foundations')}
          />
        )}
        {!hideFoundation && (
          <NavItem
            icon={<IconZap />}
            label="Execution"
            active={activeView === 'execution'}
            onClick={() => onSelectView?.('execution')}
          />
        )}
        <NavItem
          icon={<IconMail />}
          label="Email Agent"
          active={activeView === 'email_agent'}
          onClick={() => onSelectView?.('email_agent')}
        />
        {activeView === 'email_agent' && (
          <button
            type="button"
            onClick={() => onSelectView?.('email_agent')}
            className="ml-7 mt-0.5 flex items-center gap-2 px-3 py-1.5 rounded-md text-[12.5px] font-medium bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-500 border-l-2 border-brand-500"
          >
            Campaign Builder
          </button>
        )}
      </nav>

      <div className="mt-auto px-2 pb-3 flex flex-col gap-0.5">
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
