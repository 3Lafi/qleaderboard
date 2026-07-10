// حالة تسجيل الدخول: مصدر واحد تشترك فيه كل الصفحات
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';

let user = null;
let resolved = false;
const subscribers = new Set();

let resolveReady;
const readyPromise = new Promise(resolve => { resolveReady = resolve; });

onAuthStateChanged(auth, u => {
    user = u;
    if (!resolved) {
        resolved = true;
        resolveReady();
    }
    subscribers.forEach(cb => cb(user));
});

export const authState = {
    // ينتظر أول تحقق من الجلسة قبل توجيه المسارات المحمية
    ready: () => readyPromise,
    user: () => user,
    subscribe(cb) {
        subscribers.add(cb);
        return () => subscribers.delete(cb);
    },
};
