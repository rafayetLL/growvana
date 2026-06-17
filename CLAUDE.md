# Growvana Frontend — Knowledge Base (CLAUDE.md)

Standing context for anyone (human or AI) working in `growvana-frontend/`. Covers what the app does for the user, how every screen behaves, and the exact contracts with the backend (SSE frames, webhook events, placeholder tokens).

> **Maintenance rule:** whenever a significant change lands (new screen/flow, changed SSE/webhook contract, new env var, renamed state, new convention), update this file in the same session. This document is the single source of truth that replaces re-explaining context.

---

## PART 1 — WHAT THE APP IS

Single-page React app for the Growvana AI Marketing System. The user journey it implements:

1. **Pick a campaign type** (Email or Meta Ad).
2. **Foundation (Phase-1):** submit company URL + reference docs → watch live analysis progress → answer gap questions in chat → review five streaming deliverables (Competitive Analysis, Market Analysis, Brand Bible, Buyer Personas, Blueprint) → accept them one by one.
3. **Agents:** from the agent grid, open the **Email Marketing Agent** (CMO plans → copy → full HTML email, single or sequence) or the **Meta Ad Agent** (diagnosis → competitor lens → strategy → creative ad drafts, for creating new ads or tuning live ones).
4. Shortcut paths skip Foundation entirely by uploading a Blueprint PDF.

The app talks to the FastAPI backend (`growvana-ai-backend`) over plain `fetch` + **SSE streaming** (per-request tokens/artifacts) and receives **out-of-band progress** via webhooks relayed through **Supabase Realtime** (backend → webhook receiver edge function → `webhook_events` table INSERT → Realtime broadcast → UI).

---

## PART 2 — STACK, RUN, ENV

- **React 18.3 + Vite 5 (JSX, no TypeScript)**, Tailwind CSS 3.4, `react-markdown` + `remark-gfm`, `@supabase/supabase-js`. Package manager: **bun** (npm also works).
- **Deliberately NOT used:** React Router (stage-based conditional rendering instead), Zustand / Redux (plain `useState` + props drilling), TanStack Query (raw fetch + async-generator SSE), axios. Don't introduce these without asking.

```bash
bun install
bun dev        # Vite dev server on http://localhost:5173
bun run build  # → dist/
bun preview
```
`vite.config.js`: just `react()` plugin + port 5173 — no proxy (CORS handled by backend), no aliases (relative imports).

Env vars (`.env`, all read via `import.meta.env`):
- `VITE_API_BASE_URL` — backend base incl. `/api/v1`.
- `VITE_WEBHOOK_URL` — webhook receiver endpoint; empty string disables webhooks (`buildWebhookRequest` returns null).
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Realtime subscription.
- `VITE_LIBERATE_AAID`, `VITE_LIBERATE_TOKEN`, `VITE_LIBERATE_TENANT_ID` — Meta Ad Agent client-side credential gate (see Part 5): user-entered ad-account id + token are compared against AAID/TOKEN **in the browser**; on match only `tenant_id` + `account_id` go to the backend — the Graph token never leaves the client.

---

## PART 3 — APP ORCHESTRATION (src/App.jsx)

No router. Three state variables drive everything:

| Variable | Values | Meaning |
|---|---|---|
| `stage` | `landing` → `onboarding` → `chat`, or `meta_ad` | top-level phase |
| `campaign` | `null` / `email` / `meta_ad` | chosen on CampaignChooser |
| `view` | `foundations` / `agents` / `email_agent` / `meta_ad_agent` | which screen inside `chat` |

Render map: `landing`+null → `CampaignChooser`; `landing`+`email` → `EmailLanding`; `onboarding` → `Onboarding`; `chat` → `Sidebar` + (`ChatScreen` | `AgentsScreen` | `EmailAgentBuilderScreen` | `MetaAdAgentBuilderScreen`); `meta_ad` → standalone `MetaAdAgentBuilderScreen`.

