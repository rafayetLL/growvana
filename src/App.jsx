import React, { useState } from 'react';
import Onboarding from './components/Onboarding.jsx';
import ChatScreen from './components/ChatScreen.jsx';
import AgentsScreen from './components/AgentsScreen.jsx';
import EmailAgentScreen from './components/EmailAgentScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import { initChat } from './lib/api.js';
import { subscribeProgress, buildWebhookRequest } from './lib/webhookBus.js';

function newThreadId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'thread-' + Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [stage, setStage] = useState('onboarding'); // 'onboarding' | 'chat'
  const [initResult, setInitResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Map<stage, { at, message }> populated from relay SSE events while init runs.
  const [initProgress, setInitProgress] = useState({});

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

    // All three views stay mounted; only one is visible at a time. This
    // preserves component state (chat history, latest generation,
    // gap questions, in-flight streams, etc.) when the user toggles
    // between Foundations and Execution.
    return (
      <>
        <div className={view === 'foundations' ? 'h-screen' : 'hidden'}>
          <ChatScreen
            initResult={initResult}
            activeView="foundations"
            onSelectView={(v) =>
              setView(v === 'execution' ? 'agents' : 'foundations')
            }
          />
        </div>
        <div className={view === 'agents' ? 'h-screen flex bg-ink-50 dark:bg-slate-950' : 'hidden'}>
          <Sidebar
            activeView="execution"
            onSelectView={(v) =>
              setView(v === 'foundations' ? 'foundations' : 'agents')
            }
          />
          <AgentsScreen
            onSelectAgent={(id) => {
              if (id === 'email_marketing') setView('email_agent');
            }}
          />
        </div>
        <div className={view === 'email_agent' ? 'h-screen' : 'hidden'}>
          <EmailAgentScreen
            threadId={initResult.thread_id}
            onBack={() => setView('agents')}
            onGoToFoundations={() => setView('foundations')}
            onSelectView={(v) =>
              setView(v === 'foundations' ? 'foundations' : 'agents')
            }
            overrideThreadId={overrideThreadId}
            setOverrideThreadId={setOverrideThreadId}
            effectiveThreadId={effectiveThreadId}
          />
        </div>
      </>
    );
  }

  return (
    <Onboarding
      loading={loading}
      error={error}
      progress={initProgress}
      onContinue={start}
      onSkip={start}
    />
  );
}
