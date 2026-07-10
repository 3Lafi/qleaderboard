// نقطة انطلاق التطبيق
import { startRouter } from './core/router.js';
import { isConfigured } from './core/firebase.js';

if (!isConfigured) {
    const notice = document.createElement('div');
    notice.className = 'config-notice';
    notice.innerHTML = `
        ⚠️ لم يتم إعداد Firebase بعد — أنشئ مشروعاً في
        <a href="https://console.firebase.google.com" target="_blank" rel="noopener">console.firebase.google.com</a>
        وانسخ إعدادات التطبيق إلى الملف js/core/firebase.js
    `;
    document.body.prepend(notice);
}

startRouter();
