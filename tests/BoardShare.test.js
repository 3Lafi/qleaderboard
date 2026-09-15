import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleRequest } from '../workers/board-share/src/index.js';
import { boardShareUrl } from '../js/presentation/views/ui.js';
import legacyTrigger from '../workers/og-preview-trigger/src/index.js';
import { boardImageVersion } from '../js/shared/board-image.js';

const env = { FIREBASE_PROJECT_ID: 'test-project', FIREBASE_API_KEY: 'public-key' };
const shareUrl = boardShareUrl('newboard');
const request = (options) => new Request(shareUrl, options);
function document(name, school = 'مدرسة وسام', grade = 'الصف الأول', isPublic = true) {
    return Response.json({ fields: {
        previewRevision: { stringValue: 'saved-image-revision' },
        ownerUid: { stringValue: 'owner-secret' },
        settings: { mapValue: { fields: {
            name: { stringValue: name }, schoolName: { stringValue: school },
            classLabel: { stringValue: grade }, isPublic: { booleanValue: isPublic },
        } } },
    } });
}

test('new and edited boards use the current fields on the same URL without a build', async () => {
    let name = 'لوحة جديدة';
    let reads = 0;
    const read = async (url, options) => {
        reads++;
        assert.equal(new URL(url).pathname.endsWith('/leaderboards/newboard'), true);
        assert.equal(options.cache, 'no-store');
        return document(name);
    };
    const first = await handleRequest(request(), env, read);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get('cache-control'), 'no-store');
    assert.match(await first.text(), /og:title" content="لوحة جديدة — لوحة حفظ القرآن/);
    name = 'الاسم المعدل';
    const second = await handleRequest(request(), env, read);
    const html = await second.text();
    assert.match(html, /og:title" content="الاسم المعدل — لوحة حفظ القرآن/);
    assert.match(html, /og:description" content="مدرسة وسام — الصف الأول/);
    assert.match(html, /\/b\/newboard\/image.jpg\?v=[a-f0-9]{64}/);
    assert.match(html, /&amp;r=saved-image-revision/);
    assert.match(html, /href="https:\/\/wisam.web.app\/#\/b\/newboard"/);
    assert.ok(!html.includes('owner-secret'));
    assert.equal(reads, 2);
});

test('image versions change with banner text or theme, not student progress or other settings', async () => {
    const settings = { name: 'لوحة', schoolName: 'مدرسة', classLabel: 'الصف الأول', banner: { themeId: 'emerald' } };
    const version = await boardImageVersion(settings);
    assert.equal(await boardImageVersion({ ...settings, isPublic: false, students: { count: 1 } }), version);
    for (const change of [{ name: 'جديدة' }, { schoolName: 'مدرسة أخرى' }, { classLabel: 'الصف الثاني' }, { banner: { themeId: 'sapphire' } }]) {
        assert.notEqual(await boardImageVersion({ ...settings, ...change }), version);
    }
});

test('image endpoint serves the saved JPEG and rejects stale versions', async () => {
    const version = await boardImageVersion({ name: 'لوحة', schoolName: 'مدرسة وسام', classLabel: 'الصف الأول' });
    let calls = 0;
    const read = async url => {
        calls++;
        return url.includes('/boardPreviews/') ? Response.json({ fields: {
            version: { stringValue: version }, jpeg: { stringValue: '/9j/2Q==' },
        } }) : document('لوحة');
    };
    const image = await handleRequest(new Request(`${shareUrl}/image.jpg?v=${version}`), env, read);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual([...new Uint8Array(await image.arrayBuffer())], [255, 216, 255, 217]);
    assert.equal(calls, 2);
    const stale = await handleRequest(new Request(`${shareUrl}/image.jpg?v=old`), env, read);
    assert.equal(stale.status, 404);
    assert.equal(calls, 3);
});

test('private image requests never read image data', async () => {
    let calls = 0;
    const image = await handleRequest(new Request(`${shareUrl}/image.jpg`), env, async () => {
        calls++; return document('Private', '', '', false);
    });
    assert.equal(image.status, 404);
    assert.equal(calls, 1);
});

test('metadata and HTML safely escape board fields', async () => {
    const payload = '"><script>alert(1)</script>&';
    const response = await handleRequest(request(), env, async () => document(payload, payload));
    const html = await response.text();
    assert.ok(!html.includes(payload));
    assert.ok(html.includes('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;'));
});

test('making a board private removes its details from the next response', async () => {
    let isPublic = true;
    const read = async () => document('Public before privacy change', '', '', isPublic);
    assert.equal((await handleRequest(request(), env, read)).status, 200);
    isPublic = false;
    const response = await handleRequest(request(), env, read);
    assert.equal(response.status, 404);
    const html = await response.text();
    assert.ok(!html.includes('Public before privacy change'));
    assert.ok(!html.includes('og:title'));
});

test('missing and permission-denied boards do not disclose metadata', async () => {
    for (const status of [403, 404]) {
        const response = await handleRequest(request(), env, async () => new Response('', { status }));
        assert.equal(response.status, 404);
        assert.equal(response.headers.get('cache-control'), 'no-store');
    }
});

test('upstream failures are retryable and never serve generic successful previews', async () => {
    const response = await handleRequest(request(), env, async () => new Response('', { status: 429 }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('retry-after'), '5');
});

test('invalid routes and write requests never read Firestore', async () => {
    const read = () => { throw new Error('Unexpected Firestore read'); };
    assert.equal((await handleRequest(new Request(`${shareUrl}/students/test`), env, read)).status, 404);
    assert.equal((await handleRequest(request({ method: 'POST' }), env, read)).status, 405);
});

test('HEAD returns the same status and headers without a body', async () => {
    const response = await handleRequest(request({ method: 'HEAD' }), env, async () => document('لوحة'));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
});

test('share links consistently use the Cloudflare domain', () => {
    assert.equal(shareUrl, 'https://wisam-share.wisam-3lafi.workers.dev/b/newboard');
    assert.equal(
        boardShareUrl('newboard', 'fresh preview'),
        'https://wisam-share.wisam-3lafi.workers.dev/b/newboard?r=fresh%20preview'
    );
});

test('old clients clear their preview queue without credentials or deployment dispatch', async () => {
    const response = await legacyTrigger.fetch(new Request('https://legacy.invalid', {
        method: 'POST', headers: { Origin: 'https://wisam.web.app' },
    }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://wisam.web.app');
    assert.deepEqual(await response.json(), { queued: false, mode: 'live' });
});

test('Firebase forwards every board ID to live metadata and browser entry avoids a redirect loop', async () => {
    const { hosting } = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'));
    const redirect = hosting.redirects.find(rule => rule.source === '/b/:boardId');
    assert.equal(redirect.type, 302);
    assert.equal(redirect.destination.replace(':boardId', 'newboard'), shareUrl);
    const response = await handleRequest(request(), env, async () => document('لوحة جديدة'));
    const html = await response.text();
    const appUrl = new URL(html.match(/id="open-board" href="([^"]+)"/)[1]);
    assert.equal(appUrl.origin, 'https://wisam.web.app');
    assert.equal(appUrl.pathname, '/');
    assert.equal(appUrl.hash, '#/b/newboard');
});
