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

## Security notes

Opening `/invite/[token]` validates the invite but does not consume it and does not generate a LiveKit token. The invite is consumed only by a POST to `/api/invite/[token]/redeem`, which calls a Postgres function that locks the invite row, checks usage and global limits, increments `sessions_used`, and creates exactly one `demo_sessions` record.

New invite tokens are stored encrypted server-side so active rows can show a copy action in the sales CRM. Older rows created before encrypted token storage must be replaced once to become copyable.
