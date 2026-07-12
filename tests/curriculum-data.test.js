import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCurriculumSurahs } from '../js/core/curriculum-data.js';

test('resolves a specific term to the exact official surah list (Saudi tahfeez, primary, grade 1, term 1)', () => {
    const nums = resolveCurriculumSurahs({ countryId: 1, systemId: 2, stageId: 1, levelId: 1, termId: 1 });
    assert.deepEqual(nums, [1, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114]);
});

test('termId null unions every term for that level', () => {
    const term1 = resolveCurriculumSurahs({ countryId: 1, systemId: 2, stageId: 1, levelId: 1, termId: 1 });
    const term2 = resolveCurriculumSurahs({ countryId: 1, systemId: 2, stageId: 1, levelId: 1, termId: 2 });
    const wholeYear = resolveCurriculumSurahs({ countryId: 1, systemId: 2, stageId: 1, levelId: 1, termId: null });
    const expectedUnion = [...new Set([...term1, ...term2])].sort((a, b) => a - b);
    assert.deepEqual(wholeYear, expectedUnion);
    assert.equal(wholeYear.length, 32);
});

test('unknown combination resolves to an empty list rather than throwing', () => {
    const nums = resolveCurriculumSurahs({ countryId: 999, systemId: 1, stageId: 1, levelId: 1, termId: 1 });
    assert.deepEqual(nums, []);
});
