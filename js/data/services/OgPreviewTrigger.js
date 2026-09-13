import { auth } from '../firebase/firebase.js';
import { OG_PREVIEW_TRIGGER_URL } from '../../shared/config.js';

function isConfigured() {
    return /^https:\/\/(?!.*REPLACE_WITH_YOUR_SUBDOMAIN).*\.workers\.dev$/.test(OG_PREVIEW_TRIGGER_URL);
}

// هذا الطلب لا يحمل أي مفتاح نشر. الـ Worker يتحقق من Firebase ID token ثم يطلق
// GitHub Actions من جانبه، لذلك لا يستطيع المتصفح الوصول إلى أسرار GitHub.
async function request(boardId) {
    if (!isConfigured() || !auth.currentUser || !/^[a-z0-9]{8}$/.test(boardId)) return false;
    const idToken = await auth.currentUser.getIdToken();
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
