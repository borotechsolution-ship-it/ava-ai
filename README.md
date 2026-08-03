# Private Voice Demo Invitations

Server-side, single-use invitation system for the BoroTech voice demo.

## What is included

- Internal password-protected sales page at `/sales/invites`
- Cryptographically random invite URLs at `/invite/[token]`
- SHA-256 token hashes only; plain tokens are never persisted
- Supabase Postgres migration for `demo_invites`, `demo_sessions`, session-cookie auth, and security events
- Atomic invite redemption through the `redeem_demo_invite` Postgres function
- Short-lived, opaque, HttpOnly demo session cookie
- Five-minute reconnect window that keeps the original demo deadline
- Server-side rate limiting for invite validation, redemption, and reconnect
- One automatic pre-use infrastructure failure reset per invitation
- Switchable Ava TTS provider layer and a LiveKit Ava agent worker scaffold

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in Supabase, internal sales, LiveKit, Gemini, Deepgram, and Cartesia values.

3. Apply the Supabase migration:

   ```bash
   supabase db push
   ```

4. Run the web app locally:

   ```bash
   npm run dev
   ```

5. In a second terminal, run Ava:

   ```bash
   npm run agent:dev
   ```

## Runtime Architecture

The invite flow separates page views, intentional starts, and live demo timing:

```text
Sales CRM
  -> creates a private invite and encrypted token record in Supabase

Invite page
  -> validates the token only
  -> does not consume the invite

Green call button
  -> runs a server action
  -> atomically redeems the invite in Supabase
  -> creates the demo session and secure reconnect cookie
  -> redirects to /demo

/demo page
  -> validates the session cookie server-side
  -> creates a short-lived LiveKit browser token
  -> pre-dispatches Ava into the LiveKit room so she is warming before browser audio finishes

Browser
  -> joins the LiveKit room
  -> publishes microphone audio
  -> subscribes to Ava audio

Ava worker
  -> receives room metadata
  -> loads company and industry context
  -> uses Deepgram STT, Gemini LLM, and Cartesia TTS
  -> speaks the personalized receptionist greeting
```

The invite is considered consumed after the user intentionally clicks the call button and the server creates the demo session. The 150-second demo timer starts only when Ava audio is actually playing in the browser.

## Security notes

Opening `/invite/[token]` validates the invite but does not consume it and does not generate a LiveKit token. The invite is consumed only after the call button runs the server-side start action, which calls a Postgres function that locks the invite row, checks usage and global limits, increments `sessions_used`, and creates exactly one `demo_sessions` record.

New invite tokens are stored encrypted server-side so active rows can show a copy action in the sales CRM. Older rows created before encrypted token storage must be replaced once to become copyable.
