import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../workers/board-share/src/index.js';
import { boardShareUrl } from '../js/presentation/views/ui.js';

const env = { FIREBASE_PROJECT_ID: 'test-project', FIREBASE_API_KEY: 'public-key' };
const shareUrl = boardShareUrl('newboard');
const request = (options) => new Request(shareUrl, options);
function document(name, school = 'مدرسة وسام', grade = 'الصف الأول', isPublic = true) {
    return Response.json({ fields: {
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
    assert.match(html, /wisam-universal-v2.jpg/);
    assert.match(html, /href="https:\/\/wisam.web.app\/b\/newboard"/);
    assert.ok(!html.includes('owner-secret'));
    assert.equal(reads, 2);
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
});
