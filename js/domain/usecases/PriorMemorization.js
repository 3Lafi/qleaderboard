// المحتسب سابقاً وتدرّج البرامج (Prior memorization & program progression)
//
// البرامج في وسام متتابعة: منهج الصف الأول ثم الثاني ثم الثالث… أو جزء 30 ثم 29 ثم 28.
// الطالب الذي أنهى برنامجاً يبقى محتسباً له عند انتقاله للبرنامج التالي، فلا تعود أوسمته صفراً.
// هنا تُشتق «السور المحتسبة سابقاً» من نطاق اللوحة نفسها، ويُشتق البرنامج التالي منها أيضاً.
import { expandScope, SURAHS } from '../../shared/quran-data.js';
import { CURRICULUM_LEVELS, CURRICULUM_STAGES, resolveCurriculumSurahs } from '../../shared/curriculum-data.js';
import { JUZ_BOUNDARIES } from '../../shared/juz-boundaries.js';

const isValidSurah = n => Number.isInteger(n) && n >= 1 && n <= 114;

/**
 * السور التي يفترض أن الطالب حفظها قبل هذا النطاق.
 * - منهج دراسي: كل صفوف المراحل والصفوف السابقة في نفس الدولة ونوع التعليم.
 * - أجزاء: الأجزاء الأعلى من النطاق (لأن الحفظ يبدأ من جزء 30 ثم 29 ثم 28…).
 * - القرآن كامل أو نطاق سور مخصص: لا يوجد سابق معروف.
 * @param {{type?:string, juzNumbers?:number[], curriculum?:Object|null, surahNumbers?:number[]}} scope
 * @returns {number[]}
 */
export function autoPriorSurahs(scope = {}) {
    const type = scope?.type || 'custom';

    if (type === 'curriculum' && scope.curriculum) {
        const { countryId, systemId, stageId, levelId } = scope.curriculum;
        const stages = CURRICULUM_STAGES
            .filter(s => s.countryId === countryId && s.systemId === systemId)
            .map(s => s.stageId);
        const stageIndex = stages.indexOf(stageId);
        if (stageIndex === -1) return [];

        const prior = new Set();
        for (const level of CURRICULUM_LEVELS) {
            if (level.countryId !== countryId || level.systemId !== systemId) continue;
            const levelStageIndex = stages.indexOf(level.stageId);
            const isEarlierStage = levelStageIndex < stageIndex;
            const isEarlierLevel = level.stageId === stageId && level.levelNum < levelNumOf(levelId, countryId, systemId, stageId);
            if (!isEarlierStage && !isEarlierLevel) continue;
            // الصف السابق يُحتسب كسنة كاملة (كل فصوله)
            resolveCurriculumSurahs({ countryId, systemId, stageId: level.stageId, levelId: level.levelId, termId: null })
                .forEach(n => prior.add(n));
        }
        return [...prior].sort((a, b) => a - b);
    }

    if (type === 'juz') {
        const selected = (scope.juzNumbers || []).filter(n => Number.isInteger(n) && n >= 1 && n <= 30);
        if (!selected.length) return [];
        const highest = Math.max(...selected);
        const later = Array.from({ length: 30 - highest }, (_, i) => highest + i + 1);
        return later.length ? expandScope({ type: 'juz', juzNumbers: later }) : [];
    }

    return [];
}

function levelNumOf(levelId, countryId, systemId, stageId) {
    return CURRICULUM_LEVELS.find(l => l.countryId === countryId && l.systemId === systemId && l.stageId === stageId && l.levelId === levelId)?.levelNum ?? 0;
}

/**
 * السور المحتسبة لطالب: ما يقرره إعداد اللوحة + ما يضيفه المعلم للطالب نفسه.
 * @param {Object} board لوحة (Leaderboard)
 * @param {Object} [studentData] بيانات الطالب من اللوحة
 * @returns {number[]}
 */
export function resolvePriorSurahs(board, studentData = null) {
    const settings = board?.settings || {};
    const set = new Set();

    if (settings.priorMode !== 'none') {
        autoPriorSurahs(settings.scope || {}).forEach(n => set.add(n));
    }

    (settings.priorSurahs || []).filter(isValidSurah).forEach(n => set.add(n));
    (studentData?.priorSurahs || []).filter(isValidSurah).forEach(n => set.add(n));

    return [...set].sort((a, b) => a - b);
}

/**
 * أوسمة الطالب = محفوظه الحالي + المحتسب سابقاً (من برامج أنهىها)
 * @param {Object} board
 * @param {Object} studentData
 * @returns {number[]}
 */
