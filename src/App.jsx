import React, { useEffect, useRef, useState } from 'react';
import CampaignChooser from './components/CampaignChooser.jsx';
import EmailLanding from './components/EmailLanding.jsx';
import Onboarding from './components/Onboarding.jsx';
import ChatScreen from './components/ChatScreen.jsx';
import AgentsScreen from './components/AgentsScreen.jsx';
import EmailAgentBuilderScreen from './components/EmailAgentBuilderScreen.jsx';
import MetaAdAgentBuilderScreen from './components/MetaAdAgentBuilderScreen.jsx';
import PdpAgentScreen from './components/PdpAgentScreen.jsx';
import ForecastAgentScreen from './components/ForecastAgentScreen.jsx';
import DocsScreen from './components/DocsScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import { initChat } from './lib/api.js';
import { initEmailAgentWithPdf } from './lib/emailAgentApi.js';
import { subscribeProgress, buildWebhookRequest } from './lib/webhookBus.js';
import { ThreadNavProvider } from './lib/threadNav.jsx';
import { recallSession, rememberSession } from './lib/threadHistoryApi.js';

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

// The App does NOT map thread-history slugs to views: the sidebar owns that, because
// it is where a thread is clicked and it already holds `onSelectView`. See
// `AGENT_ITEMS` in Sidebar.jsx, which pairs each history slug with its view.

function newThreadId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'thread-' + Math.random().toString(36).slice(2, 10);
}

// The provider wraps the whole app rather than sitting inside it, because every
// screen renders its own sidebar and each one needs the same thread state. It holds
// only agent→thread-id; a thread's contents are always re-read from the backend.
export default function App() {
  return (
    <ThreadNavProvider>
      <AppInner />
    </ThreadNavProvider>
  );
}

// Everything the app needs to put someone back where they were after a reload. It is
// read ONCE, synchronously, before the first render — restoring in an effect would
// flash the agent chooser first, and that flash reads as "my work is gone", which is
// the exact thing this exists to fix.
//
// Only a flow that actually has a thread behind it is restored. `onboarding` is
// deliberately not: nothing has been created at that point, so reopening it would
// re-show a half-filled form with no thread under it.
const RESTORABLE_STAGES = new Set(['chat', 'meta_ad', 'pdp', 'forecast']);

function restoredSession() {
  const saved = recallSession();
  if (!saved || !RESTORABLE_STAGES.has(saved.stage)) return null;
  // The project flow is the one that needs a thread id to rebuild anything; the
  // standalone flows mint or reopen their own inside the screen.
  if (saved.stage === 'chat' && !saved.threadId) return null;
  return saved;
}

