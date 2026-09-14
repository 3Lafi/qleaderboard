import { auth } from '../firebase/firebase.js';
import { OG_PREVIEW_TRIGGER_URL } from '../../shared/config.js';

function isConfigured() {
    return /^https:\/\/(?!.*REPLACE_WITH_YOUR_SUBDOMAIN).*\.workers\.dev$/.test(OG_PREVIEW_TRIGGER_URL);
}

// يتحقق الـWorker من Firebase ID token وملكية اللوحة قبل أن يطلق GitHub Actions.
// لا يصل أي مفتاح GitHub أو Cloudflare إلى المتصفح.
async function request(boardId) {
    if (!isConfigured() || !auth.currentUser || !/^[a-z0-9]{8}$/.test(boardId)) return false;
    // قد تبقى جلسة المعلم مفتوحة لساعات؛ رمز جديد يضمن أن الـ Worker يقبل
    // طلب التحديث فور إنشاء اللوحة أو تعديل بيانات المشاركة.
    const idToken = await auth.currentUser.getIdToken(true);
    const response = await fetch(OG_PREVIEW_TRIGGER_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId }),
        keepalive: true,
    });
    if (!response.ok) throw new Error(`OG preview trigger failed (${response.status})`);
    return true;
}

export const OgPreviewTrigger = { request };