export function badgeSurahsFor(board, studentData = {}) {
    const set = new Set([...(studentData.memorized || []).filter(isValidSurah), ...resolvePriorSurahs(board, studentData)]);
    return [...set].sort((a, b) => a - b);
}

/**
 * وصف مختصر للمحتسب سابقاً، لعرضه للمعلم.
 * @param {number[]} surahNumbers
 * @returns {string}
 */
export function priorSummaryText(surahNumbers = []) {
    const list = [...new Set(surahNumbers.filter(isValidSurah))].sort((a, b) => a - b);
    if (!list.length) return '';
    const juzs = juzsCovered(list);
    const parts = [`${list.length} سورة`];
    if (juzs.length) parts.push(juzs.length === 1 ? `الجزء ${juzs[0]}` : `الأجزاء ${juzs[0]}–${juzs.at(-1)}`);
    return parts.join(' · ');
}

// الأجزاء التي تغطيها مجموعة سور (بحسب بداية كل سورة)
export function juzsCovered(surahNumbers = []) {
    const set = new Set(surahNumbers.map(n => SURAHS[n - 1]?.juz).filter(Boolean));
    return [...set].sort((a, b) => a - b);
}

/**
 * البرنامج التالي المقترح بعد إتمام النطاق الحالي.
 * - أجزاء: الجزء الذي يلي النطاق (29 ← 28)
 * - منهج: الصف التالي في نفس المرحلة، أو أول صف في المرحلة التالية
 * @param {{type?:string, juzNumbers?:number[], curriculum?:Object|null, surahNumbers?:number[]}} scope
 * @returns {{name:string, scope:Object}|null}
 */
export function nextProgramScope(scope = {}) {
    const type = scope?.type || 'custom';

    if (type === 'juz') {
        const selected = (scope.juzNumbers || []).filter(n => Number.isInteger(n) && n >= 1 && n <= 30);
        if (!selected.length) return null;
        const lowest = Math.min(...selected);
        if (lowest <= 1) return null;
        const nextJuz = lowest - 1;
        return {
            name: `حفظ الجزء ${nextJuz}`,
            scope: { type: 'juz', juzNumbers: [nextJuz], curriculum: null, surahNumbers: expandScope({ type: 'juz', juzNumbers: [nextJuz] }) },
            direction: 'reverse'
        };
    }

    if (type === 'curriculum' && scope.curriculum) {
        const { countryId, systemId, stageId, levelId } = scope.curriculum;
        const stages = CURRICULUM_STAGES.filter(s => s.countryId === countryId && s.systemId === systemId).map(s => s.stageId);
        const stageIndex = stages.indexOf(stageId);
        const currentNum = levelNumOf(levelId, countryId, systemId, stageId);

        const sameStageNext = CURRICULUM_LEVELS.find(l => l.countryId === countryId && l.systemId === systemId && l.stageId === stageId && l.levelNum === currentNum + 1);
        if (sameStageNext) {
            return {
                name: sameStageNext.name,
                scope: { type: 'curriculum', juzNumbers: [], curriculum: { countryId, systemId, stageId, levelId: sameStageNext.levelId, termId: null }, surahNumbers: resolveCurriculumSurahs({ countryId, systemId, stageId, levelId: sameStageNext.levelId, termId: null }) },
                direction: 'forward'
            };
        }

        const nextStageId = stages[stageIndex + 1];
        const firstOfNextStage = nextStageId
            ? CURRICULUM_LEVELS.filter(l => l.countryId === countryId && l.systemId === systemId && l.stageId === nextStageId).sort((a, b) => a.levelNum - b.levelNum)[0]
            : null;
        if (firstOfNextStage) {
            return {
                name: firstOfNextStage.name,
                scope: { type: 'curriculum', juzNumbers: [], curriculum: { countryId, systemId, stageId: nextStageId, levelId: firstOfNextStage.levelId, termId: null }, surahNumbers: resolveCurriculumSurahs({ countryId, systemId, stageId: nextStageId, levelId: firstOfNextStage.levelId, termId: null }) },
                direction: 'forward'
            };
        }
    }

    return null;
}

/**
 * الطلاب الذين أتموا خطة اللوحة الحالية.
 * @param {Object} board
 * @returns {Array<{id:string,name:string}>}
 */
export function completedStudents(board) {
    const scope = new Set(board?.orderedSurahs?.() || []);
    if (!scope.size) return [];
    return Object.entries(board?.students || {})
        .filter(([, data]) => [...scope].every(n => (data.memorized || []).includes(n)))
        .map(([id, data]) => ({ id, name: data.name }));
}

export { JUZ_BOUNDARIES };