**All chat-stage screens stay mounted** — visibility toggled with CSS `hidden` so each screen's state (messages, artifacts) survives tab switches.

Cross-screen data:
- `initResult` — response of `/chat/init` (`{thread_id, company_name, ai_message, gap_questions}`); the **foundation thread** all agent screens reference as `foundation_thread_id`.
- `preInitedEmail` — response of `/email-agent/init_with_pdf`; when set (`pdfFlow=true`) the EmailAgentBuilderScreen skips its own init and the Sidebar hides Foundations/Execution.
- `metaThreadId` — fresh UUID for the standalone Meta Ad path (no foundation).
- `overrideThreadId` — dev override (ThreadOverridePanel), lifted to App so it persists across tabs.
- `handleNewProject()` resets everything back to landing.
- Thread ids: `crypto.randomUUID()` (fallback `'thread-'+random36`).

User flow paths:
1. **Foundation → Email:** Chooser → EmailLanding ("Generate Blueprint in Foundation") → Onboarding → ChatScreen → Sidebar/AgentsScreen → EmailAgentBuilderScreen.
2. **PDF → Email (shortcut):** Chooser → EmailLanding ("Upload Blueprint PDF") → straight to EmailAgentBuilderScreen.
3. **Foundation → Meta Ad:** …ChatScreen → AgentsScreen → MetaAdAgentBuilderScreen.
4. **Standalone Meta Ad:** Chooser ("Meta Ad Campaign") → MetaAdAgentBuilderScreen (self-inits from credentials and/or Blueprint PDF).

---

## PART 4 — SCREENS IN DETAIL

### Onboarding.jsx (Phase-1 intake)
- Form: `companyUrl` (required, URL-validated) + optional `fileUrls[]` (extensions from `INIT_FILE_EXTENSIONS`: pdf, txt, csv, md, docx, pptx, xlsx, png, jpeg, jpg, webp, gif).
- Calls `initChat({thread_id, company_url, file_urls, webhook_request})` and subscribes to webhook progress for the stepper. Stages, exact order: `homepage_extraction` → `url_mapping` → `url_context_analysis` → `site_capture` → `design_identity` → (`file_analysis` only if files were submitted) → `generating_questions` (final, no event). Webhook `event_type` = `workflow.init`.
- On success App stores `initResult`, moves to `chat`/`foundations`.

### ChatScreen.jsx (Phase-1 chat + milestones)
- Message shapes: `{role:'assistant'|'user', content, time}` and `{role:'milestone', name, status, content}` — milestone cards render inline in the conversation.
- Milestone status model (drives MilestonesPanel + progress): `not_started` → `drafting` → `drafted` → `accepted`; `redrafted` = previously accepted, new draft pending. Progress bar: 20% per milestone, scaled by status (drafting 25%, drafted 50%, redrafted 70%, accepted 100% of its 20%).
- SSE handling (`streamChat` async generator): `ai_message_token` accumulates into `streamingText`; `milestone_drafting {name}` flushes pending assistant text and pushes a drafting milestone card; `deliverable_token {name, content}` appends to that card live; `done {ai_message, updated_milestones, pending_approval, newly_accepted}` backfills authoritative markdown + statuses; `error` renders inline.
- Gap questions arrive at init; `GapQuestions` renders checkbox options + free text; submit sends `gap_answers: list[list[str]]` (positional — empty array = skipped question).
- Accepting milestones is **conversational**: the panel's Accept button sends a natural-language user message ("Accept Competitive Analysis, Market Analysis") — the backend assistant parses it into `<accept_requests>`. There is no dedicated accept endpoint.
- Also subscribes to webhooks (`drafting_completed` stage) as the authoritative artifact source alongside SSE.
- `MilestoneViewer` = full-screen markdown overlay for a single milestone.

