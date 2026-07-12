import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandScope, SURAHS, surahsInJuz } from '../js/core/quran-data.js';

test('quran scope returns all 114 surahs in mushaf order', () => {
    const nums = expandScope({ type: 'quran' });
    assert.equal(nums.length, 114);
    assert.deepEqual(nums, SURAHS.map(s => s.n));
});

test('missing/null scope defaults to the whole quran', () => {
    assert.deepEqual(expandScope(null), SURAHS.map(s => s.n));
});

test('juz scope returns only surahs starting in the selected juz', () => {
    assert.deepEqual(expandScope({ type: 'juz', juzNumbers: [30] }), surahsInJuz(30));
});

test('juz scope with multiple juz unions and sorts by mushaf order', () => {
    const nums = expandScope({ type: 'juz', juzNumbers: [30, 1] });
    const expected = [...surahsInJuz(1), ...surahsInJuz(30)].sort((a, b) => a - b);
    assert.deepEqual(nums, expected);
});

test('custom scope deduplicates and sorts', () => {
    assert.deepEqual(expandScope({ type: 'custom', surahNumbers: [50, 1, 50, 30] }), [1, 30, 50]);
});

test('custom scope drops surah numbers that do not exist', () => {
    assert.deepEqual(expandScope({ type: 'custom', surahNumbers: [1, 9999, -5] }), [1]);
});

test('curriculum scope with no curriculum params resolves to empty', () => {
    assert.deepEqual(expandScope({ type: 'curriculum', curriculum: null }), []);
});
