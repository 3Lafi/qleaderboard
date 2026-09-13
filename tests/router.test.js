import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute, safeInternalPath, loginDestination, redirectFor, isAppLink } from '../js/application/navigation/routes.js';
import { createPageScope } from '../js/application/navigation/PageScope.js';
import { createRouter } from '../js/presentation/navigation/BrowserRouter.js';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));

function harness({ url = '/', user = null, ready = Promise.resolve(), loadPage } = {}) {
    const win = new EventTarget(), doc = new EventTarget();
    let entries = [{ url: new URL(url, 'https://wisam.test'), state: null }], index = 0;
    win.location = entries[0].url;
    const location = win.location;
    const setUrl = value => { location.href = new URL(value, location).href; };
    const history = win.history = {
        get state() { return entries[index].state; },
        get length() { return entries.length; },
        replaceState(state, _, path) { if (path) setUrl(path); entries[index] = { url: new URL(location), state }; },
        pushState(state, _, path) { setUrl(path); entries.splice(++index); entries.push({ url: new URL(location), state }); },
        go(delta) { if (!entries[index + delta]) return; index += delta; setUrl(entries[index].url); win.dispatchEvent(new Event('popstate')); }
    };
    win.scrollY = 0;
    win.scrollTo = (_x, y) => { win.scrollY = y; };
    class Element {
        children = []; attributes = {};
        replaceChildren(...children) { this.children = children; }
        setAttribute(key, value) { this.attributes[key] = value; }
        contains(element) { return element === this || this.children.includes(element); }
        focus() { doc.activeElement = this; }
    }
    const root = new Element(), host = new Element(), announcer = new Element();
    doc.getElementById = id => ({ app: root, routeAnnouncer: announcer })[id];
    doc.createElement = () => new Element();
    doc.title = '';
    const authListeners = new Set();
    const authState = { ready: () => ready, user: () => user, subscribe(cb) { authListeners.add(cb); return () => authListeners.delete(cb); } };
    const layout = { initShell: () => host, closeSidebar() {}, beginNavigation() {}, endNavigation() {}, announcePage() {}, updateNavigation(key) { this.activeKey = key; }, setActiveBoard(board) { this.board = board; }, renderError(host) { host.innerHTML = 'error'; } };
    const defaultPage = name => ({ default(node, ctx) { node.innerHTML = name; ctx.setTitle(name); } });
    const router = createRouter({ window: win, document: doc, authState, services: {}, layout, loadPage: loadPage || (async name => defaultPage(name)) });
    return { win, doc, host, layout, router, history, setUser(value) { user = value; authListeners.forEach(cb => cb(value)); }, content: () => host.children[0]?.innerHTML };
}

