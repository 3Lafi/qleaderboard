import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, sanitizeSettings } from '../js/domain/models/BoardSettings.js';

test('defaultSettings scope covers the whole quran', () => {
    const s = defaultSettings();
    assert.equal(s.scope.type, 'quran');
    assert.equal(s.scope.surahNumbers.length, 114);
});

test('sanitizeSettings rejects an empty name', () => {
    assert.throws(() => sanitizeSettings({ name: '', scope: { surahNumbers: [1] } }));
});

test('sanitizeSettings rejects a whitespace-only name', () => {
    assert.throws(() => sanitizeSettings({ name: '   ', scope: { surahNumbers: [1] } }));
});

test('sanitizeSettings rejects an empty scope', () => {
    assert.throws(() => sanitizeSettings({ name: 'لوحة', scope: { surahNumbers: [] } }));
});

test('sanitizeSettings trims and clamps string fields to their length limits', () => {
    const s = sanitizeSettings({
        name: `  ${'ط'.repeat(200)}  `,
        schoolName: 'م'.repeat(200),
        classLabel: 'ف'.repeat(200),
        scope: { surahNumbers: [1] },
    });
    assert.equal(s.name.length, 100);
    assert.equal(s.schoolName.length, 150);
    assert.equal(s.classLabel.length, 100);
});

test('sanitizeSettings defaults direction to reverse unless explicitly forward', () => {
    assert.equal(sanitizeSettings({ name: 'ل', scope: { surahNumbers: [1] } }).direction, 'reverse');
    assert.equal(sanitizeSettings({ name: 'ل', scope: { surahNumbers: [1] }, direction: 'forward' }).direction, 'forward');
    assert.equal(sanitizeSettings({ name: 'ل', scope: { surahNumbers: [1] }, direction: 'garbage' }).direction, 'reverse');
});

test('sanitizeSettings coerces isPublic/showClassProgress to booleans', () => {
    const s = sanitizeSettings({ name: 'ل', scope: { surahNumbers: [1] }, isPublic: 'yes', showClassProgress: 0 });
    assert.equal(s.isPublic, true);
    assert.equal(s.showClassProgress, false);
});

test('sanitizeSettings keeps a known banner theme and falls back to emerald otherwise', () => {
    const base = { name: 'ل', scope: { surahNumbers: [1] } };
    assert.equal(sanitizeSettings({ ...base, banner: { themeId: 'midnight' } }).banner.themeId, 'midnight');
    assert.equal(sanitizeSettings({ ...base, banner: { themeId: 'not-a-theme' } }).banner.themeId, 'emerald');
    assert.equal(sanitizeSettings(base).banner.themeId, 'emerald');
});

test('defaultSettings includes the default banner theme', () => {
    assert.equal(defaultSettings().banner.themeId, 'emerald');
});