### EmailAgentBuilderScreen.jsx
- Layout: chat pane (draggable `.builder-splitter`, 360–720px) + canvas with tabs **`strategy` / `content` / `design`**.
- Init: PDF mode uses `preInitedResult`; foundation mode calls `initEmailAgent({thread_id, foundation_thread_id})`. Both return email gap questions.
- SSE: `ai_message_token` (CMO + turn-recap text) · `email_content_drafting` / `email_design_drafting` (loaders; design may fire repeatedly — dedupe) · `done {email_plan?, content?, html?}` — **null fields mean "unchanged", keep the previous value** (e.g. design-only revision arrives with `content:null`). `content`/`html` are `{kind:'single'|'sequence', single, sequence}`.
- Webhook event_type `workflow.email_agent`; granular stages drive toasts: `email.plan`, `email.plan.metadata`, `email.plan.step.metadata`, `email.plan.step`, `email.plan.content_direction`, `email.plan.design_direction`, `email.subject_lines`, `email.body`, `email.ctas`, `email.subject_line_ab_test`, `email.cta_ab_tests`, `email.placeholders`, `email.html`, `email.images`.
- **Email assets:** user adds `{name, url, alt_text}`; names normalized (`'image hero 1'` → `IMAGE_HERO_1`, must match `^[A-Za-z0-9_-]{1,64}$`). Full list lives in screen state; only *fresh* assets are sent per stream call (`email_assets` in the request body — backend downloads from `url`).
- **Placeholder substitution happens HERE, at render time** (backend keeps tokens literal): `{{<asset-name>}}` → asset URL, `{{CTA_<NAME>_LABEL}}`/`{{CTA_<NAME>_HREF}}` → chosen CTA variant text/href, `{{TEXT_*}}`/`{{LINK_*}}` likewise. Substituted HTML renders in a sandboxed `<iframe>` with desktop/mobile viewport toggle.

### MetaAdAgentBuilderScreen.jsx
- Two phases: **`setup`** (credential entry + path choice + optional Blueprint PDF) → **`ready`** (chat + canvas).
- Paths: **`create_ads`** (gap questions, agent builds campaign from scratch) vs **`tune_existing_ads`** (init returns ad cards `{ad_id, ad_name, status, effective_status, thumbnail_url, format, objective, spend, ctr, cpc, cpm}`; user picks ads → `selectedAdIds` pending vs `confirmedAdIds` locked once diagnosed; new picks go out as `selected_ad_ids` on the next stream call).
- Ad cards arrive **delivery-tiered** from the backend (up to 10: delivering → switched on but not delivering → switched off, newest first within a tier). The two status fields mirror the DB columns — `status` = advertiser toggle, `effective_status` = Meta computed — and `deliveryBadge()` in AdsPanel derives the per-card badge from them in tier order: `effective_status === 'ACTIVE'` → **Live** (mint), `status === 'ACTIVE'` → **On · not delivering** (gold), else **Off** (navy/slate). The card meta line shows `effective_status` (the reason string, e.g. CAMPAIGN_PAUSED).
- 4-step header stepper / canvas tabs: **`diagnosis` → `competitor_lens` → `strategy` → `creative`**; `doneMap` tracks completion; canvas auto-advances to the newest artifact.
- SSE: `ai_message_token` (CMO opener + a turn-recap wrap-up streamed after the specialists run — both arrive as `ai_message_token`, so accumulate them into the same assistant turn) · `diagnosis_drafting` / `competitor_lens_drafting` / `strategy_drafting` / `creative_drafting` · `done {diagnosis?, competitor_lens?, strategy?, creative?}` (null = unchanged). Diagnosis/strategy are `{diagnoses|strategies: [{ad_id, ad_name, *_html}]}` — `ad_id:'combined'` is the combined-overview doc (present for ≥2 ads or create path). The canvas orders per-ad docs FIRST and the combined roll-up LAST (`orderDocs`), and defaults the sub-view to the first per-ad doc — combined is never the default unless it's the only doc. Competitor lens is one HTML string. Creative is the structured tree `{campaigns: [{campaign, adsets: [{adset, ads: []}]}]}` for BOTH paths (create = one campaign group with null ids; tune = one group per real campaign). On tune the backend SEEDS the tree at the first creative turn as a live MIRROR of every selected ad (real ids; current copy as single-option pools; the existing image fetched at seed time into its MEASURED real aspect lane as variant v1 with `source:"existing"`, `image_url`+`image_hash` AND `data_uri` — an `aspect_ratio: null` "Current" lane appears only as the fetch-failure fallback, ref-only) — so the first `creative` payload carries ALL selected ads, not just regenerated ones, and an ad once selected stays in the draft; later turns change only what the user asked. Image slots hold aspect-ratio lanes whose variants carry `image_url`/`image_hash` (existing Meta asset) and/or `data_uri` (image bytes — generated output or the seed-time fetch of an existing asset); on the slim webhook every `data_uri` is null+`stripped`, the full base64 ships on the SSE `done` frame.
- Webhook event_type `workflow.meta_ad_agent`; stages: `meta_ad.diagnosis_html`, `meta_ad.competitor_lens_html`, `meta_ad.strategy_html`, `meta_ad.creative_draft`.
- Specialist HTML renders in iframes; creative renders as nested campaign → adset → ad cards with copy pools and image variant pickers.

