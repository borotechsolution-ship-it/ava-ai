# Vercel Web + VPS Worker Deployment Guide

Use this split for production:

```text
ava.borotechsolution.com -> Vercel web app
VPS -> Ava LiveKit worker only
Supabase -> database
LiveKit Cloud -> audio rooms
```

The VPS does not need BoroTech DNS, Nginx, SSL, or an exposed web port for Ava. It only needs outbound internet access.

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

## 4. Run Ava Worker Only On VPS

On the VPS, keep the web service disabled and run only the Ava worker service.

Use the prepared worker env file:

```text
nano /etc/ava-ai/worker.env
```

Do not place these secrets in GitHub. After saving the env file, validate without printing secret values, then start only the worker service.

If systemd services are already installed, the intended launch is:

```text
sudo systemctl daemon-reload
sudo systemctl enable ava-ai-worker
sudo systemctl start ava-ai-worker
sudo systemctl status ava-ai-worker
```

The worker must stay online. It connects outward to LiveKit Cloud and waits for dispatches from the Vercel web app. It does not need inbound traffic from the public internet.

If PM2 is used instead of systemd, the worker command is still:

```text
npm run agent:start
```

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

The VPS worker needs `/etc/ava-ai/worker.env` with:

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

For this split deployment, Vercel should keep:

```text
NEXT_PUBLIC_APP_URL=https://ava.borotechsolution.com
```

The VPS worker does not need `NEXT_PUBLIC_APP_URL` because it is not serving the website.

## 6. Smoke Test

1. Open `https://ava.borotechsolution.com/sales/login`.
2. Log in as a sales account.
3. Create a fresh invite.
4. Open the invite in an incognito/private window.
5. Start the call.
6. Confirm Ava joins and speaks.

If the invite page works but Ava does not join, check the VPS worker logs first:

```text
sudo journalctl -u ava-ai-worker -f
```

If the worker is healthy, stop the local worker on your PC and run the smoke test again. Ava should still speak. That confirms production no longer depends on your machine.
