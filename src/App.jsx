import React, { useState } from 'react';
import CampaignChooser from './components/CampaignChooser.jsx';
import EmailLanding from './components/EmailLanding.jsx';
import Onboarding from './components/Onboarding.jsx';
import ChatScreen from './components/ChatScreen.jsx';
import AgentsScreen from './components/AgentsScreen.jsx';
import EmailAgentBuilderScreen from './components/EmailAgentBuilderScreen.jsx';
import MetaAdAgentBuilderScreen from './components/MetaAdAgentBuilderScreen.jsx';
import PdpAgentScreen from './components/PdpAgentScreen.jsx';
import ForecastAgentScreen from './components/ForecastAgentScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import { initChat } from './lib/api.js';
import { initEmailAgentWithPdf } from './lib/emailAgentApi.js';
import { subscribeProgress, buildWebhookRequest } from './lib/webhookBus.js';

// PDF flow has no website to scrape and no foundation step to derive a
// brand name from — keep the project label static and uniform.
const PDF_FLOW_PROJECT_NAME = 'Company Name';

// Map sidebar slugs ↔ App view names. Sidebar emits 'foundations' |
// 'execution' | 'email_agent' | 'meta_ad_agent' | 'pdp_agent'; the App's view
// state uses the same values plus 'agents' (the agent-grid landing inside
// Execution).
function viewFromSidebar(slug) {
  if (slug === 'foundations') return 'foundations';
  if (slug === 'email_agent') return 'email_agent';
  if (slug === 'meta_ad_agent') return 'meta_ad_agent';
  if (slug === 'pdp_agent') return 'pdp_agent';
  if (slug === 'forecast_agent') return 'forecast_agent';
  if (slug === 'execution') return 'agents';
  return 'foundations';
}

function sidebarFromView(view) {
  if (view === 'foundations') return 'foundations';
  if (view === 'email_agent') return 'email_agent';
  if (view === 'meta_ad_agent') return 'meta_ad_agent';
  if (view === 'pdp_agent') return 'pdp_agent';
  if (view === 'forecast_agent') return 'forecast_agent';
  return 'execution';
}

