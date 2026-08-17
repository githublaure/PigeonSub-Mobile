---
name: PigeonSub backend architecture
description: Decisions for the self-hosted Express backend replacing the old PigeonSubscription repo dependency
---

- Backend: Express on local port 8082 → external port 3000; mobile app reaches it at `https://$REPLIT_DEV_DOMAIN:3000`.
- `EXPO_PUBLIC_API_BASE_URL` is injected in the Start Expo workflow command with `$REPLIT_DEV_DOMAIN` (dynamic). **Why:** a stale `.env` in the repo carries an old repl domain; workflow env vars take precedence over `.env` and survive domain changes. Agent cannot edit `.env` (tool-blocked).
- Replit internal PostgreSQL does not support SSL — `pg` Pool must use `ssl: false`.
- JWT secret = `SESSION_SECRET` Replit secret; server refuses to start without it (no fallback).
- All routes ownership-scoped per user; `voice_reminders` has FK ON DELETE CASCADE to subscriptions; account deletion is a single `DELETE FROM users` (cascades everything).
- V1 store scope (user decision): keep backend + accounts; voice/coupons/advanced stats are post-V1 and may remain hidden.
