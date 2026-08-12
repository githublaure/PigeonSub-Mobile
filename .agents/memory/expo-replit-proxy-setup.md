---
name: Expo Replit proxy setup
description: How to configure Expo/Metro so the Replit iOS/Android simulator can reach the bundler — port mapping and env vars that work.
---

# Expo Metro ↔ Replit Simulator — Working Configuration

## The Problem
The Replit iOS simulator opens `exps://<REPLIT_EXPO_DEV_DOMAIN>` and:
1. Fetches manifest at `https://<domain>/` (port 443, default HTTPS)
2. Fetches bundle at the URL embedded in the manifest

If Metro generates bundle URLs with `:8081`, the simulator cannot reach them — port 8081 is not reliably accessible externally from the Replit proxy.

## Working Solution

### `.replit` port mapping
```toml
[[ports]]
localPort = 8081
externalPort = 80
```
Only one mapping needed. Replit's HTTPS proxy at port 443 routes to the same local port as externalPort 80.

### Workflow command
```
EXPO_PACKAGER_PROXY_URL=https://$REPLIT_EXPO_DEV_DOMAIN npx expo start --clear
```

**Why `EXPO_PACKAGER_PROXY_URL` and not `REACT_NATIVE_PACKAGER_HOSTNAME`:**
- `REACT_NATIVE_PACKAGER_HOSTNAME` sets hostname but keeps `:8081` in the bundle URL → simulator can't reach it
- `EXPO_PACKAGER_PROXY_URL=https://<domain>` (no port) → @expo/cli forces port 443 → bundle URL = `https://<domain>/entry.bundle` → accessible via Replit proxy

**Why `--clear`:**
- Clears Metro cache on start to avoid stale platform-specific bundle errors

### Key env vars
- `REPLIT_EXPO_DEV_DOMAIN` — the special Expo subdomain Replit provides (e.g. `...expo.kirk.replit.dev`)
- `REPLIT_DEV_DOMAIN` — regular dev domain, NOT for Expo simulator

## Missing SDK 54 dependencies (not in default project)
- `babel-preset-expo ~54.0.12` — required devDep, Metro can't transpile without it
- `expo-asset ~12.0.13` — required by `expo/src/Expo.fx.tsx` for iOS bundling

**Why:** These are expected by expo SDK 54 internals but not auto-installed via `expo install`.

## Diagnostic flow for "Could not connect to development server"
1. Check Metro is running: `curl http://localhost:8081/` → should return `application/expo+json`
2. Check public manifest: `curl https://$REPLIT_EXPO_DEV_DOMAIN/` → same check
3. Inspect bundle URL in manifest — must NOT contain `:8081`
4. Check Metro logs for iOS bundling errors (missing modules etc.)
