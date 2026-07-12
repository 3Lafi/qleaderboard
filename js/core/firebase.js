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
    apiKey: 'AIzaSyCGW9PNgB-tiRzFbcrvK2aXa1Gs-RZ3GHg',
    authDomain: 'wisam-3lafi.firebaseapp.com',
    projectId: 'wisam-3lafi',
    storageBucket: 'wisam-3lafi.firebasestorage.app',
    messagingSenderId: '586769682323',
    appId: '1:586769682323:web:ee86c70831a778f33c2266',
};

export const isConfigured = !firebaseConfig.apiKey.startsWith('PASTE_');

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// التخزين المحلي يتيح تصفح اللوحات دون اتصال ومزامنة تعديلات المعلم عند عودة الشبكة
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
