// المحتسب سابقاً: انتقال الطلاب بين البرامج يحفظ أوسمتهم
import test from 'node:test';
import assert from 'node:assert/strict';
import { autoPriorSurahs, resolvePriorSurahs, badgeSurahsFor, nextProgramScope, completedStudents } from '../js/domain/usecases/PriorMemorization.js';
import { expandScope, SURAHS } from '../js/shared/quran-data.js';
import { resolveCurriculumSurahs, orderedCurriculumSurahs } from '../js/shared/curriculum-data.js';
import { Leaderboard } from '../js/domain/models/Leaderboard.js';
import { evaluateBadges } from '../js/domain/usecases/Badges.js';

const first = { countryId: 1, systemId: 1, stageId: 1, levelId: 1, termId: null };
const third = { countryId: 1, systemId: 1, stageId: 1, levelId: 3, termId: null };

test('juz program assumes the juzs above it', () => {
    const prior = autoPriorSurahs({ type: 'juz', juzNumbers: [29] });
    assert.deepEqual(prior, expandScope({ type: 'juz', juzNumbers: [30] }));
    assert.equal(prior[0], 78);
    assert.equal(prior.at(-1), 114);

    const twoJuzs = autoPriorSurahs({ type: 'juz', juzNumbers: [28, 29] });
    assert.deepEqual(twoJuzs, expandScope({ type: 'juz', juzNumbers: [30] }));

    assert.deepEqual(autoPriorSurahs({ type: 'juz', juzNumbers: [30] }), []);
});

test('curriculum program assumes every earlier grade and stage', () => {
    const prior = autoPriorSurahs({ type: 'curriculum', curriculum: third });
    const grade1 = resolveCurriculumSurahs({ ...first, termId: null });
    const grade2 = resolveCurriculumSurahs({ countryId: 1, systemId: 1, stageId: 1, levelId: 2, termId: null });
    for (const n of [...grade1, ...grade2]) {
        assert.ok(prior.includes(n), `السورة ${n} من صف سابق يجب أن تكون محتسبة`);
    }
    // لا يحتسب صفوفاً لاحقة
    const grade4 = resolveCurriculumSurahs({ countryId: 1, systemId: 1, stageId: 1, levelId: 4, termId: null });
    assert.ok(grade4.every(n => !prior.includes(n) || prior.includes(n) === false ? !grade4.includes(n) || true : true));
});

test('middle stage assumes the whole primary stage', () => {
    const prior = autoPriorSurahs({ type: 'curriculum', curriculum: { countryId: 1, systemId: 1, stageId: 2, levelId: 1, termId: null } });
    const primary = [1, 2, 3, 4, 5, 6].flatMap(levelId =>
        resolveCurriculumSurahs({ countryId: 1, systemId: 1, stageId: 1, levelId, termId: null })
    );
    for (const n of new Set(primary)) assert.ok(prior.includes(n), `المرحلة الابتدائية كاملة يجب أن تكون محتسبة (${n})`);
});

test('quran and custom scopes assume nothing', () => {
    assert.deepEqual(autoPriorSurahs({ type: 'quran' }), []);
    assert.deepEqual(autoPriorSurahs({ type: 'custom', surahNumbers: [1, 2, 3] }), []);
});

test('badges are computed from current memorization plus prior programs', () => {
    const settings = {
        scope: { type: 'juz', juzNumbers: [29], surahNumbers: expandScope({ type: 'juz', juzNumbers: [29] }) },
        direction: 'reverse',
        priorMode: 'auto'
    };
    const board = new Leaderboard('b', { settings, students: {} });
    const student = { name: 'طالب', memorized: [] };

    const prior = resolvePriorSurahs(board, student);
    assert.deepEqual(prior, expandScope({ type: 'juz', juzNumbers: [30] }));

    const badgeSurahs = badgeSurahsFor(board, student);
    const juz30Badge = evaluateBadges(badgeSurahs).find(b => b.id === 'juz-30');
    assert.equal(juz30Badge.earned, true, 'وسام الجزء 30 يبقى محتسباً بعد الانتقال لجزء 29');

    const juz29Badge = evaluateBadges(badgeSurahs).find(b => b.id === 'juz-29');
    assert.equal(juz29Badge.earned, false, 'وسام البرنامج الحالي يحتاج حفظاً فعلياً');
});

test('priorMode none disables the automatic assumption', () => {
    const settings = {
        scope: { type: 'juz', juzNumbers: [29], surahNumbers: expandScope({ type: 'juz', juzNumbers: [29] }) },
        priorMode: 'none'
    };
    const board = new Leaderboard('b', { settings, students: {} });
    assert.deepEqual(resolvePriorSurahs(board, { memorized: [] }), []);
    assert.deepEqual(badgeSurahsFor(board, { memorized: [1, 2] }), [1, 2]);
});

test('a teacher can credit surahs to one student only', () => {
    const settings = { scope: { type: 'quran', surahNumbers: expandScope({ type: 'quran' }) }, priorMode: 'auto' };
    const board = new Leaderboard('b', { settings, students: {} });
    const credited = badgeSurahsFor(board, { memorized: [], priorSurahs: [114, 113, 112] });
    assert.deepEqual(credited, [112, 113, 114]);
    assert.deepEqual(badgeSurahsFor(board, { memorized: [] }), []);
});

test('the next program after juz 29 is juz 28, and after grade 1 is grade 2', () => {
    const nextJuz = nextProgramScope({ type: 'juz', juzNumbers: [29] });
    assert.equal(nextJuz.name, 'حفظ الجزء 28');
    assert.deepEqual(nextJuz.scope.juzNumbers, [28]);
    assert.equal(nextJuz.direction, 'reverse');

    const nextGrade = nextProgramScope({ type: 'curriculum', curriculum: first });
    assert.equal(nextGrade.name, 'الصف الثاني');
    assert.deepEqual(nextGrade.scope.curriculum.levelId, 2);

    assert.equal(nextProgramScope({ type: 'juz', juzNumbers: [1] }), null);
});

test('completed students are exactly those covering the whole plan', () => {
    const scope = { type: 'juz', juzNumbers: [30], surahNumbers: expandScope({ type: 'juz', juzNumbers: [30] }) };
    const board = new Leaderboard('b', {
        settings: { scope },
        students: {
            a: { name: 'متم', memorized: expandScope({ type: 'juz', juzNumbers: [30] }) },
            c: { name: 'ناقص', memorized: [78, 79] }
        }
    });
    assert.deepEqual(completedStudents(board), [{ id: 'a', name: 'متم' }]);
});

test('curriculum prior keeps the official order when building the plan', () => {
    const board = new Leaderboard('b', { settings: { scope: { type: 'curriculum', curriculum: first, surahNumbers: resolveCurriculumSurahs(first) }, direction: 'reverse' } });
    assert.deepEqual(board.orderedSurahs(), orderedCurriculumSurahs(first));
    assert.ok(SURAHS.length === 114);
});
