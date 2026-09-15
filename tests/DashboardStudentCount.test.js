import test from 'node:test';
import assert from 'node:assert/strict';
import { boardStudentCount, dashboardStudentCount } from '../js/domain/usecases/DashboardStudentCount.js';
import { Cohort } from '../js/domain/models/Cohort.js';

const cohort = new Cohort('c1', { students: { a: { name: 'أحمد' }, b: { name: 'بدر' } } });
const linked = (id, students) => ({ id, settings: { cohortId: 'c1' }, students });

test('a linked board counts cohort members plus only its independent students', () => {
    const board = linked('first', {
        a: { name: 'أحمد', cohortStudentId: 'a' },
        b: { name: 'بدر', cohortStudentId: 'b', hidden: true },
        guest: { name: 'خالد' },
    });
    assert.equal(boardStudentCount(board, [cohort]), 3);
});

test('legacy cohort students are recognised by their normalized names', () => {
    const board = linked('first', { legacy: { name: 'أَحْمَد' }, guest: { name: 'خالد' } });
    assert.equal(boardStudentCount(board, [cohort]), 3);
});

test('dashboard counts one cohort once across programs and adds independent board students', () => {
    const first = linked('first', { a: { name: 'أحمد', cohortStudentId: 'a' }, guest: { name: 'خالد' } });
    const second = linked('second', { b: { name: 'بدر', cohortStudentId: 'b' }, guest: { name: 'سالم' } });
    const standalone = { id: 'solo', settings: {}, students: { one: { name: 'منفرد' } } };
    assert.equal(dashboardStudentCount([first, second, standalone], [cohort]), 5);
});
