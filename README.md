# PigeonSub Mobile

Standalone Expo (React Native) app for PigeonSub.

Latest release: [free trials, current/future costs, free export and Replit retrieval](docs/ESSAIS-GRATUITS-20261006.md). This guide supersedes earlier quota/cost descriptions.

The SDK 57 delivery and the savings, Coupons, Stats, safety-date and photo changes
are integrated through PRs #2 and #3. See the [safety/photos release and Replit build guide](docs/SURETE-PHOTOS-20261006.md)
for free/Plus limits, backups, validation and the exact publishing boundary.

## Setup

1. Install dependencies:
   ```bash
   npm ci --include=dev
   ```
2. Copy the environment example and set your backend URL:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `EXPO_PUBLIC_API_BASE_URL` to your PigeonSub backend URL
   (e.g. your Replit dev domain, `https://your-repl.replit.dev`).
3. Start the Expo dev server:
   ```bash
   npx expo start
   ```

Then scan the QR code with Expo Go (iOS/Android) or run on a simulator.

## Mobile iOS build (separate from backend publishing)

Use Node 22.13+ or Node 24 and npm. The mobile project is the repository root
(the directory containing `app.json` and the package named `pigeonsub-mobile`),
**not** `backend/`. Main and this feature branch use **57.0.26 / SDK 57**.
See [SDK 57, themes and Replit preview](docs/SDK57-REPLIT-20261006.md) for retrieval,
preview compatibility, validation and rollback. The SDK 54 build remains backed up.

In a disposable checkout, run:

```bash
npm run mobile:prepare:ios
npm run mobile:export:ios
npm test
```

`mobile:prepare:ios` checks that the mobile lockfile uses public npm tarballs with
integrity hashes, runs `npm ci --include=dev` at the mobile root, checks the exact
local Expo version, then executes its local CLI with
`prebuild --no-install --platform ios`. Installation/preflight errors stop the
build. No global CLI or unpinned `npx` fallback is used. Dev dependencies are
required for Babel. This command replaces root `node_modules` and generates
`ios/`; use a disposable checkout to avoid disturbing a running dev server.

`npm run mobile:check` checks an existing installation without installing.
`mobile:export:ios` requires that check to pass and writes the production iOS
JavaScript/assets bundle to `dist/ios`. It does not archive or sign an app.
The equivalent diagnostic command after successful installation/preflight is
`npx --no-install expo prebuild --no-install --platform ios`.

### Expo Launch: what is known and what must be checked

The supplied failure excerpt shows `npx` downloading Expo 57.0.26 and then failing
to find the project's Expo module. It does **not** show the earlier install
command or working directory. Those earlier Launch logs are not available in
this checkout. A skipped install, a failed install and the wrong root cannot be
distinguished from that excerpt alone.

The mobile lockfile previously referenced Replit-private registries. It now uses
public npm URLs while preserving locked versions and integrity hashes.
The supported mobile preparation command above installs before prebuild.

Before approving another Launch build, check the full install/prebuild logs in
the mobile publishing flow: the project root must be the repository root and a
successful root dependency install must precede prebuild. Do not reuse
`npm ci --prefix backend` for a mobile build. No documented Launch-specific
install-command/root UI setting or configuration hook has been established for
this project, so no invented setting or hook is added here. If Launch still
skips installation, retain the complete logs and have the build setup corrected
to run the preparation sequence above; adding an npm script alone does not prove
Launch invokes it automatically.

Linux prebuild and production bundle checks cannot validate CocoaPods/Xcode
compilation, signing, TestFlight upload or App Store acceptance. A macOS cloud
retry requires user approval; no credentials or publishing are needed for the
local checks.

### Validation performed (2026-10-04)

In a disposable Linux copy of tracked sources plus these build scripts, without
workspace `node_modules` or `.env`, using an empty npm cache:

- Missing-install preflight failed with the expected actionable error.
- Root `npm ci` installed successfully; local Expo resolved to 54.0.37.
- Both the preparation command and the equivalent
  `npx --no-install expo prebuild --no-install --platform ios` passed.
- Production iOS export passed (1,120 modules, Hermes bundle and 51 assets).
- All 13 tests passed, including the existing auth-route tests.
- All 751 distinct public tarball URLs returned successful HTTP responses.
  All 816 lockfile replacements preserved versions and integrity hashes.

Prebuild warned that no iOS app icon is configured; that is separate from the
missing-Expo failure. Native compilation/signing and the actual Launch install
sequence have not been verified. No API URL or app identity was changed.

## Backend publishing and Replit development

Backend publishing remains unchanged: `.replit` installs with
`npm ci --prefix backend` and runs `node backend/server.js`. It intentionally
does not install Expo. The backend lockfile and hosting configuration are
separate from the mobile build.

The existing Start Expo / Start Backend workflows and `scripts/post-merge.sh`
remain unchanged. Do not replace the Expo development proxy configuration with
mobile archive/build commands.