### AgentsScreen.jsx / Sidebar.jsx
- Agent grid: enabled = `email_marketing`, `meta_ad_agent` (+ social shown active); disabled placeholders: content_marketing, seo, paid_advertising, video_marketing, pr_media, newsletter.
- Sidebar nav: Foundations / Execution / Email Agent / Meta Ad (Foundations+Execution hidden when `pdfFlow`), New Project, foundation progress %, theme toggle.

### Shared components
- **Composer.jsx** — textarea (Enter sends, Shift+Enter newline, autogrow to 160px); "Chat attachment" mode adds URL attachments (`CHAT_FILE_EXTENSIONS`: pdf, png, jpeg, jpg, webp); "Email asset" mode adds named image assets (popover: name/url/alt, name normalization + validation). Calls `onSend(text, attachments, freshAssets)`.
- **GapQuestions.jsx** — per-question Set of selected options + optional free text; submits merged `list[list[str]]`.
- **MessageRenderers.jsx** — `ChatMessageItem`, `DraftingActivityCard` (collapsible live-draft preview), `TypingIndicator`, `Spinner`.
- **MilestonesPanel.jsx** — 5 cards with status dots (ink=not started, violet=drafting, amber=drafted, brand green=accepted, sky=redrafted), batch Accept button.
- **ThreadOverridePanel.jsx** — dev-only thread id override. **Logo.jsx**, **icons.jsx** (20+ inline SVGs).

---

## PART 5 — THE lib/ LAYER (API + infra contracts)

### API modules — all plain fetch against `VITE_API_BASE_URL`; streams are `async function*`

- `api.js`: `initChat({thread_id, company_url, file_urls, webhook_request})` → POST `/chat/init`; `streamChat({thread_id, user_message, gap_answers, file_urls, webhook_request, signal})` → POST `/chat/stream`.
- `emailAgentApi.js`: `initEmailAgent({thread_id, foundation_thread_id})`; `initEmailAgentWithPdf({thread_id, pdfFile})` (FormData); `streamEmailAgent({thread_id, user_message, gap_answers, email_assets, webhook_request, signal})`.
- `metaAdAgentApi.js`: `initMetaAdAgent({thread_id, foundation_thread_id, path, tenant_id, account_id})`; `initMetaAdAgentWithPdf(...)` (FormData); `streamMetaAdAgent({thread_id, user_message, gap_answers, selected_ad_ids, webhook_request, signal})`.
- `emailAgentSdkApi.js`: alternate SDK mode (`streamEmailAgentSdk` — multipart, session_id, `text_delta` + artifact frames); not wired into the main UI yet.

