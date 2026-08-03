# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js App Router project for a private voice-demo invitation flow.

- `app/` contains routes, pages, and API handlers.
- `app/sales/` contains the password-protected internal sales UI.
- `app/invite/[token]/` validates invitation links without consuming them.
- `app/api/` contains server-only redemption, reconnect, and session event endpoints.
- `lib/` contains shared server utilities for Supabase, crypto, LiveKit JWTs, cookies, rate limiting, and invite/session operations.
- `components/` contains reusable client components.
- `supabase/migrations/` contains Postgres schema and RPC migrations.
- `.env.example` documents required runtime configuration.

No test directory exists yet; add tests under `__tests__/` or colocated `*.test.ts` files when introducing test coverage.

## Build, Test, and Development Commands

- `npm install` installs project dependencies.
- `npm run dev` starts the local Next.js development server.
- `npm run build` creates a production build and performs framework checks.
- `npm run start` runs the production server after a successful build.
- `npm run lint` runs Next.js ESLint rules.
- `supabase db push` applies migrations to the linked Supabase project.

## Coding Style & Naming Conventions

Use TypeScript with strict mode enabled. Prefer server-side logic for security-sensitive behavior. Keep browser/client components small and only add `"use client"` when interactivity requires it.

Use 2-space indentation for JSON and TypeScript/TSX. Name React components in `PascalCase`, utility functions in `camelCase`, environment variables in `UPPER_SNAKE_CASE`, and database columns/functions in `snake_case`.

## Testing Guidelines

There is no configured test framework yet. For future work, prefer focused tests around token hashing, invite validation, redemption failure cases, and session reconnection behavior. Name tests `*.test.ts` or `*.test.tsx`.

At minimum, run `npm run lint` and `npm run build` before opening a pull request. For database changes, apply migrations to a disposable Supabase project and verify RPC behavior.

## Commit & Pull Request Guidelines

This repository has no existing commit history, so use clear imperative commit messages such as `Add atomic invite redemption` or `Harden reconnect session checks`.

Pull requests should include a short summary, security implications, migration notes, required environment variable changes, and screenshots for UI changes. Link related issues when available.

## Security & Configuration Tips

Never commit `.env` or real Supabase/LiveKit secrets. Keep `SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_SECRET`, and invitation tokens server-side only. Invitation URLs are single-use secrets; do not log full tokens or persist plain tokens.
