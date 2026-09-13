// تجميع الطالب عبر البرامج: الحفظ في أي برنامج يظهر في ملفه
import test from 'node:test';
import assert from 'node:assert/strict';
import { findStudentPrograms, unionMemorized, badgeSurahsAcrossPrograms } from '../js/domain/usecases/StudentPrograms.js';
import { Leaderboard } from '../js/domain/models/Leaderboard.js';
import { expandScope } from '../js/shared/quran-data.js';
import { evaluateBadges } from '../js/domain/usecases/Badges.js';

const juzScope = juz => ({ type: 'juz', juzNumbers: [juz], curriculum: null, surahNumbers: expandScope({ type: 'juz', juzNumbers: [juz] }) });
const boards = () => [
    new Leaderboard('b29', { settings: { name: 'جزء 29', scope: juzScope(29), direction: 'reverse', priorMode: 'auto' }, students: { s29: { name: 'صالح', cohortStudentId: 'c1', memorized: [67, 68] } } }),
    new Leaderboard('b30', { settings: { name: 'جزء 30', scope: juzScope(30), direction: 'reverse', priorMode: 'auto' }, students: { s30: { name: 'صالح', cohortStudentId: 'c1', memorized: expandScope({ type: 'juz', juzNumbers: [30] }) } } }),
];

test('finds every program the student belongs to through the cohort link', () => {
    const programs = findStudentPrograms(boards(), 'c1');
    assert.deepEqual(programs.map(p => p.boardName), ['جزء 29', 'جزء 30']);
    assert.equal(programs[0].memorizedInScope.length, 2);
    assert.equal(programs[1].completed, true);
});

test('memorization from one program is reflected in the union everywhere', () => {
    const programs = findStudentPrograms(boards(), 'c1');
    const union = unionMemorized(programs);
    assert.equal(union.length, 39);
    assert.ok(union.includes(78) && union.includes(67));

    const badges = evaluateBadges(badgeSurahsAcrossPrograms(boards(), 'c1'));
    assert.equal(badges.find(b => b.id === 'juz-30').earned, true, 'وسام جزء 30 مكتسب من برنامج الجزء 30');
    // جزء 29 ناقص في برنامجه => لا يُكتسب بعد
    assert.equal(badges.find(b => b.id === 'juz-29').earned, false);
});

test('a student without a cohort link has no cross-program page', () => {
    assert.deepEqual(findStudentPrograms(boards(), 'unknown'), []);
    assert.deepEqual(badgeSurahsAcrossPrograms(boards(), ''), []);
});
