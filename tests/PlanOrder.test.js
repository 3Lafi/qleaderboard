// قاعدة ترتيب خطة الحفظ: الأجزاء تُعكس ككتل والسور داخلها بتسلسل المصحف
import test from 'node:test';
import assert from 'node:assert/strict';
import { orderPlanSurahs, expandScope } from '../js/shared/quran-data.js';
import { Leaderboard } from '../js/domain/models/Leaderboard.js';
import { resolvePlanRange } from '../js/domain/usecases/PlanRange.js';
import { sanitizeSettings } from '../js/domain/models/BoardSettings.js';

const range = (a, b) => Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => Math.min(a, b) + i);
const surahsOfJuz = juz => expandScope({ type: 'juz', juzNumbers: [juz] });

test('juz range reversed flips the juz blocks but keeps each juz in mushaf order', () => {
    const juz29 = surahsOfJuz(29); // الملك .. المرسلات
    const juz30 = surahsOfJuz(30); // النبأ .. الناس
    assert.equal(juz30[0], 78);
    assert.equal(juz30.at(-1), 114);
    assert.equal(juz29[0], 67);
    assert.equal(juz29.at(-1), 77);

    const reversed = orderPlanSurahs([...juz29, ...juz30], { type: 'juz', direction: 'reverse' });
    assert.deepEqual(reversed, [...juz30, ...juz29], 'يبدأ من النبأ إلى الناس ثم الملك إلى المرسلات');
    assert.deepEqual(reversed.slice(0, 3), [78, 79, 80]);
    assert.deepEqual(reversed.slice(-3), [75, 76, 77]);
});

test('juz range forward stays in mushaf order', () => {
    const surahs = expandScope({ type: 'juz', juzNumbers: [29, 30] });
    assert.deepEqual(orderPlanSurahs(surahs, { type: 'juz', direction: 'forward' }), surahs);
    assert.deepEqual(surahs, range(67, 114));
});

test('surah scope reversed reverses the surahs themselves', () => {
    assert.deepEqual(orderPlanSurahs(range(100, 110), { type: 'custom', direction: 'reverse' }), [...range(100, 110)].reverse());
});

test('a juz range keeps mushaf order inside every selected juz for any juz block', () => {
    for (const juz of [1, 5, 15, 29, 30]) {
        const surahs = surahsOfJuz(juz);
        const reversed = orderPlanSurahs(surahs, { type: 'juz', direction: 'reverse' });
        assert.deepEqual(reversed, surahs, `الجزء ${juz} يبقى بتسلسل المصحف`);
    }
});

test('custom order wins over the direction rule when it is a full permutation', () => {
    const surahs = range(78, 82);
    const custom = [82, 78, 81, 79, 80];
    assert.deepEqual(orderPlanSurahs(surahs, { type: 'juz', direction: 'reverse', customOrder: custom }), custom);
    // ترتيب ناقص أو غريب يُتجاهل
    assert.deepEqual(orderPlanSurahs(surahs, { type: 'juz', direction: 'forward', customOrder: [82, 78] }), surahs);
});

test('board plan uses the juz rule end to end', () => {
    // زر العكس في الواجهة يبدّل الطرفين: من 29 إلى 30 يصبح 30 ← 29
    const resolved = resolvePlanRange('juz', 30, 29);
    assert.equal(resolved.direction, 'reverse');
    const board = new Leaderboard('b', { settings: { scope: resolved.scope, direction: resolved.direction } });
    const ordered = board.orderedSurahs();
    assert.deepEqual(ordered.slice(0, 2), [78, 79]);
    assert.deepEqual(ordered.slice(-2), [76, 77]);
    assert.equal(ordered.length, 48);
});

test('sanitizeSettings keeps a valid custom order and drops a broken one', () => {
    const base = { name: 'لوحة', scope: { type: 'juz', juzNumbers: [30], surahNumbers: surahsOfJuz(30) } };
    const kept = sanitizeSettings({ ...base, scope: { ...base.scope, customOrder: [...surahsOfJuz(30)].reverse() } });
    assert.deepEqual(kept.scope.customOrder.at(-1), 78);
    assert.equal(kept.scope.customOrder.length, surahsOfJuz(30).length);

    const dropped = sanitizeSettings({ ...base, scope: { ...base.scope, customOrder: [78, 79] } });
    assert.equal(dropped.scope.customOrder, undefined);
});