function AppInner() {
  const restored = useRef(restoredSession()).current;

  const [stage, setStage] = useState(
    // 'landing' | 'onboarding' | 'chat' | 'meta_ad' | 'pdp' | 'forecast'
    () => restored?.stage || 'landing',
  );
  // Which campaign type the user picked on the first screen.
  //   null       → show the CampaignChooser
  //   'email'    → the Email Campaign landing/flow
  //   'meta_ad'  → the standalone Meta Ad Agent (stage becomes 'meta_ad')
  //   'pdp'      → the standalone PDP Agent (stage becomes 'pdp')
  //   'forecast' → the standalone Forecast Agent (stage becomes 'forecast')
  const [campaign, setCampaign] = useState(() => restored?.campaign ?? null);
  // Thread id for the standalone Meta Ad flow (no email/foundation session
  // backs it — the Meta Ad agent self-inits from ad-account creds / PDF).
  const [metaThreadId, setMetaThreadId] = useState(() =>
    restored?.stage === 'meta_ad' ? newThreadId() : '',
  );
  // Session marker for the standalone Forecast flow: the forecast wire REQUIRES
  // a foundation_thread_id (stored, never read in v1) and no foundation session
  // backs a standalone forecast, so a fresh id is minted to fill the slot.
  const [forecastFoundationId, setForecastFoundationId] = useState(() =>
    restored?.stage === 'forecast' ? newThreadId() : '',
  );
  // On a restore this is a STUB, not the init response: the thread already exists,
  // so there is no opening message or question list to replay — the screens read
  // those back from the thread itself. It carries the two things the shell needs
  // before any of that lands: which thread this project is, and what to call it.
  const [initResult, setInitResult] = useState(() =>
    restored?.stage === 'chat'
      ? {
          thread_id: restored.threadId,
          company_name: restored.projectName || 'Untitled project',
          ai_message: '',
          questions: [],
        }
      : null,
  );
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
  const [view, setView] = useState(() => restored?.view || 'foundations');

  // Optional thread-id override, lifted here so it persists across tab
  // switches AND is shared between Foundations and Execution. When
  // non-empty, both screens use the trimmed value as their thread_id
  // for new API calls.
  const [overrideThreadId, setOverrideThreadId] = useState('');

  // Documentation opens OVER whatever flow is running rather than replacing it:
  // the flow below stays mounted (hidden), so a chat, a half-built draft or an
  // in-flight stream is exactly where it was when the reader closes the docs.
  // Every screen's sidebar routes the 'documentation' slug here.
  const [showDocs, setShowDocs] = useState(false);

  // Where the user is, written down so a reload can put them back. Only the flow —
  // no work, no messages, no artifacts, all of which come from the backend.
  //
  // The PDF flow is deliberately NOT restorable: its brand context arrived as an
  // uploaded file this browser no longer holds, and `preInitedEmail` cannot be
  // rebuilt from an id. Restoring the shell without it would re-fire
  // `/email-agent/init` on a thread that has no Foundation behind it, which 400s.
  useEffect(() => {
    if (!RESTORABLE_STAGES.has(stage) || pdfFlow) {
      rememberSession(null);
      return;
    }
    rememberSession({
      stage,
      campaign,
      view,
      threadId: initResult?.thread_id || '',
      projectName: initResult?.company_name || '',
    });
  }, [stage, campaign, view, initResult, pdfFlow]);

  // Reset everything back to the landing page ("New project" button in Sidebar).
  function handleNewProject() {
    // Forget where they were FIRST: "New project" is the one action that says the
    // old session is finished, and leaving it written down would reopen it on the
    // next reload over the new project they are about to start.
    rememberSession(null);
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
    setShowDocs(false);
  }

  // Sidebar nav, shared by every flow. 'documentation' is intercepted here
  // instead of becoming a view, because it has to be reachable from the
  // standalone flows too — and those have no view state to route through.
  function handleSidebar(slug) {
    if (slug === 'documentation') {
      setShowDocs(true);
      return;
    }
    setView(viewFromSidebar(slug));
  }

  // CampaignChooser → route into the chosen flow.
  function handlePickCampaign(type) {
    if (type === 'foundation') {
      // The Foundation agent's own entry. It goes straight to Onboarding (company
      // URL + reference docs) and lands on the Foundations view — which is where
      // `start()` already ends up, because `view` defaults there. What changed is
      // that reaching it no longer means starting an email campaign first.
      setCampaign('foundation');
      setStage('onboarding');
      return;
    }
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

  // Open the email agent against a Foundation thread that already holds a Blueprint.
  // No phase-1 run happens here — that Blueprint exists, which is the whole point of
  // picking one — so this skips Onboarding and goes straight to the chat stage.
  //
  // The email thread REUSES the Foundation thread's id, which is what the
  // build-it-now path has always done: `/email-agent/init` reads brand context from
  // `phase_1::<foundation_thread_id>`, and the two live under different prefixes, so
  // one id names both without collision. It also means the Foundations tab beside it
  // opens the real Foundation conversation rather than an empty one.
  function startFromBlueprint(foundationThreadId, title) {
    if (!foundationThreadId) return;
    setError(null);
    setPreInitedEmail(null);
    setInitResult({
      thread_id: foundationThreadId,
      company_name: title || 'Untitled project',
      ai_message: '',
      questions: [],
    });
    setView('email_agent');
    setStage('chat');
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

  // The flow the reader is actually working in. Rendered by the component's
  // return below, hidden (not unmounted) while the documentation is open.
  function renderFlow() {
  if (stage === 'chat' && initResult) {
    const effectiveThreadId =
      overrideThreadId.trim() || initResult.thread_id;
    const projectName = initResult.company_name || 'Untitled project';

    // All views stay mounted; only one is visible at a time. This
    // preserves component state (chat history, latest generation,
    // gap questions, in-flight streams, etc.) when the user toggles
    // between Foundations / Execution / Email Agent.

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
            // Same id in every flow today — the email thread and the Foundation
            // thread share one id under two checkpoint prefixes — and named
            // explicitly so the picked-Blueprint path has somewhere to differ.
            foundationThreadId={initResult.thread_id}
            // Restored after a reload: this project's threads were opened in an
            // earlier session, so the screen reads the email thread back rather than
            // calling /init on it — unless that read 404s, which is what happens to
            // someone restored into Foundations who never opened the email agent.
            existingThread={Boolean(restored)}
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
          // fresh Email Campaign from the chooser/landing instead. Documentation
          // is the exception — it opens over this flow and closes back into it.
          if (slug === 'documentation') { setShowDocs(true); return; }
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
          // campaign from the chooser/landing instead. Documentation opens over
          // this flow and closes back into it.
          if (slug === 'documentation') { setShowDocs(true); return; }
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
          // a fresh campaign from the chooser/landing instead. Documentation
          // opens over this flow and closes back into it.
          if (slug === 'documentation') { setShowDocs(true); return; }
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
    return (
      <CampaignChooser
        onSelect={handlePickCampaign}
        onOpenDocs={() => setShowDocs(true)}
      />
    );
  }

  return (
    <EmailLanding
      onPickBlueprint={startFromBlueprint}
      onBuildBlueprint={() => handlePickCampaign('foundation')}
      onUploadPdf={startWithPdf}
      onBack={() => setCampaign(null)}
      onOpenDocs={() => setShowDocs(true)}
      uploading={loading}
      error={error}
    />
  );
  }

  // Which project name and nav shape the docs sidebar should mirror. The
  // standalone flows and the PDF flow have no Foundations step, so the tab is
  // hidden there exactly as it is on the screen underneath.
  const docsProjectName =
    (stage === 'chat' && initResult?.company_name) ||
    (stage === 'meta_ad' && 'Meta Ad Campaign') ||
    (stage === 'pdp' && 'Product Page Audit') ||
    (stage === 'forecast' && 'Sales Forecast') ||
    'Untitled project';
  const docsHideFoundation = stage !== 'chat' || pdfFlow;
  // Before a project exists there is no agent nav to show, so the docs stand on
  // their own — logo, a back button, and the pages.
  const docsStandalone = stage === 'landing' || stage === 'onboarding';

  return (
    <>
      <div style={{ display: showDocs ? 'none' : 'contents' }}>{renderFlow()}</div>
      {showDocs && (
        <DocsScreen
          projectName={docsProjectName}
          hideFoundation={docsHideFoundation}
          standalone={docsStandalone}
          onBack={() => setShowDocs(false)}
          onNewProject={() => {
            setShowDocs(false);
            handleNewProject();
          }}
          onSelectView={(slug) => {
            if (slug === 'documentation') return;
            setShowDocs(false);
            // Only a project session has views to switch between; the standalone
            // flows just close back into the single screen they were on.
            if (stage === 'chat') handleSidebar(slug);
          }}
        />
      )}
    </>
  );
}
