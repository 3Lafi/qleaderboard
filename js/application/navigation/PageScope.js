// Each visit owns its callbacks/subscriptions. Late results cannot affect another visit.
export function createPageScope() {
    const controller = new AbortController();
    const cleanups = new Set();
    const { signal } = controller;
    function onDispose(cleanup) {
        if (typeof cleanup !== 'function') return () => {};
        let pending = true;
        const once = () => {
            if (!pending) return;
            pending = false;
            cleanups.delete(once);
            cleanup();
        };
        if (signal.aborted) once();
        else cleanups.add(once);
        return once;
    }
    const guard = callback => (...args) => signal.aborted ? undefined : callback(...args);
    const scoped = (target, { continueWork = false } = {}) => new Proxy(target, {
        get(object, key) {
            const value = object[key];
            if (typeof value !== 'function') return value;
            return (...args) => {
                // User-initiated saves may be queued behind another save. Let them finish;
                // only subscriptions and presentation callbacks belong to the visit.
                if (signal.aborted && (!continueWork || key === 'watch')) return undefined;
                const result = value.apply(object, args.map(arg => typeof arg === 'function' ? guard(arg) : arg));
                // Repositories' watch methods return an unsubscribe function.
                return typeof result === 'function' ? onDispose(result) : result;
            };
        }
    });
    return {
        signal, guard, scoped, onDispose,
        dispose() {
            controller.abort();
            for (const cleanup of [...cleanups]) {
                try { cleanup(); } catch (error) { console.error('Page cleanup failed:', error); }
            }
        }
    };
}
