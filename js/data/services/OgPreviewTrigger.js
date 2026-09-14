import { auth } from '../firebase/firebase.js';
import { OG_PREVIEW_TRIGGER_URL } from '../../shared/config.js';

function isConfigured() {
    return /^https:\/\/(?!.*REPLACE_WITH_YOUR_SUBDOMAIN).*\.workers\.dev$/.test(OG_PREVIEW_TRIGGER_URL);
}

// يتحقق الـWorker من Firebase ID token وملكية اللوحة قبل أن يطلق GitHub Actions.
// لا يصل أي مفتاح GitHub أو Cloudflare إلى المتصفح.
async function send(boardId) {
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

const QUEUE_KEY = 'wisam-preview-pending';
let running = false;
function pending() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '{}'); }
    catch { return {}; }
}
function save(queue) { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); }

async function flush() {
    if (running || !auth.currentUser || !navigator.onLine) return;
    running = true;
    const uid = auth.currentUser.uid;
    try {
        for (const [id, entry] of Object.entries(pending())) {
            if (entry.uid !== uid) continue;
            try {
                if (await send(id)) {
                    const queue = pending();
                    if (queue[id]?.version === entry.version) delete queue[id];
                    save(queue);
                }
            } catch (error) {
                console.error('Preview update will retry automatically', error);
            }
        }
    } finally { running = false; }
}

async function request(boardId) {
    if (!auth.currentUser || !/^[a-z0-9]{8}$/.test(boardId)) return false;
    const queue = pending();
    queue[boardId] = { uid: auth.currentUser.uid, version: crypto.randomUUID() };
    save(queue);
    await flush();
    return !pending()[boardId];
}

function start() {
    window.addEventListener('online', flush);
    window.setInterval(flush, 30000);
    void flush();
}

export const OgPreviewTrigger = { request, start };
