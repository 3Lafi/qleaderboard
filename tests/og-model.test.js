import test from 'node:test';
import assert from 'node:assert/strict';
import { firstBanner, withMetadata } from '../functions/og/model.js';

test('first banner is detached from later settings and excludes student data', () => {
    const settings = { name: 'أول بنر', banner: { themeId: 'emerald' }, students: ['private'] };
    const initial = firstBanner(settings);
    settings.name = 'تعديل'; settings.banner.themeId = 'burgundy';
    assert.equal(initial.name, 'أول بنر');
    assert.equal(initial.themeId, 'emerald');
    assert.equal('students' in initial, false);
});

test('crawler response escapes untrusted banner text and replaces generic metadata', () => {
    const html = withMetadata('<head><title>App</title><meta property="og:title" content="Old"></head>', firstBanner({ name: '<script>"bad"</script>' }), 'board_1');
    assert.equal(html.includes('<script>'), false);
    assert.equal(html.includes('content="Old"'), false);
    assert.equal((html.match(/property="og:title"/g) || []).length, 1);
    assert.ok(html.includes('https://wisam.web.app/og/board_1.jpg'));
});
