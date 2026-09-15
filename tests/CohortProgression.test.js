import test from 'node:test';
import assert from 'node:assert/strict';
import { planProgression, applyProgression, orderedPrograms, findRecord } from '../js/domain/usecases/CohortProgression.js';
import { Cohort } from '../js/domain/models/Cohort.js';
import { Leaderboard } from '../js/domain/models/Leaderboard.js';
import { expandScope } from '../js/shared/quran-data.js';

const juz = n => ({ type: 'juz', juzNumbers: [n], curriculum: null, surahNumbers: expandScope({ type: 'juz', juzNumbers: [n] }) });
const full = n => juz(n).surahNumbers;
const board = (id, n, students = {}, extra = {}) => new Leaderboard(id, { settings: { name: `جزء ${n}`, scope: juz(n), direction: 'reverse', cohortId: 'c1' }, students, ...extra });
const cohort = (students = { m1: { name: 'صالح' } }) => new Cohort('c1', { name: 'دفعة', students, programs: [{ boardId: 'b30' }, { boardId: 'b29' }, { boardId: 'b28' }] });

test('a descending Juz path follows its direction and may skip a Juz', () => {
    const path = new Cohort('c1', { programs: [{ boardId: 'b30' }, { boardId: 'b29' }, { boardId: 'b27' }] });
    assert.deepEqual(orderedPrograms(path, [board('b27', 27), board('b30', 30), board('b29', 29)]).map(item => item.id), ['b30', 'b29', 'b27']);
});

test('an ascending Juz path follows its direction and may skip a Juz', () => {
    const path = new Cohort('c1', { programs: [{ boardId: 'b1' }, { boardId: 'b2' }, { boardId: 'b4' }] });
    assert.deepEqual(orderedPrograms(path, [board('b4', 4), board('b2', 2), board('b1', 1)]).map(item => item.id), ['b1', 'b2', 'b4']);
});

test('curriculum programs follow primary, middle, then high-school levels', () => {
    const curriculumBoard = (id, stageId, levelId, termId = 1) => new Leaderboard(id, {
        settings: { name: id, cohortId: 'c1', scope: { type: 'curriculum', surahNumbers: [114], curriculum: { countryId: 1, systemId: 1, stageId, levelId, termId } } },
    });
    const path = new Cohort('c1', { programs: [{ boardId: 'high' }, { boardId: 'p6' }, { boardId: 'middle' }, { boardId: 'p1' }] });
    const boards = [curriculumBoard('middle', 2, 1), curriculumBoard('high', 3, 1), curriculumBoard('p1', 1, 1), curriculumBoard('p6', 1, 6)];
    assert.deepEqual(orderedPrograms(path, boards).map(item => item.id), ['p1', 'p6', 'middle', 'high']);
});

test('new cohort students exist in every program but later programs start hidden', () => {
    const plan = planProgression({ cohort: cohort(), boards: [board('b30', 30), board('b29', 29), board('b28', 28)] });
    assert.deepEqual(plan.moves.map(move => [move.boardId, move.students[0].hidden]), [['b30', false], ['b29', true], ['b28', true]]);
});

test('completing Juz 30 reveals Juz 29 while Juz 28 remains hidden', () => {
    const boards = [
        board('b30', 30, { s30: { name: 'صالح', cohortStudentId: 'm1', memorized: full(30) } }),
        board('b29', 29, { s29: { name: 'صالح', cohortStudentId: 'm1', memorized: [], hidden: true } }),
        board('b28', 28, { s28: { name: 'صالح', cohortStudentId: 'm1', memorized: [], hidden: true } }),
    ];
    assert.deepEqual(planProgression({ cohort: cohort(), boards }).visibility, [{ boardId: 'b29', studentId: 's29', cohortStudentId: 'm1', hidden: false }]);
});

test('completing 30 and 29 reveals 28; reversing 30 hides both later programs', () => {
    const boards = [
        board('b30', 30, { s30: { name: 'صالح', cohortStudentId: 'm1', memorized: full(30) } }),
        board('b29', 29, { s29: { name: 'صالح', cohortStudentId: 'm1', memorized: full(29) } }),
        board('b28', 28, { s28: { name: 'صالح', cohortStudentId: 'm1', memorized: [], hidden: true } }),
    ];
    assert.deepEqual(planProgression({ cohort: cohort(), boards }).visibility, [{ boardId: 'b28', studentId: 's28', cohortStudentId: 'm1', hidden: false }]);
    boards[0].students.s30.memorized = [];
    boards[1].students.s29.hidden = false;
    boards[2].students.s28.hidden = false;
    assert.deepEqual(planProgression({ cohort: cohort(), boards }).visibility, [
        { boardId: 'b29', studentId: 's29', cohortStudentId: 'm1', hidden: true },
        { boardId: 'b28', studentId: 's28', cohortStudentId: 'm1', hidden: true },
    ]);
});

test('teacher visibility overrides survive automatic progression', () => {
    const boards = [
        board('b30', 30, { s30: { name: 'صالح', cohortStudentId: 'm1', memorized: [] } }),
        board('b29', 29, { s29: { name: 'صالح', cohortStudentId: 'm1', memorized: [], visibilityOverride: 'shown' } }),
        board('b28', 28, { s28: { name: 'صالح', cohortStudentId: 'm1', memorized: [], hidden: true, visibilityOverride: 'hidden' } }),
    ];
    assert.equal(planProgression({ cohort: cohort(), boards }).total, 0);
});

test('a student deleted from one board is not recreated by cohort synchronization', () => {
    const plan = planProgression({ cohort: cohort(), boards: [board('b30', 30), board('b29', 29, {}, { excludedCohortStudentIds: ['m1'] })] });
    assert.equal(plan.moves.some(move => move.boardId === 'b29'), false);
});

test('records are matched by cohort link first, then normalized name', () => {
    assert.equal(findRecord(board('b30', 30, { s1: { name: 'عبد الله  السالم', memorized: full(30) } }), { id: 'm9', name: 'عبد الله السالم' })?.studentId, 's1');
});

test('applying synchronization adds hidden state and updates visibility', async () => {
    const calls = [];
    const result = await applyProgression({ moves: [{ boardId: 'b29', currentCount: 0, students: [{ name: 'صالح', cohortStudentId: 'm1', hidden: true }] }], visibility: [{ boardId: 'b28', studentId: 's28', cohortStudentId: 'm1', hidden: false }] }, {
        addStudent: async (boardId, name, count, extra) => calls.push({ type: 'add', boardId, name, count, extra }),
        setStudentVisibility: async (boardId, studentId, hidden, cohortStudentId) => calls.push({ type: 'visibility', boardId, studentId, hidden, cohortStudentId }),
    });
    assert.deepEqual(result, { added: 1, updated: 1, failed: [] });
    assert.deepEqual(calls[0].extra, { cohortStudentId: 'm1', hidden: true });
    assert.deepEqual(calls[1], { type: 'visibility', boardId: 'b28', studentId: 's28', hidden: false, cohortStudentId: 'm1' });
});
