# Hostinger Deployment Guide

Deploy this app on a subdomain first:

```text
demo.borotechsolution.com
```

## What To Upload

Upload `borotech-ava-demo-hostinger.zip`. It contains the app source only. It intentionally does not include:

- `.env`
- `node_modules/`
- `.next/`
- local logs

Hostinger should install dependencies and build the app during deployment.

## Expected Folder After Unzip

```text
borotech-ava-demo/
  agent/
  app/
  components/
  lib/
  public/
  scripts/
  supabase/
  AGENTS.md
  HOSTINGER_DEPLOYMENT.md
  README.md
  SALES_ACCOUNTS.md
  eslint.config.mjs
  next-env.d.ts
  next.config.mjs
  package-lock.json
  package.json
  tsconfig.json
```

## Hostinger Node.js App Settings

In Hostinger hPanel:

1. Go to **Websites**.
2. Add or select the subdomain `demo.borotechsolution.com`.
3. Choose **Deploy Web App** / **Node.js App**.
4. Upload `borotech-ava-demo-hostinger.zip`.
5. Select framework: **Next.js**.
6. Select Node.js version: **22.x** or newer.
7. Install command: `npm install`.
8. Build command: `npm run build`.
9. Start command: `npm start`.

`npm start` runs both the Next.js website and the Ava LiveKit worker through `scripts/start-production.mjs`.

## Production Environment Variables

Add these in Hostinger’s environment variable panel. Do not upload a real `.env` file.

```text
NEXT_PUBLIC_APP_URL=https://demo.borotechsolution.com
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SALES_AUTH_SECRET=

LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

DEEPGRAM_API_KEY=
DEEPGRAM_MODEL=nova-3
DEEPGRAM_LANGUAGE=en
DEEPGRAM_ENDPOINTING_MS=10

GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_API_KEY_A=
GEMINI_API_KEY_B=
GEMINI_API_KEY_C=
GEMINI_API_KEY_GLOBAL_BACKUP=
GOOGLE_API_KEY=
GEMINI_CONTEXT_MODEL=gemini-2.5-flash-lite
GEMINI_CONTEXT_TIMEOUT_MS=2500

TTS_PROVIDER=cartesia
CARTESIA_API_KEY=
CARTESIA_API_KEY_PRIMARY=
CARTESIA_API_KEY_GLOBAL_BACKUP=
CARTESIA_VOICE_ID=
CARTESIA_MODEL_ID=sonic-3.5
CARTESIA_SPEED=1.05
CARTESIA_VOLUME=1

DEMO_INVITE_DEFAULT_EXPIRY_HOURS=24
DEMO_INVITE_DEFAULT_MAX_SESSIONS=1
DEMO_RECONNECT_GRACE_SECONDS=300
DEMO_MAX_ACTIVE_SESSIONS_PER_INVITE=1
DEMO_GLOBAL_DAILY_LIMIT=10
DEMO_GLOBAL_MONTHLY_LIMIT=20
DEMO_SESSION_SECONDS=150
DEMO_AI_SPEECH_SECONDS=75

AVA_IDLE_WORKERS=3
AVA_MIN_ENDPOINTING_MS=40
AVA_MAX_ENDPOINTING_MS=300
AVA_PREEMPTIVE_TTS=true
```

## Supabase Before Launch

Run all SQL migrations in `supabase/migrations/` on the production Supabase project if they are not already applied. Then create sales accounts in Supabase using `SALES_ACCOUNTS.md`.

## Smoke Test

After deployment:

1. Open `https://demo.borotechsolution.com/sales/login`.
2. Log in as a sales account.
3. Create a fresh invite.
4. Open the invite URL in a private/incognito window.
5. Click the green call button.
6. Confirm Ava joins, speaks first, the timer starts after audio, and the red hang-up ends the room.
