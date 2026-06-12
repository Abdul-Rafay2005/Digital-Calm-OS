# Digital Calm OS

AI-powered web app prototype for reducing information overload across email,
chat, calendar, and task systems.

## Stack

- Next.js `latest`
- TypeScript
- Tailwind CSS
- shadcn/ui-style primitives
- Framer Motion
- Recharts
- Lucide icons

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Required production environment:

```bash
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
CALM_ENCRYPTION_KEY=replace-with-a-long-random-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="Digital Calm OS <no-reply@example.com>"
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_PUBSUB_TOPIC=projects/project-id/topics/gmail-watch
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

For local development only, `EMAIL_DELIVERY_MODE=console` prints verification
codes to the server console instead of sending email.

## Product Surface

- Cinematic landing hero with live product preview
- AI priority inbox
- Smart daily summary
- Focus mode and deep-work timer
- Cognitive load analytics with charts and calendar heatmap
- AI action center
- Keyboard command palette
- Floating voice assistant
- Adaptive workspace mood controls
- Route-based flow: Landing Page -> Authentication -> Connection Setup -> Main Dashboard
- Premium connection setup for Gmail, Google Calendar, and Google Tasks
- Real Google OAuth connection flow for onboarding
- Dashboard cards that adapt to connected Google platforms
- AI Daily Briefing, AI Priority Engine, Focus Mode, and Cognitive Load Score
- Gemini-powered signal ranking, priority labels, recommendations, and daily briefings
- Optional real OAuth API routes for Gmail, Google Calendar, and Google Tasks
- Postgres-backed passwordless auth with email verification codes
- Postgres-backed sessions, provider credentials, OAuth tokens, and provider connection metadata

## Connector Architecture

The project now includes a provider registry and API surface for real integrations:

```txt
GET  /api/connectors
GET  /api/provider-credentials
POST /api/provider-credentials
GET  /api/connections
DELETE /api/connections?provider=[provider]
POST /api/connect/[provider]
GET  /api/connect/[provider]/callback
POST /api/sync/[provider]
POST /api/ai/briefing
```

Supported provider ids:

- `gmail`
- `google-calendar`
- `google-tasks`

The onboarding page saves Google OAuth app credentials to Postgres and starts
real Google OAuth consent for each provider.

Do not ask users for Gmail passwords. Users connect accounts by
approving the provider consent screen. The credential fields in the app are for
OAuth app credentials such as Client ID and Client Secret.

For a full multi-user deployment, add webhook verification, Google Pub/Sub
handlers, token refresh jobs, scheduled sync workers, rate limiting, and email
provider domain verification.

OWN BY Abdul Rafay 
