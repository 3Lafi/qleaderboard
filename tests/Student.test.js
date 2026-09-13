import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Student } from '../js/domain/models/Student.js';
import { surahAyahs } from '../js/shared/quran-data.js';

test('progress is weighted by ayah count, not surah count', () => {
    // نطاق: الفاتحة (7 آيات) + الناس (6 آيات)؛ حفظ الفاتحة فقط لا يساوي 50%
    const scope = [1, 114];
    const s = new Student('s1', { name: 'ط', memorized: [1] }, scope);
    const expected = (surahAyahs(1) / (surahAyahs(1) + surahAyahs(114))) * 100;
    assert.equal(s.progress, expected);
});

test('progress is 0 for an empty scope', () => {
    assert.equal(new Student('s1', { name: 'ط', memorized: [] }, []).progress, 0);
});

test('progress is 100 when everything in scope is memorized', () => {
    const scope = [1, 113, 114];
    assert.equal(new Student('s1', { name: 'ط', memorized: scope }, scope).progress, 100);
});

test('memorizedInScope ignores surahs memorized outside the current scope', () => {
    const s = new Student('s1', { name: 'ط', memorized: [1, 50, 114] }, [1, 114]);
    assert.deepEqual([...s.memorizedInScope].sort((a, b) => a - b), [1, 114]);
});

test('isCompleted is false for an empty scope', () => {
    assert.equal(new Student('s1', { name: 'ط', memorized: [] }, []).isCompleted, false);
});

test('isCompleted requires every surah in scope, not just some', () => {
    const scope = [1, 2, 3];
    assert.equal(new Student('s1', { name: 'ط', memorized: [1, 2] }, scope).isCompleted, false);
    assert.equal(new Student('s1', { name: 'ط', memorized: [1, 2, 3] }, scope).isCompleted, true);
});

test('a rounded 100 percent does not earn program completion', () => {
    const scope = Array.from({ length: 114 }, (_, i) => i + 1);
    const student = new Student('almost', { name: 'طالب', memorized: scope.filter(n => n !== 108) }, scope);
    assert.equal(student.progressPercentage, 100);
    assert.equal(student.isCompleted, false);
    student.memorized.push(108);
    assert.equal(student.isCompleted, true);
});
