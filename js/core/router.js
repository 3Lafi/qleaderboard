// موجّه المسارات المعتمد على المسار الحقيقي (History API) — يتطلب إعادة كتابة ** إلى /index.html في الاستضافة
import { authState } from './authState.js';

const ID = '([A-Za-z0-9_-]+)';

const routes = [
    { pattern: new RegExp('^/?$'), page: 'LandingPage' },
    { pattern: new RegExp(`^/b/${ID}$`), page: 'BoardPage', params: ['boardId'] },
    { pattern: new RegExp('^/login$'), page: 'LoginPage', guestOnly: true },
    { pattern: new RegExp('^/dashboard$'), page: 'MyBoardsPage', auth: true },
    { pattern: new RegExp('^/new$'), page: 'BoardSettingsPage', auth: true },
    { pattern: new RegExp(`^/edit/${ID}$`), page: 'BoardSettingsPage', auth: true, params: ['boardId'] },
    { pattern: new RegExp(`^/edit/${ID}/students$`), page: 'StudentsPage', auth: true, params: ['boardId'] },
];

let currentCleanup = null;
let navToken = 0;

export function currentPath() {
    return location.pathname || '/';
}

export function navigate(path) {
    if (location.pathname + location.search === path) {
        handleRoute();
    } else {
        history.pushState(null, '', path);
        handleRoute();
    }
}

function match(path) {
    for (const route of routes) {
        const m = route.pattern.exec(path);
        if (m) {
            const params = {};
            (route.params || []).forEach((name, i) => { params[name] = m[i + 1]; });
            return { route, params };
        }
    }
    return null;
}

async function handleRoute() {
    const token = ++navToken;
    const container = document.getElementById('app');
    const path = currentPath();

    if (typeof currentCleanup === 'function') {
        try { currentCleanup(); } catch (e) { console.error(e); }
        currentCleanup = null;
    }

    const matched = match(path);
    if (!matched) {
        const { renderNotFound } = await import('../presentation/pages/NotFoundPage.js');
        if (token !== navToken) return;
        renderNotFound(container);
        return;
    }

    const { route, params } = matched;

    await authState.ready();
    if (token !== navToken) return;

    const user = authState.user();
    if (route.auth && !user) {
        navigate('/login?next=' + encodeURIComponent(path));
        return;
    }
    if (route.guestOnly && user) {
        navigate(queryParam('next') || '/dashboard');
        return;
    }

    try {
        const mod = await import(`../presentation/pages/${route.page}.js`);
        if (token !== navToken) return;
        window.scrollTo(0, 0);
        const cleanup = await mod.default(container, { params, user, navigate });
        if (token !== navToken) {
            if (typeof cleanup === 'function') cleanup();
            return;
        }
        currentCleanup = typeof cleanup === 'function' ? cleanup : null;
    } catch (err) {
        console.error('Route render error:', err);
        if (token !== navToken) return;
        container.innerHTML = `
            <div id="error-msg" style="display:block;">
                <p>حدث خطأ غير متوقع أثناء تحميل الصفحة.</p>
                <button class="retry-btn" onclick="location.reload()">تحديث الصفحة</button>
            </div>`;
    }
}

// استخراج قيمة من الجزء الاستعلامي في المسار مثل /login?next=/dashboard
export function queryParam(name) {
    return new URLSearchParams(location.search).get(name);
}

// يعترض نقرات الروابط الداخلية ليتنقّل عبر History API بدل إعادة تحميل الصفحة بالكامل
function interceptLinks() {
    document.addEventListener('click', e => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const link = e.target.closest('a');
        if (!link || link.target === '_blank' || link.hasAttribute('download') || !link.href) return;
        let url;
        try { url = new URL(link.href); } catch { return; }
        if (url.origin !== location.origin) return;
        e.preventDefault();
        navigate(url.pathname + url.search);
    });
}

// شريحة توافق: روابط قديمة بصيغة #/... (من نسخة الهاش الموزّعة سابقاً) تتحوّل إلى مسار حقيقي فوراً
// يُستدعى عند الإقلاع (تحميل كامل) وعند hashchange (رابط قديم يُلصق في تبويب مفتوح بالفعل)
function convertLegacyHash() {
    if (!location.hash.startsWith('#/')) return false;
    history.replaceState(null, '', location.hash.slice(1) || '/');
    return true;
}

export function startRouter() {
    convertLegacyHash();

    window.addEventListener('popstate', handleRoute);
    window.addEventListener('hashchange', () => {
        if (convertLegacyHash()) handleRoute();
    });
    interceptLinks();
    handleRoute();
}
