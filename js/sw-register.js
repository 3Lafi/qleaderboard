// المعاينة المحلية تقرأ الملفات مباشرة لتفادي خلط إصدارات المكونات أثناء التطوير.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            let removed = false;
            for (const registration of registrations) {
                if (registration.active?.scriptURL === `${location.origin}/sw.js`) {
                    removed = await registration.unregister() || removed;
                }
            }
            if (removed && navigator.serviceWorker.controller) location.reload();
            return;
        }
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW failed: ', err));
    });
}
