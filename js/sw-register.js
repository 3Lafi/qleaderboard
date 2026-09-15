// المعاينة المحلية تقرأ الملفات مباشرة لتفادي خلط إصدارات المكونات أثناء التطوير.
if ('serviceWorker' in navigator) {
    let updatePending = false;
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'WISAM_UPDATE_READY') updatePending = true;
    });
    // Apply an update at the next completed navigation, never in the middle of
    // an unsaved form. This replaces old module instances as well as SW caches.
    window.addEventListener('wisam:page-ready', () => {
        if (updatePending) { updatePending = false; location.reload(); }
    });
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
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') void registration.update().catch(() => {});
            });
        } catch (err) { console.log('SW failed: ', err); }
    });
}
