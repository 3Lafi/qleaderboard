// الملف الوحيد الذي يحتوي إعدادات Firebase.
// خطوات الإعداد: أنشئ مشروعاً في console.firebase.google.com ثم أضف تطبيق ويب
// وانسخ كائن firebaseConfig هنا بدل القيم الافتراضية.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: 'PASTE_API_KEY',
    authDomain: 'PASTE_PROJECT_ID.firebaseapp.com',
    projectId: 'PASTE_PROJECT_ID',
    storageBucket: 'PASTE_PROJECT_ID.firebasestorage.app',
    messagingSenderId: 'PASTE_SENDER_ID',
    appId: 'PASTE_APP_ID',
};

export const isConfigured = !firebaseConfig.apiKey.startsWith('PASTE_');

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// التخزين المحلي يتيح تصفح اللوحات دون اتصال ومزامنة تعديلات المعلم عند عودة الشبكة
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
