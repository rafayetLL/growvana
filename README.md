# Growvana Frontend

Vite + React + Tailwind CSS client for the Growvana Chat API.

## Run

```bash
cd growvana-frontend
npm install
npm run dev
```

Opens on `http://localhost:5173`. Requests to `/api/*` are proxied to the FastAPI backend at `http://127.0.0.1:8000` (see `vite.config.js`).

## Flow

1. **Onboarding** — user enters their company URL and one or more public document URLs (PDF / DOCX / TXT). Hitting **Continue** calls `POST /api/v1/chat/init`. **Skip** proceeds with no documents.
2. **Chat screen** — shows the initial AI message and any gap questions returned by `/chat/init`. User picks options per question and submits; the app calls `POST /api/v1/chat/stream` with `gap_answers` positionally aligned to the stored question list.
3. Subsequent free-text messages call `/chat/stream` with `user_message`. Tokens stream in live (SSE). On `done`, the app updates the 5 milestones in the right-hand sidebar:
   - Competitive Analysis
   - Market Analysis
   - Brand Bible
   - Buyer Personas
   - Company Blueprint
4. Clicking a milestone with a draft opens a full-screen markdown viewer.

## Files

```
src/
  App.jsx                     # Stage router: onboarding → chat
  lib/
    api.js                    # initChat() + streamChat() SSE iterator
    milestones.js             # Canonical milestone order + labels
  components/
    Onboarding.jsx            # Company URL + document URL inputs
    ChatScreen.jsx            # Layout + state machine for the chat
    Sidebar.jsx               # Left nav
    MilestonesPanel.jsx       # Right deliverables panel
    MilestoneViewer.jsx       # Full-screen markdown overlay
    GapQuestions.jsx          # Inline multi-select gap-question card
    Composer.jsx              # Message input
    MessageRenderers.jsx      # Assistant/user chat bubbles
    Logo.jsx
    icons.jsx                 # Inline SVG icon set
```

## Notes

- Streaming uses `fetch()` + `ReadableStream` (EventSource can't POST).
- `webhook_request` is omitted from client calls — the backend already delivers milestones via the `done` SSE event, and the frontend can't receive inbound webhooks.
- The 5-milestone order is fixed in `src/lib/milestones.js`.
