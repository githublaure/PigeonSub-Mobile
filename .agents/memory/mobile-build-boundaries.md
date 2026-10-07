---
name: Mobile build boundaries
description: Evidence limits and scope constraints for Expo Launch dependency failures.
---

Keep mobile dependency repair separate from SDK upgrades, backend publishing,
API URL changes and app identity changes.

**Why:** The user explicitly scoped dependency repair this way. The supplied
Launch excerpt showed npx fetching another SDK because local Expo was missing,
but omitted preceding installation logs. It did not establish whether the
install was skipped, failed, or ran at the wrong root.

**How to apply:** Obtain the full cloud installation logs before claiming a
cloud root cause. Do not interpret backend-only publishing as the mobile build
pipeline, or assume that adding a package script makes Launch run it. Successful
Linux prebuild/export is not proof of macOS compilation, signing or acceptance;
obtain user approval before a cloud publishing retry.

When investigating unavailable App Store publishing, repair only confirmed
registration, directory, or command mismatches and preserve the existing app
identity.

**Why:** The user explicitly required this scope; creating a replacement mobile
app is not equivalent to repairing access to the existing publishing flow.

**How to apply:** Check the live artifact registry separately from files on disk.
Do not invent a new Expo/EAS project or change bundle identifiers to make
publishing appear. Seek approval before a structural migration.