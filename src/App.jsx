import React, { useState } from 'react';
import Onboarding from './components/Onboarding.jsx';
import ChatScreen from './components/ChatScreen.jsx';
import AgentsScreen from './components/AgentsScreen.jsx';
import EmailAgentBuilderScreen from './components/EmailAgentBuilderScreen.jsx';
import EmailAgentSdkScreen from './components/EmailAgentSdkScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import { initChat } from './lib/api.js';
import { subscribeProgress, buildWebhookRequest } from './lib/webhookBus.js';

// Map sidebar slugs ↔ App view names. Sidebar emits 'foundations' |
// 'execution' | 'email_sdk'; the App's view state uses 'foundations' |
// 'agents' | 'email_agent' | 'email_sdk'. The first two collapse for
// the sidebar (Execution = agents OR the email-agent detail view).
function viewFromSidebar(slug, currentView) {
  if (slug === 'foundations') return 'foundations';
  if (slug === 'email_sdk') return 'email_sdk';
  if (slug === 'execution') {
    return currentView === 'email_agent' ? 'email_agent' : 'agents';
  }
  return currentView;
}

function sidebarFromView(view) {
  if (view === 'foundations') return 'foundations';
  if (view === 'email_sdk') return 'email_sdk';
  return 'execution';
}

function newThreadId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'thread-' + Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [stage, setStage] = useState('onboarding'); // 'onboarding' | 'chat' | 'sdk' | 'email_direct'
  const [initResult, setInitResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Map<stage, { at, message }> populated from relay SSE events while init runs.
  const [initProgress, setInitProgress] = useState({});
  // Direct-jump thread_id for the email builder shortcut. Bypasses init.
  const [directThreadId, setDirectThreadId] = useState('');

  // Post-onboarding navigation. Three views share the same thread:
  //   'foundations' — Phase-1 chat (ChatScreen)
  //   'agents'      — agent grid (AgentsScreen)
  //   'email_agent' — Email Marketing Agent detail (EmailAgentScreen)
  const [view, setView] = useState('foundations');

  // Optional thread-id override, lifted here so it persists across tab
  // switches AND is shared between Foundations and Execution. When
  // non-empty, both screens use the trimmed value as their thread_id
  // for new API calls.
  const [overrideThreadId, setOverrideThreadId] = useState('');

  async function start({ company_url, file_urls }) {
    setLoading(true);
    setError(null);
    setInitProgress({});
    const thread_id = newThreadId();
    const task_id = crypto.randomUUID();

    // Open the SSE subscription BEFORE starting init so we can't miss any
    // webhook that lands while the connection is attaching. Backend nodes
    // fire via asyncio.create_task so events start arriving mid-pipeline.
    const webhook_request = buildWebhookRequest({
      task_id,
      event_type: 'workflow.init',
      data: { thread_id, company_url, file_urls },
    });

    const sub = webhook_request
      ? subscribeProgress(task_id, (evt) => {
          const stageName = evt?.stage;
          if (!stageName) return;
          setInitProgress((prev) => ({
            ...prev,
            [stageName]: { at: Date.now(), message: evt.success_message || '' },
          }));
        })
      : null;

    try {
      const result = await initChat({
        thread_id,
        company_url,
        file_urls,
        webhook_request,
      });
      setInitResult(result);
      setStage('chat');
    } catch (e) {
      setError(e.message || 'Failed to start session');
    } finally {
      setLoading(false);
      sub?.close();
    }
  }

  if (stage === 'chat' && initResult) {
    const effectiveThreadId =
      overrideThreadId.trim() || initResult.thread_id;

    // All four views stay mounted; only one is visible at a time. This
    // preserves component state (chat history, latest generation,
    // gap questions, in-flight streams, etc.) when the user toggles
    // between Foundations / Execution / Email Agent (SDK).
    const handleSidebar = (slug) => setView(viewFromSidebar(slug, view));

    return (
      <>
        <div className={view === 'foundations' ? 'h-screen' : 'hidden'}>
          <ChatScreen
            initResult={initResult}
            activeView="foundations"
            onSelectView={handleSidebar}
          />
        </div>
        <div className={view === 'agents' ? 'h-screen flex bg-ink-50 dark:bg-slate-950' : 'hidden'}>
          <Sidebar
            activeView={sidebarFromView(view)}
            onSelectView={handleSidebar}
          />
          <AgentsScreen
            onSelectAgent={(id) => {
              if (id === 'email_marketing') setView('email_agent');
            }}
          />
        </div>
        <div className={view === 'email_agent' ? 'h-screen' : 'hidden'}>
          <EmailAgentBuilderScreen
            threadId={initResult.thread_id}
            onBack={() => setView('agents')}
            onGoToFoundations={() => setView('foundations')}
            onSelectView={handleSidebar}
            overrideThreadId={overrideThreadId}
            setOverrideThreadId={setOverrideThreadId}
            effectiveThreadId={effectiveThreadId}
          />
        </div>
        <div className={view === 'email_sdk' ? 'h-screen' : 'hidden'}>
          <EmailAgentSdkScreen
            activeView={sidebarFromView(view)}
            onSelectView={handleSidebar}
          />
        </div>
      </>
    );
  }

  // Pre-onboarding shortcut: jump straight into the SDK agent without
  // running the phase-1 blueprint pipeline. The SDK agent is fully
  // independent of `initResult`, so we just render the screen with a
  // sidebar that hands clicks on Foundations/Execution back to the
  // onboarding screen (those views need init).
  if (stage === 'sdk') {
    return (
      <EmailAgentSdkScreen
        activeView="email_sdk"
        onSelectView={(slug) => {
          if (slug === 'email_sdk') return;
          setStage('onboarding');
        }}
      />
    );
  }

  // Pre-onboarding shortcut: jump straight into the Email Campaign
  // Builder with a user-supplied thread_id. Skips the foundation init;
  // the builder calls `/email-agent/init` itself, which will surface a
  // BlueprintMissingError if the thread has no blueprint yet.
  if (stage === 'email_direct') {
    return (
      <EmailAgentBuilderScreen
        threadId={directThreadId}
        onBack={() => setStage('onboarding')}
        onGoToFoundations={() => setStage('onboarding')}
        onSelectView={(slug) => {
          if (slug === 'execution') return;
          setStage('onboarding');
        }}
        overrideThreadId={directThreadId}
        setOverrideThreadId={setDirectThreadId}
        effectiveThreadId={directThreadId}
      />
    );
  }

  return (
    <Onboarding
      loading={loading}
      error={error}
      progress={initProgress}
      onContinue={start}
      onSkip={start}
      onOpenSdk={() => setStage('sdk')}
      onOpenEmailDirect={(threadId) => {
        setDirectThreadId(threadId);
        setStage('email_direct');
      }}
    />
  );
}