function newThreadId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'thread-' + Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [stage, setStage] = useState('landing'); // 'landing' | 'onboarding' | 'chat' | 'meta_ad' | 'pdp' | 'forecast'
  // Which campaign type the user picked on the first screen.
  //   null       → show the CampaignChooser
  //   'email'    → the Email Campaign landing/flow
  //   'meta_ad'  → the standalone Meta Ad Agent (stage becomes 'meta_ad')
  //   'pdp'      → the standalone PDP Agent (stage becomes 'pdp')
  //   'forecast' → the standalone Forecast Agent (stage becomes 'forecast')
  const [campaign, setCampaign] = useState(null);
  // Thread id for the standalone Meta Ad flow (no email/foundation session
  // backs it — the Meta Ad agent self-inits from ad-account creds / PDF).
  const [metaThreadId, setMetaThreadId] = useState('');
  // Session marker for the standalone Forecast flow: the forecast wire REQUIRES
  // a foundation_thread_id (stored, never read in v1) and no foundation session
  // backs a standalone forecast, so a fresh id is minted to fill the slot.
  const [forecastFoundationId, setForecastFoundationId] = useState('');
  const [initResult, setInitResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Map<stage, { at, message }> populated from relay SSE events while init runs.
  const [initProgress, setInitProgress] = useState({});

  // PDF-flow only: the response from /email-agent/init_with_pdf. Passed to
  // EmailAgentBuilderScreen so it skips its own /email-agent/init call
  // (the email-side checkpoint is already populated by init_with_pdf, and
  // /init's phase-1 checkpoint lookup would fail for this thread).
  // null when in foundation flow.
  const [preInitedEmail, setPreInitedEmail] = useState(null);
  const pdfFlow = preInitedEmail !== null;

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

  // Reset everything back to the landing page ("New project" button in Sidebar).
  function handleNewProject() {
    setStage('landing');
    setCampaign(null);
    setMetaThreadId('');
    setForecastFoundationId('');
    setInitResult(null);
    setPreInitedEmail(null);
    setLoading(false);
    setError(null);
    setInitProgress({});
    setOverrideThreadId('');
    setView('foundations');
  }

  // CampaignChooser → route into the chosen flow.
  function handlePickCampaign(type) {
    if (type === 'meta_ad') {
      setMetaThreadId(newThreadId());
      setCampaign('meta_ad');
      setStage('meta_ad');
      return;
    }
    if (type === 'pdp') {
      // No thread id to seed: the PDP screen mints its own, because one PDP
      // thread covers exactly one product and its init inputs are immutable.
      setCampaign('pdp');
      setStage('pdp');
      return;
    }
    if (type === 'forecast') {
      // The forecast screen mints its own thread. The wire REQUIRES a
      // foundation_thread_id (stored, never read in v1), and a standalone
      // forecast has no foundation session behind it — so one is minted here
      // as the session marker, the Meta Ad standalone's arrangement.
      setForecastFoundationId(newThreadId());
      setCampaign('forecast');
      setStage('forecast');
      return;
    }
    setCampaign('email'); // stays on the 'landing' stage → EmailLanding
  }

  async function startWithPdf(file) {
    setLoading(true);
    setError(null);
    setInitProgress({});
    const thread_id = newThreadId();
    try {
      const result = await initEmailAgentWithPdf({ thread_id, pdfFile: file });
      setInitResult({
        thread_id: result.thread_id,
        company_name: PDF_FLOW_PROJECT_NAME,
        ai_message: result.ai_message,
        questions: result.questions || [],
      });
      setPreInitedEmail(result);
      setView('email_agent');
      setStage('chat');
    } catch (e) {
      setError(e.message || 'Failed to upload PDF');
    } finally {
      setLoading(false);
    }
  }

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
    const projectName = initResult.company_name || 'Untitled project';

    // All views stay mounted; only one is visible at a time. This
    // preserves component state (chat history, latest generation,
    // gap questions, in-flight streams, etc.) when the user toggles
    // between Foundations / Execution / Email Agent.
    const handleSidebar = (slug) => setView(viewFromSidebar(slug));

    return (
      <>
        {!pdfFlow && (
          <div className={view === 'foundations' ? 'h-screen' : 'hidden'}>
            <ChatScreen
              initResult={initResult}
              activeView="foundations"
              onSelectView={handleSidebar}
              projectName={projectName}
              onNewProject={handleNewProject}
            />
          </div>
        )}
        {!pdfFlow && (
          <div className={view === 'agents' ? 'h-screen flex bg-ink-50 dark:bg-slate-950' : 'hidden'}>
            <Sidebar
              projectName={projectName}
              activeView={sidebarFromView(view)}
              onSelectView={handleSidebar}
              onNewProject={handleNewProject}
            />
            <AgentsScreen
              onSelectAgent={(id) => {
                if (id === 'email_marketing') setView('email_agent');
                if (id === 'meta_ad_agent') setView('meta_ad_agent');
                if (id === 'pdp_agent') setView('pdp_agent');
                if (id === 'forecast_agent') setView('forecast_agent');
              }}
            />
          </div>
        )}
        <div className={view === 'email_agent' ? 'h-screen' : 'hidden'}>
          <EmailAgentBuilderScreen
            threadId={initResult.thread_id}
            isActive={view === 'email_agent'}
            onBack={handleNewProject}
            onGoToFoundations={() => setView('foundations')}
            onSelectView={handleSidebar}
            overrideThreadId={overrideThreadId}
            setOverrideThreadId={setOverrideThreadId}
            effectiveThreadId={effectiveThreadId}
            projectName={projectName}
            onNewProject={handleNewProject}
            preInitedResult={preInitedEmail}
            hideFoundation={pdfFlow}
          />
        </div>
        <div className={view === 'meta_ad_agent' ? 'h-screen' : 'hidden'}>
          <MetaAdAgentBuilderScreen
            threadId={initResult.thread_id}
            isActive={view === 'meta_ad_agent'}
            onBack={() => setView('agents')}
            onSelectView={handleSidebar}
            projectName={projectName}
            onNewProject={handleNewProject}
          />
        </div>
        <div className={view === 'pdp_agent' ? 'h-screen' : 'hidden'}>
          {/* The PDP screen mints its own product thread — the session thread is
              passed only as the Foundation thread the brand context loads from,
              and the screen sends it silently rather than asking for it (the Meta
              Ad screen's arrangement). In the PDF flow there is NO phase-1
              checkpoint behind that id, so it is withheld; the screen then takes
              the multipart entry, where a Blueprint PDF is optional. */}
          <PdpAgentScreen
            foundationThreadId={pdfFlow ? undefined : initResult.thread_id}
            onBack={() => setView('agents')}
            onSelectView={handleSidebar}
            projectName={projectName}
            onNewProject={handleNewProject}
            hideFoundation={pdfFlow}
          />
        </div>
        <div className={view === 'forecast_agent' ? 'h-screen' : 'hidden'}>
          {/* The forecast screen mints (or reopens) its own thread; the session
              thread rides along only as the required foundation_thread_id —
              stored server-side for a later Blueprint read, not consulted in
              v1, so it is passed in the PDF flow too. */}
          <ForecastAgentScreen
            activeView="forecast_agent"
            onSelectView={handleSidebar}
            foundationThreadId={initResult.thread_id}
            projectName={projectName}
            onNewProject={handleNewProject}
          />
        </div>
      </>
    );
  }

  // Standalone Meta Ad campaign — picked from the chooser, no email/foundation
  // session. The Meta Ad agent inits itself from ad-account creds / PDF.
  if (stage === 'meta_ad') {
    return (
      <MetaAdAgentBuilderScreen
        threadId={metaThreadId}
        isActive
        onBack={handleNewProject}
        onSelectView={(slug) => {
          // No shared project session here; any non-meta nav target starts a
          // fresh Email Campaign from the chooser/landing instead.
          if (slug !== 'meta_ad_agent') handleNewProject();
        }}
        hideFoundation
        projectName="Meta Ad Campaign"
        onNewProject={handleNewProject}
      />
    );
  }

  // Standalone product audit — picked from the chooser, no email/foundation
  // session. No `foundationThreadId` is passed, so the screen takes the multipart
  // entry: brand context comes from a Blueprint PDF if the founder uploads one, and
  // the audit runs without any if they don't.
  if (stage === 'pdp') {
    return (
      <PdpAgentScreen
        onBack={handleNewProject}
        onSelectView={(slug) => {
          // No shared project session here; any non-PDP nav target starts a fresh
          // campaign from the chooser/landing instead.
          if (slug !== 'pdp_agent') handleNewProject();
        }}
        hideFoundation
        projectName="Product Page Audit"
        onNewProject={handleNewProject}
      />
    );
  }

  // Standalone forecast — picked from the chooser, no email/foundation session.
  // The minted session id rides as the required (stored-only) foundation id.
  if (stage === 'forecast') {
    return (
      <ForecastAgentScreen
        activeView="forecast_agent"
        foundationThreadId={forecastFoundationId}
        onSelectView={(slug) => {
          // No shared project session here; any non-forecast nav target starts
          // a fresh campaign from the chooser/landing instead.
          if (slug !== 'forecast_agent') handleNewProject();
        }}
        hideFoundation
        projectName="Sales Forecast"
        onNewProject={handleNewProject}
      />
    );
  }

  if (stage === 'onboarding') {
    return (
      <Onboarding
        loading={loading}
        error={error}
        progress={initProgress}
        onContinue={start}
        onSkip={start}
        onBack={() => setStage('landing')}
      />
    );
  }

  // Landing: first the campaign-type chooser, then the chosen campaign's entry.
  if (campaign === null) {
    return <CampaignChooser onSelect={handlePickCampaign} />;
  }

  return (
    <EmailLanding
      onSelectFoundation={() => setStage('onboarding')}
      onUploadPdf={startWithPdf}
      onBack={() => setCampaign(null)}
      uploading={loading}
      error={error}
    />
  );
}