test('matches all nested routes and normalizes trailing slashes', () => {
    assert.equal(matchRoute('/badges/').route.page, 'BadgesPage');
    assert.deepEqual(matchRoute('/edit/board_1/students/student-2').params, { boardId: 'board_1', studentId: 'student-2' });
    assert.equal(matchRoute('/edit/board_1/students/student-2').route.ownerView, true);
    assert.equal(matchRoute('/b/board_1/students/student-2').route.auth, undefined);
    assert.equal(matchRoute('/edit/a/students/b/extra').route.page, 'NotFoundPage');
});
test('login rejects external targets and redirect loops while retaining query and fragment', () => {
    for (const value of ['//evil.test', '/\\evil.test', 'https://evil.test', '/\nevil.test']) assert.equal(safeInternalPath(value), '');
    for (const value of ['/login', '/login/?next=/login', '/not-a-route', '/new/../login']) assert.equal(loginDestination(value), '/dashboard');
    assert.equal(loginDestination('/new?cohort=x#plan'), '/new?cohort=x#plan');
    const url = new URL('https://wisam.test/edit/a/students?sort=name#alpha');
    assert.equal(redirectFor(matchRoute(url.pathname).route, url, null), '/login?next=%2Fedit%2Fa%2Fstudents%3Fsort%3Dname%23alpha');
});
test('native downloads, fragments, static documents and named windows are not intercepted', () => {
    const current = new URL('https://wisam.test/badges?level=juz');
    const link = { target: '', hasAttribute: () => false };
    for (const url of ['/docs/badge-comparison.html','/images/icon.png','/badges?level=juz#section','https://example.com/']) assert.equal(isAppLink(new URL(url, current), current, link), false);
    assert.equal(isAppLink(new URL('/dashboard', current), current, { ...link, target: 'report' }), false);
    assert.equal(isAppLink(new URL('/dashboard', current), current, { ...link, hasAttribute: name => name === 'download' }), false);
    assert.equal(isAppLink(new URL('/unknown-route', current), current, link), true);
    assert.equal(isAppLink(new URL('/badges?level=quran#section', current), current, link), true);
});
test('page disposal cancels subscriptions and guards callbacks exactly once', () => {
    const scope = createPageScope(); let stopped = 0, calls = 0, callback;
    const repository = scope.scoped({ watch(_id, fn) { callback = fn; return () => stopped++; } });
    const unsubscribe = repository.watch('a', () => calls++);
    callback(); scope.dispose(); callback(); unsubscribe(); scope.dispose();
    assert.equal(stopped, 1); assert.equal(calls, 1);
    scope.onDispose(() => stopped++); assert.equal(stopped, 2);
});
test('slow page cannot overwrite newer content, title, layout or trigger navigation', async () => {
    const slow = deferred(); let lateCleanup = 0;
    const h = harness({ user: { uid: 'owner' }, loadPage: async name => ({ default: async (node, ctx) => {
        if (name === 'MyBoardsPage') await slow.promise;
        node.innerHTML = name; ctx.setTitle(name); ctx.layout.setActiveBoard({ id: name });
        if (name === 'MyBoardsPage') { ctx.navigate('/login'); return () => lateCleanup++; }
    } }) });
    await h.router.start();
    const pending = h.router.navigate('/dashboard'); await tick();
    await h.router.navigate('/badges'); slow.resolve(); await pending;
    assert.equal(h.content(), 'BadgesPage'); assert.equal(h.doc.title, 'BadgesPage');
    assert.equal(h.layout.board.id, 'BadgesPage'); assert.equal(h.win.location.pathname, '/badges'); assert.equal(lateCleanup, 1);
    h.router.stop();
});
test('auth redirects preserve destination and sign-out removes protected content', async () => {
    const h = harness({ url: '/edit/alpha/students?sort=name#top' }); await h.router.start();
    assert.equal(h.win.location.pathname, '/login');
    assert.equal(h.win.location.searchParams.get('next'), '/edit/alpha/students?sort=name#top');
    h.setUser({ uid: 'owner' }); await tick();
    assert.equal(h.win.location.pathname, '/edit/alpha/students'); assert.equal(h.content(), 'StudentsPage');
    h.setUser(null); await tick(); assert.equal(h.content(), 'LoginPage'); assert.equal(h.history.length, 1);
    h.router.stop();
});
test('Back and Forward restore scroll; identical links preserve the mounted page', async () => {
    const h = harness(); await h.router.start();
    h.win.scrollY = 400; h.win.dispatchEvent(new Event('scroll'));
    await h.router.navigate('/badges');
    h.win.scrollY = 700; h.win.dispatchEvent(new Event('scroll'));
    const mounted = h.host.children[0]; await h.router.navigate('/badges');
    assert.equal(h.host.children[0], mounted); assert.equal(h.history.length, 2);
    h.history.go(-1); await tick(); assert.equal(h.win.scrollY, 400); assert.equal(h.content(), 'LandingPage');
    h.history.go(1); await tick(); assert.equal(h.win.scrollY, 700); assert.equal(h.content(), 'BadgesPage');
    h.router.stop();
});
test('not-found renders within the same shell and failed imports can recover', async () => {
    let fail = true;
    const h = harness({ loadPage: async name => { if (fail) throw new Error('Offline'); return { default(node) { node.innerHTML = name; } }; } });
    await h.router.start(); assert.equal(h.content(), 'error'); fail = false;
    await h.router.navigate('/missing'); assert.equal(h.content(), 'NotFoundPage'); assert.equal(h.layout.activeKey, 'not-found'); h.router.stop();
});
test('legacy hash and trailing slash redirects replace the initial history entry', async () => {
    const h = harness({ url: '/#/badges?level=quran' }); await h.router.start();
    assert.equal(h.win.location.pathname, '/badges'); assert.equal(h.win.location.search, '?level=quran'); assert.equal(h.history.length, 1); h.router.stop();
    const slash = harness({ url: '/badges/' }); await slash.router.start(); assert.equal(slash.win.location.pathname, '/badges'); slash.router.stop();
});
test('starting twice does not register duplicate navigation handlers', async () => {
    const h = harness(); await h.router.start(); const node = h.host.children[0]; await h.router.start(); assert.equal(node, h.host.children[0]); h.router.stop();
});

test('queued persistence can finish after leaving while late subscriptions are suppressed', async () => {
    const scope = createPageScope();
    let saves = 0, watches = 0;
    const service = scope.scoped({ save: async () => { saves++; }, watch: () => { watches++; return () => {}; } }, { continueWork: true });
    scope.dispose();
    await service.save(); service.watch();
    assert.equal(saves, 1); assert.equal(watches, 0);
});
