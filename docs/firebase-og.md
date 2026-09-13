# First-banner previews

Deployment is pending Firebase Blaze activation. Production currently still uses static OG pages.

New clients atomically write `initialBanner` on creation. Updated rules require it to match creation settings and prevent later modification. The functions copy those values to the server-only `boardPreviews` collection. Existing Firestore rules deny client access to this collection. Storage objects remain private; the HTTP function checks current board visibility before returning bytes. Later banner edits keep the initial snapshot and image. Event retries use a generation lease and create-only Storage writes.

`scripts/prepare-og-functions.mjs` packages the current application shell, banner CSS/theme definitions, and existing preview images. Existing images are preserved on migration; original historical text cannot be recovered for boards edited before migration.

After enabling Blaze, provision the default Storage bucket. The database location was verified as `nam5`; the configuration uses `us-central1`.

Run:

```sh
node scripts/prepare-og-functions.mjs
npm ci --prefix functions
npm run verify
npx firebase-tools deploy --config firebase.og.json --only functions:og --project wisam-3lafi
```

Before switching Hosting, verify an authenticated board creation produces exactly one image, a later banner edit preserves its bytes, and private/deleted boards cannot serve an image. Implement/enable sharing readiness UI with the `?previewStatus=1` endpoint during this integration check.

Then use `firebase.og.json` for Hosting deployment. It excludes static `b/**` pages that would otherwise take precedence over function rewrites. Once validated, promote that configuration to `firebase.json` and retire the manual GitHub OG workflow. Do not deploy Hosting before the functions exist.

Cold-start screenshot rendering requires Tajawal from Google Fonts; a font-loading failure retries rather than saving a fallback-font image. Costs include event invocations, request invocations, Firestore, Storage and network traffic. `maxInstances: 2` limits concurrency, not total monthly spending. No $1 ceiling is guaranteed.
