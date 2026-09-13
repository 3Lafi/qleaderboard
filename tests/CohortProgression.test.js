// تدرّج الدفعة: المجتاز ينتقل للبرنامج التالي المرتبط
import test from 'node:test';
import assert from 'node:assert/strict';
import { planProgression, applyProgression, orderedPrograms, findRecord } from '../js/domain/usecases/CohortProgression.js';
import { Cohort } from '../js/domain/models/Cohort.js';
import { Leaderboard } from '../js/domain/models/Leaderboard.js';
import { expandScope } from '../js/shared/quran-data.js';

const juz = n => ({ type: 'juz', juzNumbers: [n], curriculum: null, surahNumbers: expandScope({ type: 'juz', juzNumbers: [n] }) });
const board = (id, name, juzNumber, students = {}) => new Leaderboard(id, {
    settings: { name, scope: juz(juzNumber), direction: 'reverse', cohortId: 'c1' },
    students,
});
const full = juzNumber => expandScope({ type: 'juz', juzNumbers: [juzNumber] });

const cohort = () => new Cohort('c1', {
    name: 'دفعة',
    students: { m1: { name: 'صالح' }, m2: { name: 'عزام' }, m3: { name: 'جديد' } },
    programs: [{ boardId: 'b29' }, { boardId: 'b28' }],
});

test('programs follow the cohort link order', () => {
    const boards = [board('b28', 'جزء 28', 28), board('b29', 'جزء 29', 29)];
    assert.deepEqual(orderedPrograms(cohort(), boards).map(b => b.id), ['b29', 'b28']);
});

test('a student who completed a program moves to the next one only', () => {
    const boards = [
        board('b29', 'جزء 29', 29, { s1: { name: 'صالح', cohortStudentId: 'm1', memorized: full(29) } }),
        board('b28', 'جزء 28', 28, {}),
    ];
    const plan = planProgression({ cohort: cohort(), boards });
    assert.equal(plan.total, 1);
    assert.equal(plan.moves[0].boardId, 'b28');
    assert.deepEqual(plan.moves[0].students.map(s => s.name), ['صالح']);
});

test('students who have not completed stay put, and new members stay put', () => {
    const boards = [
        board('b29', 'جزء 29', 29, {
            s1: { name: 'صالح', cohortStudentId: 'm1', memorized: full(29) },
            s2: { name: 'عزام', cohortStudentId: 'm2', memorized: [67, 68] },
        }),
        board('b28', 'جزء 28', 28, {}),
    ];
    const plan = planProgression({ cohort: cohort(), boards });
    assert.deepEqual(plan.moves[0].students.map(s => s.name), ['صالح'], 'عزام لم يتمّ فيبقى، وجديد ليس في أي برنامج');
});

test('no duplicates: a student already in the next program is not added again', () => {
    const boards = [
        board('b29', 'جزء 29', 29, { s1: { name: 'صالح', cohortStudentId: 'm1', memorized: full(29) } }),
        board('b28', 'جزء 28', 28, { s9: { name: 'صالح  ', cohortStudentId: 'm1', memorized: [] } }),
    ];
    assert.equal(planProgression({ cohort: cohort(), boards }).total, 0);
});

test('a student who finished the last program has nowhere to go', () => {
    const boards = [
        board('b29', 'جزء 29', 29, { s1: { name: 'صالح', cohortStudentId: 'm1', memorized: full(29) } }),
        board('b28', 'جزء 28', 28, { s2: { name: 'صالح', cohortStudentId: 'm1', memorized: full(28) } }),
    ];
    assert.equal(planProgression({ cohort: cohort(), boards }).total, 0);
});

test('records are matched by link first, then by normalized name', () => {
    const b = board('b29', 'جزء 29', 29, { s1: { name: 'عبد الله  السالم', memorized: full(29) } });
    const found = findRecord(b, { id: 'm9', name: 'عبد الله السالم' });
    assert.equal(found?.studentId, 's1');
});

test('applying the plan adds students with their cohort link and counts', async () => {
    const boards = [
        board('b29', 'جزء 29', 29, { s1: { name: 'صالح', cohortStudentId: 'm1', memorized: full(29) } }),
        board('b28', 'جزء 28', 28, {}),
    ];
    const plan = planProgression({ cohort: cohort(), boards });
    const calls = [];
    const result = await applyProgression(plan, {
        addStudent: async (boardId, name, count, extra) => { calls.push({ boardId, name, count, extra }); return 'new-id'; }
    });
    assert.equal(result.added, 1);
    assert.deepEqual(calls[0], { boardId: 'b28', name: 'صالح', count: 0, extra: { cohortStudentId: 'm1' } });
});