SSE parsing pattern (identical in all modules — reuse it for new endpoints):
```js
const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
// read chunks → buf += dec.decode(value, {stream:true})
// split on '\n\n', keep the tail in buf, take lines starting with 'data:',
// JSON.parse the payload, yield it; ignore malformed frames.
```
Every stream accepts an `AbortController` `signal`; screens abort on unmount/new turn.

### Webhook bus (`webhookBus.js` + `supabase.js`)
- `buildWebhookRequest({task_id, event_type, data})` → `{webhook_url: VITE_WEBHOOK_URL, event_type, task_id, data}` or `null` when the URL is unset (webhooks cleanly disabled).
- `subscribeProgress(taskId, onEvent)` → Supabase channel `webhook:${taskId}` listening for `postgres_changes` INSERT on `public.webhook_events` filtered `task_id=eq.${taskId}`; reshapes the row to `{eventType, taskId, status, stage, status_code, success_message, error_message, data, completion_percentage, completed}`; returns `{close()}` — **always close on unmount**.
- Full pipeline: backend node fires webhook → receiver edge function inserts row → Realtime broadcast → `onEvent` in the screen. Each screen generates its own random `taskId` per session/turn batch and passes it in `webhook_request`.

### Other libs
- `milestones.js` — `MILESTONE_KEYS = ['competitive_analysis','market_analysis','brand_bible','buyer_personas','blueprint']` (exact backend keys) + `milestoneLabel()`.
- `theme.js` — class-based dark mode (`html.dark`), `initTheme()` runs in `main.jsx` before React mounts (no flash), `useTheme()` hook, localStorage key `growvana.theme`, system-preference fallback.
- `fileTypes.js` — `INIT_FILE_EXTENSIONS`, `CHAT_FILE_EXTENSIONS`, `formatExtensions()`. Keep in sync with backend MIME allowlists.

---

## PART 6 — STYLING SYSTEM

- Tailwind 3, dark mode `class` strategy. Custom palette families in `tailwind.config.js`: `brand` (emerald primary), `ink` (slate text scale), `moss` (sage green), `clay` (terracotta), `cream`, `forest`, `botanical` (line/soft/text2/text3), `navy` + `meta` (Meta Ad screen design system), `mint`, `gold`, `danger`, `positive`.
- Fonts: `sans` = Manrope/Inter (body), `display` = Fraunces serif (headings), `mono` = JetBrains Mono. Loaded from Google Fonts in `index.css`.
- Custom classes in `index.css`: `.md` (markdown typography incl. dark variants — use on every ReactMarkdown wrapper), `.thin-scroll`, `.builder-splitter` (drag handle), `.typing-dot`; `fadeInUp` animation; shadows `card`, `botanical`.
- The Meta Ad screen intentionally uses the navy/meta palette (distinct look from the botanical email/foundation screens).

---

## PART 7 — CONVENTIONS

- JSX only (no TS, no PropTypes); components PascalCase in `src/components/` (flat, no subfolders); utilities camelCase in `src/lib/`.
- State: `useState`/`useRef`/`useMemo` per screen; props drilling from App; **no global store** — if state must cross screens, lift it to App.jsx like `initResult`.
- SSE consumption: `for await (const frame of streamX(...))` with a `switch` on `frame.type`; treat `null` artifact fields in `done` frames as "no change, keep previous".
- Webhook subscriptions: one per screen mount, always `close()` in the effect cleanup.
- Error handling: try/catch around API calls → screen-local `error` state rendered inline (no error boundaries).
- Backend contract changes (frame types, stage names, milestone keys, placeholder formats) must be mirrored here AND in `growvana-ai-backend/CLAUDE.md` — these strings are duplicated by design on both sides.
