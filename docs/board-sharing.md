# Live board link previews

The share field and copy button use `https://wisam-share.wisam-3lafi.workers.dev/b/{id}`.
The Worker reads the public board from Firestore on each GET/HEAD and returns its
current name, school and class in server-rendered OG/Twitter tags. It uses the
single approved `wisam-universal-v2.jpg`. No per-board generation, webhook, cron,
GitHub build, Firebase deployment, service-account secret, or billing upgrade is
required for a board save.

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
firebase deploy --only hosting:wisam --project wisam-3lafi
```

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
