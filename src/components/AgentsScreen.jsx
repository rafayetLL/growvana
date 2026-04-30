import React from 'react';
import {
  IconMail,
  IconChat,
  IconDoc,
  IconSearch,
  IconTarget,
  IconVideo,
  IconMegaphone,
  IconNewspaper,
  IconCheck,
  IconClock,
  IconSparkle,
} from './icons.jsx';

const AGENTS = [
  {
    id: 'email_marketing',
    name: 'Email Marketing Agent',
    description: 'Automated email campaigns, newsletters, and drip sequences',
    icon: IconMail,
    iconBg: 'bg-rose-50 dark:bg-rose-500/10',
    iconColor: 'text-rose-500 dark:text-rose-400',
    status: 'active',
    statKey: 'Active Campaigns',
    statValue: 3,
    enabled: true,
  },
  {
    id: 'social_media',
    name: 'Social Media Agent',
    description: 'Content creation and scheduling across all platforms',
    icon: IconChat,
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    status: 'active',
    statKey: 'Posts This Week',
    statValue: 12,
    enabled: false,
  },
  {
    id: 'content_marketing',
    name: 'Content Marketing Agent',
    description: 'Blog posts, articles, and long-form content creation',
    icon: IconDoc,
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-500 dark:text-amber-400',
    status: 'active',
    statKey: 'Articles Published',
    statValue: 8,
    enabled: false,
  },
  {
    id: 'seo',
    name: 'SEO Agent',
    description: 'Keyword research, optimization, and ranking monitoring',
    icon: IconSearch,
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    status: 'inactive',
    statKey: 'Keywords Tracked',
    statValue: 45,
    enabled: false,
  },
  {
    id: 'paid_advertising',
    name: 'Paid Advertising Agent',
    description: 'Google Ads, Facebook Ads, and campaign optimization',
    icon: IconTarget,
    iconBg: 'bg-rose-50 dark:bg-rose-500/10',
    iconColor: 'text-rose-500 dark:text-rose-400',
    status: 'inactive',
    statKey: 'Active Campaigns',
    statValue: 0,
    enabled: false,
  },
  {
    id: 'video_marketing',
    name: 'Video Marketing Agent',
    description: 'Video content creation, editing, and distribution',
    icon: IconVideo,
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    iconColor: 'text-violet-500 dark:text-violet-400',
    status: 'setup',
    statKey: 'Videos Produced',
    statValue: 2,
    enabled: false,
  },
  {
    id: 'pr_media',
    name: 'PR & Media Agent',
    description: 'Press releases, media outreach, and relationship building',
    icon: IconMegaphone,
    iconBg: 'bg-rose-50 dark:bg-rose-500/10',
    iconColor: 'text-rose-500 dark:text-rose-400',
    status: 'setup',
    statKey: 'Press Releases',
    statValue: 1,
    enabled: false,
  },
  {
    id: 'newsletter',
    name: 'Newsletter Agent',
    description: 'Weekly/monthly newsletter creation and distribution',
    icon: IconNewspaper,
    iconBg: 'bg-slate-100 dark:bg-slate-700/40',
    iconColor: 'text-slate-500 dark:text-slate-400',
    status: 'setup',
    statKey: 'Subscribers',
    statValue: 234,
    enabled: false,
  },
];

function StatusBadge({ status }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        <IconCheck width={11} height={11} /> Active
      </span>
    );
  }
  if (status === 'inactive') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
        <IconClock width={11} height={11} /> Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-500">
      <IconSparkle width={11} height={11} /> Setup Required
    </span>
  );
}

export default function AgentsScreen({ onSelectAgent }) {
  const activeCount = AGENTS.filter((a) => a.status === 'active').length;

  return (
    <div className="flex-1 overflow-y-auto bg-ink-25 dark:bg-slate-950">
      <header className="border-b border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-10 py-5 flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink-900 dark:text-slate-100">AI Marketing Agents</h1>
          <p className="text-[13px] text-ink-500 dark:text-slate-400 mt-1">
            Deploy and coordinate AI agents across marketing channels
          </p>
        </div>
        <span className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 px-3 py-1 rounded-full">
          {activeCount} of {AGENTS.length} Active
        </span>
      </header>

      <div className="px-10 py-8 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={agent.enabled ? () => onSelectAgent?.(agent.id) : undefined}
            />
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 flex gap-4">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-500/15 grid place-items-center text-brand-500">
            <IconSparkle width={18} height={18} />
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-ink-900 dark:text-slate-100">
              Getting Started with AI Agents
            </div>
            <p className="text-[13px] text-ink-500 dark:text-slate-400 mt-1 leading-relaxed">
              Each agent is powered by your Company Blueprint. Click on any agent to set up campaigns,
              review content, and coordinate activities. Active agents will automatically generate
              and schedule marketing content based on your brand guidelines and target audience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent, onClick }) {
  const Icon = agent.icon;
  const clickable = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={[
        'text-left rounded-xl border bg-white dark:bg-slate-900 px-5 py-5 transition flex flex-col gap-4',
        clickable
          ? 'border-ink-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-500/40 hover:shadow-sm cursor-pointer'
          : 'border-ink-200 dark:border-slate-800 opacity-70 cursor-not-allowed',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg grid place-items-center ${agent.iconBg} ${agent.iconColor}`}>
          <Icon width={18} height={18} />
        </div>
        <StatusBadge status={agent.status} />
      </div>
      <div>
        <div className="text-[15px] font-semibold text-ink-900 dark:text-slate-100">{agent.name}</div>
        <p className="text-[13px] text-ink-500 dark:text-slate-400 mt-1 leading-relaxed">
          {agent.description}
        </p>
      </div>
      <div className="mt-auto pt-3 border-t border-ink-100 dark:border-slate-800">
        <div className="text-[11px] text-ink-400 dark:text-slate-500">{agent.statKey}</div>
        <div className="text-[18px] font-semibold text-ink-900 dark:text-slate-100 mt-0.5">
          {agent.statValue}
        </div>
      </div>
    </button>
  );
}
