// موجّه المسارات المعتمد على الهاش (#/...) — يعمل على GitHub Pages دون إعادة كتابة روابط
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
    { pattern: new RegExp('^/import$'), page: 'ImportPage', auth: true },
];

let currentCleanup = null;
let navToken = 0;

export function currentPath() {
    const hash = location.hash || '#/';
    return hash.startsWith('#') ? hash.slice(1) : hash;
}

export function navigate(path) {
    if (currentPath() === path) {
        handleRoute();
    } else {
        location.hash = '#' + path;
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

    const matched = match(path.split('?')[0]);
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
        navigate(hashQueryParam('next') || '/dashboard');
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

// استخراج قيمة من الجزء الاستعلامي داخل الهاش مثل #/login?next=/dashboard
export function hashQueryParam(name) {
    const path = currentPath();
    const qIndex = path.indexOf('?');
    if (qIndex === -1) return null;
    return new URLSearchParams(path.slice(qIndex + 1)).get(name);
}

export function startRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}
