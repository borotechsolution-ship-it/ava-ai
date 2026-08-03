# Vercel + VPS Deployment Guide

Use this split:

```text
ava.borotechsolution.com -> Vercel web app
VPS -> Ava LiveKit worker only
Supabase -> database
LiveKit Cloud -> audio rooms
```

The VPS does not need BoroTech DNS or SSL. It only needs outbound internet access.

## 1. Push This Repo To GitHub

Do not commit `.env`, logs, `.next/`, `node_modules/`, zip files, or `deploy-package/`. They are ignored by `.gitignore`.

## 2. Deploy Web App On Vercel

In Vercel:

1. Import the GitHub repository.
2. Framework preset: **Next.js**.
3. Install command: `npm install`.
4. Build command: `npm run build`.
5. Output directory: leave default.
6. Add the environment variables from `.env.example`.
7. Set:

```text
NEXT_PUBLIC_APP_URL=https://ava.borotechsolution.com
```

Vercel hosts the Next.js pages and API routes. It does not run the Ava worker.

## 3. Add Custom Domain

In Vercel project settings, add:

```text
ava.borotechsolution.com
```

In Hostinger DNS, add the CNAME Vercel gives you. Usually:

```text
Type: CNAME
Name: ava
Value: cname.vercel-dns.com
```

Wait for Vercel to show the domain as verified.

## 4. Run Ava Worker On VPS

On the VPS, clone the same GitHub repo and create a real `.env` file with the same provider secrets.

The worker command is:

```text
npm run agent:start
```

Run it with a process manager such as PM2:

```text
npm install
npm run build
npm install -g pm2
pm2 start npm --name borotech-ava-worker -- run agent:start
pm2 save
```

The worker must stay online. It connects to LiveKit and waits for dispatches from the Vercel web app.

## 5. Required Environment Variables

Vercel needs the web/API variables:

```text
NEXT_PUBLIC_APP_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SALES_AUTH_SECRET
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
DEMO_*
GEMINI_*
GOOGLE_API_KEY
```

The VPS worker needs:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
DEEPGRAM_API_KEY
DEEPGRAM_MODEL
DEEPGRAM_LANGUAGE
DEEPGRAM_ENDPOINTING_MS
GEMINI_MODEL
GEMINI_API_KEY_A
GEMINI_API_KEY_B
GEMINI_API_KEY_C
GEMINI_API_KEY_GLOBAL_BACKUP
GOOGLE_API_KEY
CARTESIA_API_KEY
CARTESIA_API_KEY_PRIMARY
CARTESIA_API_KEY_GLOBAL_BACKUP
CARTESIA_VOICE_ID
CARTESIA_MODEL_ID
CARTESIA_SPEED
CARTESIA_VOLUME
DEMO_SESSION_SECONDS
AVA_IDLE_WORKERS
AVA_MIN_ENDPOINTING_MS
AVA_MAX_ENDPOINTING_MS
AVA_PREEMPTIVE_TTS
```

It is okay if both Vercel and VPS have the full `.env` set, but never commit it.

## 6. Smoke Test

1. Open `https://ava.borotechsolution.com/sales/login`.
2. Log in as a sales account.
3. Create a fresh invite.
4. Open the invite in an incognito/private window.
5. Start the call.
6. Confirm Ava joins and speaks.

If the invite page works but Ava does not join, check the VPS PM2 logs first:

```text
pm2 logs borotech-ava-worker
```
