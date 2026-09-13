// حالة تسجيل الدخول: مصدر واحد تشترك فيه كل الصفحات
import { auth } from '../firebase/firebase.js';
import { onAuthStateChanged } from '../firebase/firebase-sdk.js';

let user = null;
let resolved = false;
const subscribers = new Set();

let resolveReady;
let readyError;
const readyPromise = new Promise(resolve => { resolveReady = resolve; });

onAuthStateChanged(auth, u => {
    user = u;
    if (!resolved) {
        resolved = true;
        resolveReady();
    }
    subscribers.forEach(cb => { try { cb(user); } catch (error) { console.error(error); } });
}, error => {
    readyError = error;
    resolved = true;
    resolveReady();
});

export const authState = {
    // ينتظر أول تحقق من الجلسة قبل توجيه المسارات المحمية
    ready: async () => { await readyPromise; if (readyError) throw readyError; },
    user: () => user,
    subscribe(cb) {
        subscribers.add(cb);
        return () => subscribers.delete(cb);
    },
};
