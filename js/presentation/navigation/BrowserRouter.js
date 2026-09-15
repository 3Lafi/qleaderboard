import { matchRoute, normalizePath, safeInternalPath, redirectFor, isAppLink } from '../../application/navigation/routes.js';
import { toast } from '../views/ui.js';
import { createPageScope } from '../../application/navigation/PageScope.js';

const SCROLL_KEY = 'wisamScrollY';
export function createRouter({ authState, layout, services, basePath = '', loadPage = name => import(`../pages/${name}.js`), window: win = window, document: doc = document }) {
    const { history, location } = win;
    let scope, started = false, currentUrl = '', unsubscribeAuth;
    let lastUid;
    const routeUrl = () => {
        const url = new URL(location.href);
        if (basePath && url.pathname.startsWith(basePath + '/')) url.pathname = url.pathname.slice(basePath.length);
        return url;
    };
    const path = () => { const url = routeUrl(); return url.pathname + url.search + url.hash; };
    const browserPath = route => basePath + route;
    const scrollPositions = new Map();
    let entryId;
    let nextEntry = 0;
    function markEntry() {
        entryId = history.state?.wisamEntry || `${Date.now()}-${++nextEntry}`;
        history.replaceState({ ...history.state, wisamEntry: entryId }, '');
    }
    function saveScroll() {
        if (!entryId) return;
        scrollPositions.set(entryId, win.scrollY);
    }
    function navigate(target, { replace = false, refresh = false } = {}) {
        const safe = safeInternalPath(target);
        if (!safe) return Promise.resolve();
        layout.closeSidebar();
        if (safe === path() && !refresh) return Promise.resolve();
        saveScroll();
        if (safe !== path()) history[replace ? 'replaceState' : 'pushState']({ [SCROLL_KEY]: 0 }, '', browserPath(safe));
        markEntry();
        return render({ scroll: 0 });
    }
    // Updating filter/search state should not destroy input focus or create a visit.
    function replaceQuery(search) {
        const url = routeUrl();
        url.search = search;
        history.replaceState(history.state, '', browserPath(url.pathname + url.search + url.hash));
        currentUrl = path();
    }
    function announce(host) {
        const announcer = doc.getElementById('routeAnnouncer');
        if (announcer) announcer.textContent = doc.title;
        if (!host.contains(doc.activeElement)) host.focus({ preventScroll: true });
    }
    function finishScroll(host, scroll) {
        const hash = location.hash.slice(1);
        let anchor;
        try { anchor = hash && doc.getElementById(decodeURIComponent(hash)); } catch { /* Invalid fragment. */ }
        if (anchor && host.contains(anchor)) anchor.scrollIntoView();
        else win.scrollTo(0, scroll);
    }
    async function render({ scroll = 0 } = {}) {
        scope?.dispose();
        const visit = scope = createPageScope();
        const shellHost = layout.initShell(doc.getElementById('app'), navigate);
        // A detached visit cannot overwrite the page mounted by a later navigation.
        const host = doc.createElement('div');
        host.className = 'route-view';
        host.tabIndex = -1;
        host.setAttribute('aria-busy', 'true');
        host.innerHTML = '<div class="page-loading" role="status"><span class="loading-spinner" aria-hidden="true"></span><p>جارِ تحميل الصفحة…</p></div>';
        shellHost.replaceChildren(host);
        doc.title = 'وسام';
        currentUrl = path();
        const url = routeUrl();
        const { route, params } = matchRoute(url.pathname);
        layout.beginNavigation();
        try {
            await authState.ready();
            if (visit.signal.aborted) return;
            const user = authState.user();
            lastUid = user?.uid || null;
            const redirect = redirectFor(route, url, user);
            if (redirect) return navigate(redirect, { replace: true });
            layout.updateNavigation(route.activeKey, { user, activeBoard: params.boardId ? { id: params.boardId } : null, activeStudentId: params.studentId || null });
            const module = await loadPage(route.page);
            if (visit.signal.aborted) return;
            const context = {
                toast: visit.guard(toast),
                params, user, url, ownerView: Boolean(route.ownerView), signal: visit.signal,
                navigate: visit.guard(navigate), refresh: visit.guard(() => render({ scroll: win.scrollY })),
                replaceQuery: visit.guard(replaceQuery), onDispose: visit.onDispose,
                setTitle: visit.guard(title => { doc.title = title; layout.announcePage(); }),
                layout: visit.scoped(layout),
                services: Object.fromEntries(Object.entries(services).map(([key, service]) => [key, visit.scoped(service, { continueWork: true })]))
            };
            const cleanup = await module.default(host, context);
            visit.onDispose(cleanup);
            if (visit.signal.aborted) return;
            host.setAttribute('aria-busy', 'false');
            finishScroll(host, scroll);
            announce(host);
            win.dispatchEvent?.(new Event('wisam:page-ready'));
        } catch (error) {
            if (visit.signal.aborted) return;
            doc.title = 'تعذر تحميل الصفحة — وسام';
            host.setAttribute('aria-busy', 'false');
            layout.renderError(host, error, () => render({ scroll }));
            announce(host);
        } finally {
            if (!visit.signal.aborted) layout.endNavigation();
        }
    }
    function onClick(event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target?.closest?.('a[href]');
        if (!link) return;
        const url = new URL(link.href, location.href);
        if (!isAppLink(url, new URL(location.href), link)) return;
        event.preventDefault();
        // Same-page retry links explicitly request a fresh visit.
        navigate(url.pathname + url.search + url.hash, { refresh: link.hasAttribute('data-refresh') });
    }
    function convertLegacyHash() {
        if (!location.hash.startsWith('#/')) return false;
        const safe = safeInternalPath(location.hash.slice(1));
        if (!safe) return false;
        history.replaceState(history.state, '', browserPath(safe));
        return true;
    }
    function onPopstate() {
        saveScroll();
        layout.closeSidebar();
        convertLegacyHash();
        markEntry();
        if (path().split('#')[0] === currentUrl.split('#')[0]) { currentUrl = path(); return; }
        render({ scroll: scrollPositions.get(entryId) ?? history.state?.[SCROLL_KEY] ?? 0 });
    }
    function onHashchange() {
        if (convertLegacyHash()) render();
    }
    return {
        navigate,
        async start() {
            if (started) return;
            started = true;
            convertLegacyHash();
            const canonical = normalizePath(routeUrl().pathname) + location.search + location.hash;
            if (canonical !== path()) history.replaceState(history.state, '', browserPath(canonical));
            markEntry();
            history.scrollRestoration = 'manual';
            doc.addEventListener('click', onClick);
            win.addEventListener('popstate', onPopstate);
            win.addEventListener('hashchange', onHashchange);
            win.addEventListener('scroll', saveScroll, { passive: true });
            unsubscribeAuth = authState.subscribe(user => {
                const uid = user?.uid || null;
                if (lastUid !== undefined && uid !== lastUid) render({ scroll: 0 });
                lastUid = uid;
            });
            return render();
        },
        stop() {
            scope?.dispose();
            unsubscribeAuth?.();
            doc.removeEventListener('click', onClick);
            win.removeEventListener('popstate', onPopstate);
            win.removeEventListener('hashchange', onHashchange);
            win.removeEventListener('scroll', saveScroll);
            layout.endNavigation();
            started = false;
        }
    };
}
