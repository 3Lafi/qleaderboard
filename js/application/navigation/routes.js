// URL policy is independent of the DOM, Firebase, and page rendering.
const ID = '([A-Za-z0-9_-]+)';
const definition = (path, page, activeKey, options = {}) => ({ pattern: new RegExp(`^${path}$`), page, activeKey, ...options });
export const routes = [
    definition('/', 'LandingPage', 'home'),
    definition(`/b/${ID}`, 'BoardPage', 'board-public', { params: ['boardId'] }),
    definition(`/b/${ID}/students/${ID}`, 'StudentProfilePage', 'board-public', { params: ['boardId', 'studentId'] }),
    definition('/badges', 'BadgesPage', 'badges'),
    definition('/login', 'LoginPage', 'login', { guestOnly: true }),
    definition('/dashboard', 'MyBoardsPage', 'dashboard', { auth: true }),
    definition('/cohorts', 'CohortsPage', 'cohorts', { auth: true }),
    definition(`/cohorts/${ID}`, 'CohortPage', 'cohort-detail', { auth: true, params: ['cohortId'] }),
    definition('/new', 'BoardSettingsPage', 'new', { auth: true }),
    definition(`/edit/${ID}`, 'BoardSettingsPage', 'board-settings', { auth: true, params: ['boardId'] }),
    definition(`/edit/${ID}/students`, 'StudentsPage', 'board-students', { auth: true, params: ['boardId'] }),
    definition(`/edit/${ID}/students/${ID}`, 'StudentProfilePage', 'board-students', { auth: true, ownerView: true, params: ['boardId', 'studentId'] }),
];

export function normalizePath(path) {
    return path.replace(/\/+$/, '') || '/';
}
export function matchRoute(path) {
    for (const route of routes) {
        const match = route.pattern.exec(normalizePath(path));
        if (match) return { route, params: Object.fromEntries((route.params || []).map((name, i) => [name, match[i + 1]])) };
    }
    return { route: { page: 'NotFoundPage', activeKey: 'not-found' }, params: {} };
}
export function safeInternalPath(value) {
    const path = String(value || '').trim();
    if (!path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(path)) return '';
    const url = new URL(path, 'https://wisam.invalid');
    if (url.origin !== 'https://wisam.invalid') return '';
    return normalizePath(url.pathname) + url.search + url.hash;
}
export function loginDestination(value) {
    const path = safeInternalPath(value);
    if (!path) return '/dashboard';
    const { route } = matchRoute(new URL(path, 'https://wisam.invalid').pathname);
    return route.guestOnly || route.page === 'NotFoundPage' ? '/dashboard' : path;
}
export function redirectFor(route, url, user) {
    if (route.auth && !user) return '/login?next=' + encodeURIComponent(url.pathname + url.search + url.hash);
    if (route.guestOnly && user) return loginDestination(url.searchParams.get('next'));
    return null;
}
export function isAppLink(url, currentUrl, link) {
    if (url.origin !== currentUrl.origin || (link.target && link.target !== '_self') || link.hasAttribute('download') || link.hasAttribute('data-native')) return false;
    if (url.pathname === currentUrl.pathname && url.search === currentUrl.search && url.hash) return false;
    // Static documents, images, downloads and development tools retain browser navigation.
    if (/\.[^/]+$/.test(url.pathname) || /^\/(?:docs|tests|images|css|js|scripts|tools)(?:\/|$)/.test(url.pathname)) return false;
    return true;
}
