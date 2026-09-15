# Live board link previews

The share field and copy button use `https://wisam-share.wisam-3lafi.workers.dev/b/{id}`.
The Worker reads the public board from Firestore on each GET/HEAD and returns its
current name, school and class in server-rendered OG/Twitter tags. Each board
also has a 1200×630 JPEG matching its banner color and text. BoardRepository
renders the image with the browser's Canvas and locally hosted Tajawal fonts,
then saves settings and image in one Firestore batch. Only visual changes
replace an existing image. No webhook, cron, GitHub build, Firebase deployment,
service-account secret, or billing upgrade is required for a board save.

Images live in separate `boardPreviews/{id}` documents, never in the board's
student data. JPEGs are size-limited and excluded from indexes. Normal student
progress writes do not regenerate or download image data. Deleting a board
also deletes its preview in the same batch.

The Worker computes a SHA-256 revision from the current name, school, class,
theme and renderer version. OG image URLs use `/b/{id}/image.jpg?v={revision}`.
The image endpoint checks public visibility and the revision before serving
JPEG bytes. Replaced images are no longer available at old revision URLs.
Both image and HTML responses use `no-store`; WhatsApp can still retain its
own existing previews. The universal image remains the portal's own OG.

HTML and upstream reads are not cached. Private, deleted and missing boards
return 404 without board details. Temporary Firestore failures return 503 rather
than a cacheable, generic preview. The Worker uses anonymous Firestore access, so
existing security rules continue to enforce public visibility. Requests consume
the existing Firestore read and Workers free quotas; this does not make usage
unlimited or enable paid plans.

Browsers receive the same HTML as crawlers, then a small external script opens
the board on `wisam.web.app`. A normal link is available without JavaScript.
An existing WhatsApp preview may remain cached by WhatsApp; `no-store` cannot
force a third-party cache refresh.

Deployment:

```sh
npx wrangler deploy --config workers/board-share/wrangler.toml
npm run verify
firebase deploy --only firestore,hosting:wisam --project wisam-3lafi
```

For boards that predate this feature, the deployment migration is
`node scripts/migrate-board-images.mjs --apply`. It uses the existing local
Firebase CLI credentials, skips current images, and checks board revisions
within a Firestore transaction. It is a migration, not an ongoing service.
`node scripts/test-board-images.mjs` validates all theme renderings locally.

Every Firebase `/b/{id}` request redirects to the live Worker, including IDs
created after deployment. This redirect takes priority over old static preview
files. Browser visitors return through `/#/b/{id}`; the router replaces the
fragment with `/b/{id}` client-side without making another HTTP request, so
there is no redirect loop and address-bar links also have live previews.
The service worker leaves public board navigations to the browser instead of
serving a cached generic app document. The older
`og-preview-trigger` endpoint only acknowledges requests from clients still
open on old app versions, allowing their retry queues to clear. It does not
read Firestore, verify tokens, or dispatch builds. The old workflow is manual
export only and no longer listens for board creation events. The current app
does not call the endpoint or maintain a preview queue.
No per-board entry, build or manual action is needed for either link format.
