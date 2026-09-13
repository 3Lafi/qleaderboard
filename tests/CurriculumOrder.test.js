import test from 'node:test';
import assert from 'node:assert/strict';
import { orderedCurriculumSurahs, resolveCurriculumSurahs, curriculumClassLabel, CURRICULUM_LEVELS } from '../js/shared/curriculum-data.js';
import { Leaderboard } from '../js/domain/models/Leaderboard.js';
import { sanitizeSettings } from '../js/domain/models/BoardSettings.js';
const first={countryId:1,systemId:2,stageId:1,levelId:1,termId:null};

test('Saudi tahfeez first grade starts at Fatiha then Nas through Inshiqaq', () => {
    assert.deepEqual(orderedCurriculumSurahs(first),[1,...Array.from({length:31},(_,i)=>114-i)]);
    assert.deepEqual(orderedCurriculumSurahs({...first,termId:1}),[1,...Array.from({length:20},(_,i)=>114-i)]);
    assert.deepEqual(orderedCurriculumSurahs({...first,termId:2}),Array.from({length:11},(_,i)=>94-i));
});
test('curriculum ordering keeps term membership and deduplicates shared surahs', () => {
    for (const level of CURRICULUM_LEVELS) {
        const selection={...level,termId:null};
        assert.deepEqual(orderedCurriculumSurahs(selection).sort((a,b)=>a-b),resolveCurriculumSurahs(selection));
    }
    assert.deepEqual(orderedCurriculumSurahs({...first,stageId:3,levelId:1}),[2,3,4,5,6,7,8,9]);
});
test('existing curriculum boards ignore old reverse sorting without expanding their saved scope', () => {
    const scope={type:'curriculum',curriculum:first,surahNumbers:resolveCurriculumSurahs(first)};
    const board=new Leaderboard('test',{settings:{scope,direction:'reverse',classLabel:'اسم يدوي قديم'}});
    assert.deepEqual(board.orderedSurahs(),orderedCurriculumSurahs(first));
    assert.equal(board.settings.classLabel,curriculumClassLabel(first));
    board.settings.scope.surahNumbers=[1,113,114];
    assert.deepEqual(board.orderedSurahs(),[1,114,113]);
});
test('grade and term label derive from curriculum selection at save time', () => {
    const settings=sanitizeSettings({name:'لوحة',classLabel:'اسم قديم',scope:{type:'curriculum',curriculum:first,surahNumbers:[1,114]}});
    assert.match(settings.classLabel,/الصف الأول/);
    assert.doesNotMatch(settings.classLabel,/السنة كاملة|كل الفصول/);
    assert.match(curriculumClassLabel({...first,termId:2}),/الفصل الثاني/);
    assert.equal(curriculumClassLabel(null),'');
});
