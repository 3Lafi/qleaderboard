// الدفعة: قائمة أسماء مستقلة عن البرامج
import test from 'node:test';
import assert from 'node:assert/strict';
import { Cohort, cohortSummaryText } from '../js/domain/models/Cohort.js';
import { LIMITS } from '../js/shared/config.js';

test('a cohort exposes its students sorted by name', () => {
    const cohort = new Cohort('c1', { name: 'دفعة 1447', students: { b: { name: 'بدر' }, a: { name: 'أحمد' } } });
    assert.equal(cohort.studentsCount(), 2);
    assert.deepEqual(cohort.listStudents().map(s => s.name), ['أحمد', 'بدر']);
});

test('a cohort knows when it is full and when it has a name', () => {
    const many = {};
    for (let i = 0; i < LIMITS.MAX_STUDENTS_PER_BOARD; i++) many[`s${i}`] = { name: `طالب ${i}` };
    const cohort = new Cohort('c1', { students: many });
    assert.equal(cohort.isFull(), true);
    assert.equal(cohort.hasStudentNamed('طالب 3'), true);
    assert.equal(cohort.hasStudentNamed('غير موجود'), false);
});

test('summary shows the student count', () => {
    const cohort = new Cohort('c1', { students: { a: { name: 'أ' } } });
    const text = cohortSummaryText(cohort);
    assert.match(text, /1 طالب/);
});
