import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankStudents } from '../js/domain/usecases/RankStudents.js';

function student(overrides) {
    return { name: '', progress: 0, isCompleted: false, completedDate: null, ...overrides };
}

test('sorts by progress descending', () => {
    const a = student({ name: 'أحمد', progress: 40 });
    const b = student({ name: 'باسم', progress: 90 });
    const c = student({ name: 'جاسم', progress: 10 });
    assert.deepEqual(rankStudents([a, b, c]).map(s => s.name), ['باسم', 'أحمد', 'جاسم']);
});

test('ties in progress are broken by earliest completion date', () => {
    const later = student({ name: 'متأخر', progress: 100, isCompleted: true, completedDate: '2024-02-01' });
    const earlier = student({ name: 'مبكر', progress: 100, isCompleted: true, completedDate: '2024-01-01' });
    assert.deepEqual(rankStudents([later, earlier]).map(s => s.name), ['مبكر', 'متأخر']);
});

test('a completion date outranks no completion date at equal progress', () => {
    const withDate = student({ name: 'له تاريخ', progress: 100, isCompleted: true, completedDate: '2024-01-01' });
    const withoutDate = student({ name: 'بلا تاريخ', progress: 100, isCompleted: true, completedDate: null });
    assert.deepEqual(rankStudents([withoutDate, withDate]).map(s => s.name), ['له تاريخ', 'بلا تاريخ']);
});

test('final tiebreaker is alphabetical name in Arabic locale', () => {
    const b = student({ name: 'باسم', progress: 50 });
    const a = student({ name: 'أحمد', progress: 50 });
    assert.deepEqual(rankStudents([b, a]).map(s => s.name), ['أحمد', 'باسم']);
});

test('does not mutate the input array', () => {
    const list = [student({ name: 'أ', progress: 1 }), student({ name: 'ب', progress: 99 })];
    const original = [...list];
    rankStudents(list);
    assert.deepEqual(list, original);
});
