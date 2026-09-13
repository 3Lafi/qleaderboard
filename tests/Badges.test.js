import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { BADGES, evaluateBadges, earnedBadges } from '../js/domain/usecases/Badges.js';
import { JUZ_BOUNDARIES } from '../js/shared/juz-boundaries.js';
import { SURAHS, surahNameArtUrl } from '../js/shared/quran-data.js';
import { Student } from '../js/domain/models/Student.js';

const allSurahs = SURAHS.map(s => s.n);

test('catalog has one Quran, all 30 juz and all 114 surahs with unique IDs and existing assets', () => {
    assert.equal(BADGES.length, 145);
    assert.equal(new Set(BADGES.map(b => b.id)).size, 145);
    for (const [type, count] of [['quran', 1], ['juz', 30], ['surah', 114]]) {
        assert.deepEqual(BADGES.filter(b => b.type === type).map(b => b.number), Array.from({length:count}, (_,i)=>i+1));
    }
    for (const badge of BADGES) {
        assert.ok(existsSync(new URL(`..${badge.art}`, import.meta.url)), badge.art);
        assert.ok(badge.requiredSurahs.length > 0);
    }
    for (const s of SURAHS) assert.ok(existsSync(new URL(`..${surahNameArtUrl(s.n)}`, import.meta.url)));
});

test('every juz and surah pairs the shared zero label with its own numbered name asset', () => {
    for (const type of ['juz', 'surah']) {
        const badges = BADGES.filter(b => b.type === type);
        assert.equal(badges.length, type === 'juz' ? 30 : 114);
        for (const badge of badges) {
            assert.equal(badge.labelArt, `/images/badges-assets/${type}/0.png`);
            assert.equal(badge.art, `/images/badges-assets/${type}/${badge.number}.png`);
            assert.ok(existsSync(new URL(`..${badge.labelArt}`, import.meta.url)));
            assert.notEqual(badge.labelArt, badge.art);
        }
    }
    assert.equal(BADGES[0].labelArt, null);
});

test('juz source mapping partitions all 6236 ayahs exactly once', () => {
    const visited = new Set();
    for (let j = 1; j <= 30; j++) {
        for (const [surah, range] of Object.entries(JUZ_BOUNDARIES[j])) {
            const [start,end] = range.split('-').map(Number);
            assert.ok(start >= 1 && end >= start && end <= SURAHS[Number(surah)-1].ayahs);
            for (let a=start; a<=end; a++) {
                const key = `${surah}:${a}`;
                assert.equal(visited.has(key), false, `Duplicate ${key}`);
                visited.add(key);
            }
        }
    }
    assert.equal(visited.size, 6236);
});

test('no memorization earns no badges; invalid values and duplicates cannot award extra badges', () => {
    assert.equal(earnedBadges([]).length, 0);
    assert.equal(earnedBadges(null).length, 0);
    assert.deepEqual(earnedBadges([1,1,0,115,'2',NaN]).map(b=>b.id), ['surah-1']);
});

test('completing a small curriculum does not award Quran completion', () => {
    const student = new Student('one', {memorized:[112]}, [112]);
    assert.equal(student.isCompleted, true);
    assert.equal(evaluateBadges(student.memorized)[0].earned, false);
    assert.deepEqual(earnedBadges(student.memorized).map(b=>b.id), ['surah-112']);
});

test('juz eligibility includes surahs that cross boundaries, including juz 2 and 5', () => {
    const badges = evaluateBadges([2]);
    assert.equal(badges.find(b=>b.id==='juz-2').earned, true);
    assert.equal(badges.find(b=>b.id==='juz-1').earned, false);
    assert.equal(badges.find(b=>b.id==='juz-3').earned, false);
    assert.equal(evaluateBadges([4]).find(b=>b.id==='juz-5').earned, true);
    assert.equal(evaluateBadges([3]).find(b=>b.id==='juz-3').earned, false);
});

test('juz Amma needs every surah 78 through 114 and earns 38 badges', () => {
    const amma = allSurahs.filter(n=>n>=78);
    const earned = earnedBadges(amma);
    assert.equal(earned.length, 38);
    assert.deepEqual(earned.filter(b=>b.type==='juz').map(b=>b.number), [30]);
    assert.equal(evaluateBadges(amma.slice(1)).find(b=>b.id==='juz-30').earned, false);
});

test('full memorization earns 145; reversing a surah revokes dependent badges without mutating input', () => {
    assert.equal(earnedBadges(allSurahs).length, 145);
    const revised = allSurahs.filter(n=>n!==2);
    const snapshot = [...revised];
    const revoked = evaluateBadges(revised).filter(b=>!b.earned).map(b=>b.id);
    assert.deepEqual(revoked, ['quran-1','juz-1','juz-2','juz-3','surah-2']);
    assert.deepEqual(revised, snapshot);
});
