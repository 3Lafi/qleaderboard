import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankStudents, sortTrackingStudents } from '../js/domain/usecases/RankStudents.js';

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

test('tracking table puts visible students before hidden students', () => {
    const list = [
        student({ name: 'أحمد', hidden: true }),
        student({ name: 'خالد', hidden: false }),
        student({ name: 'بدر', hidden: true }),
        student({ name: 'سالم' }),
    ];
    assert.deepEqual(sortTrackingStudents(list).map(s => s.name), ['خالد', 'سالم', 'أحمد', 'بدر']);
});

test('students completing on the same day tie at the same rank (dense ranking)', () => {
    const a = student({ name: 'سعد', progress: 100, isCompleted: true, completedDate: '2026-09-15' });
    const b = student({ name: 'أحمد', progress: 100, isCompleted: true, completedDate: '2026-09-15' });
    const c = student({ name: 'بدر', progress: 100, isCompleted: true, completedDate: '2026-09-16' });

    const ranked = rankStudents([a, b, c]);
    assert.deepEqual(ranked.map(s => ({ name: s.name, rank: s.rank })), [
        { name: 'أحمد', rank: 1 },
        { name: 'سعد', rank: 1 },
        { name: 'بدر', rank: 2 },
    ]);
});

test('students completing seconds apart on the same day share the same rank', () => {
    const s1 = student({ name: 'محمد', progress: 100, isCompleted: true, completedDate: '2026-09-15T10:00:00Z' });
    const s2 = student({ name: 'علي', progress: 100, isCompleted: true, completedDate: '2026-09-15T10:00:30Z' });
    const s3 = student({ name: 'إبراهيم', progress: 100, isCompleted: true, completedDate: '2026-09-15T10:15:00Z' });

    const ranked = rankStudents([s1, s2, s3]);
    assert.deepEqual(ranked.map(s => s.rank), [1, 1, 1]);
});

test('if all students completed on the same day, every student gets rank 1', () => {
    const students = [
        student({ name: 'يوسف', progress: 100, isCompleted: true, completedDate: '2026-09-15' }),
        student({ name: 'حمزة', progress: 100, isCompleted: true, completedDate: '2026-09-15' }),
        student({ name: 'عبدالله', progress: 100, isCompleted: true, completedDate: '2026-09-15' }),
        student({ name: 'عمر', progress: 100, isCompleted: true, completedDate: '2026-09-15' }),
    ];

    const ranked = rankStudents(students);
    assert.deepEqual(ranked.map(s => s.rank), [1, 1, 1, 1]);
    assert.deepEqual(ranked.map(s => s.name), ['عبدالله', 'عمر', 'حمزة', 'يوسف'].sort((x, y) => x.localeCompare(y, 'ar')));
});

test('incomplete students with the same progress share the same rank', () => {
    const a = student({ name: 'أحمد', progress: 60 });
    const b = student({ name: 'باسم', progress: 60 });
    const c = student({ name: 'جاسم', progress: 30 });

    const ranked = rankStudents([a, b, c]);
    assert.deepEqual(ranked.map(s => ({ name: s.name, rank: s.rank })), [
        { name: 'أحمد', rank: 1 },
        { name: 'باسم', rank: 1 },
        { name: 'جاسم', rank: 2 },
    ]);
});

