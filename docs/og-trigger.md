# التحديث الفوري لبطاقة الرابط

يحفظ التطبيق البنر في Firestore أولاً. بعد نجاح الحفظ، يرسل المتصفح Firebase ID token ورقم اللوحة إلى Cloudflare Worker. يتحقق الـ Worker من الرمز ومن ملكية اللوحة العامة، ثم يطلق `repository_dispatch` في GitHub. تبني GitHub Actions صورة OG للوحة فقط، تحذف نسختها السابقة، وتدفع الملفات إلى `main` وتنشر Firebase Hosting.

## الإعداد لمرة واحدة

1. سجّل الدخول إلى Cloudflare من داخل مجلد `workers/og-preview-trigger`:
   ```bash
   npx wrangler login
   ```
2. أنشئ Fine-grained personal access token في GitHub لحساب `3Lafi`، مقتصراً على مستودع `Wisam` وبصلاحية **Contents: Read and write**.
3. خزّن الرمز في Worker، من دون وضعه في المشروع:
   ```bash
   npx wrangler secret put GITHUB_DISPATCH_TOKEN
   ```
4. انشر الـ Worker:
   ```bash
   npx wrangler deploy
   ```
5. انسخ رابط `workers.dev` الناتج إلى `OG_PREVIEW_TRIGGER_URL` في `js/shared/config.js` ثم انشر Firebase Hosting.

لا يحوي المتصفح أو GitHub أي مفتاح Cloudflare. لا يحوي المتصفح رمز GitHub؛ يبقى حصراً في Cloudflare Secrets.
