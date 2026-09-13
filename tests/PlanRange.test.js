import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRangeEndpoint, resolvePlanRange, rangeOptionsForQuery } from '../js/domain/usecases/PlanRange.js';

test('range endpoints accept Arabic names, numerals and numbered suggestions', () => {
    assert.equal(parseRangeEndpoint('سورة الفَاتِحَة','surah'),1);
    assert.equal(parseRangeEndpoint('١١٤ — الناس','surah'),114);
    assert.equal(parseRangeEndpoint('الانشقاق','surah'),84);
    assert.equal(parseRangeEndpoint('۳۰','juz'),30);
    for (const value of ['', '0','115','الناس زائد']) assert.equal(parseRangeEndpoint(value,'surah'),null);
    assert.equal(parseRangeEndpoint('31','juz'),null);
});
test('surah ranges include both endpoints and follow the chosen direction', () => {
    const reverse=resolvePlanRange('surah',114,84);
    assert.equal(reverse.direction,'reverse');
    assert.deepEqual(reverse.scope.surahNumbers,Array.from({length:31},(_,i)=>84+i));
    assert.equal(resolvePlanRange('surah',1,114).scope.type,'quran');
    assert.equal(resolvePlanRange('surah',84,114).direction,'forward');
    assert.deepEqual(resolvePlanRange('surah',1,1).scope.surahNumbers,[1]);
    assert.equal(resolvePlanRange('surah',null,114),null);
});
test('juz ranges include surahs crossing boundaries and deduplicate repeated surahs', () => {
    assert.deepEqual(resolvePlanRange('juz',2,2).scope.surahNumbers,[2]);
    assert.deepEqual(resolvePlanRange('juz',1,2).scope.surahNumbers,[1,2]);
    assert.equal(resolvePlanRange('juz',30,29).direction,'reverse');
    assert.equal(resolvePlanRange('juz',1,30).scope.surahNumbers.length,114);
    assert.equal(resolvePlanRange('juz',1,31),null);
});

test('range search accepts named surahs and Arabic numerals without fuzzy numeric matches', () => {
    assert.deepEqual(rangeOptionsForQuery('  سورة الفَاتِحَة  ','surah').map(s=>s.n),[1]);
    for (const query of ['114','١١٤','۱۱۴']) assert.deepEqual(rangeOptionsForQuery(query,'surah').map(s=>s.n),[114]);
    assert.deepEqual(rangeOptionsForQuery('الجزء ٣٠','juz').map(s=>s.n),[30]);
    assert.deepEqual(rangeOptionsForQuery('جزء ٢٩','juz').map(s=>s.n),[29]);
    assert.deepEqual(rangeOptionsForQuery('1','surah').map(s=>s.n),[1]);
    assert.deepEqual(rangeOptionsForQuery('115','surah'),[]);
    assert.deepEqual(rangeOptionsForQuery('31','juz'),[]);
    assert.deepEqual(rangeOptionsForQuery('سورة غير موجودة','surah'),[]);
});
test('range browsing preserves Quran order and exposes every valid choice', () => {
    assert.deepEqual(rangeOptionsForQuery('','surah').map(s=>s.n),Array.from({length:114},(_,i)=>i+1));
    assert.deepEqual(rangeOptionsForQuery('','juz').map(s=>s.n),Array.from({length:30},(_,i)=>i+1));
    const partial=rangeOptionsForQuery('ص','surah').map(s=>s.n);
    assert.ok(partial.includes(38));
    assert.deepEqual(partial,[...partial].sort((a,b)=>a-b));
});
