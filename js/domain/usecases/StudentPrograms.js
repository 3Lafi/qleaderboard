// برامج الطالب: تجميع ما حفظه الطالب في كل البرامج المرتبطة بعضو الدفعة نفسه.
// هذا ما يجعل حفظ سورة في برنامجٍ ما ينعكس على صفحة الطالب في جميع البرامج.
import { Student } from '../models/Student.js';
import { rankStudents } from './RankStudents.js';
import { resolvePriorSurahs } from './PriorMemorization.js';

/**
 * كل برامج (لوحات) المعلم التي فيها سجل طالب مرتبط بعضو الدفعة.
 * @param {Array<Object>} boards لوحات المعلم
 * @param {string} cohortStudentId معرّف الطالب في الدفعة
 * @returns {Array<Object>}
 */
export function findStudentPrograms(boards = [], cohortStudentId = '') {
    const id = String(cohortStudentId || '');
    if (!id) return [];
    return boards
        .map(board => {
            const entry = Object.entries(board.students || {}).find(([, data]) => String(data?.cohortStudentId || '') === id);
            if (!entry) return null;
            const [studentId, data] = entry;
            const scope = board.orderedSurahs();
            const student = new Student(studentId, data, scope, resolvePriorSurahs(board, data));
            return {
                boardId: board.id,
                boardName: board.settings?.name || 'برنامج بدون اسم',
                isPublic: board.settings?.isPublic !== false,
                cohortId: board.settings?.cohortId || '',
                studentId,
                name: data.name,
                memorized: data.memorized || [],
                memorizedInScope: student.memorizedInScope,
                scopeSize: student.totalSurahsInScope,
                progress: student.progressPercentage,
                completed: student.isCompleted,
                scope,
            };
        })
        .filter(Boolean);
}

/**
 * اتحاد ما حفظه الطالب في كل برامجه (مع حفظ البرنامج الحالي لسجلاته).
 * @param {Array<Object>} programs
 * @returns {number[]}
 */
export function unionMemorized(programs = []) {
    const set = new Set();
    programs.forEach(program => (program.memorized || []).forEach(n => {
        if (Number.isInteger(n) && n >= 1 && n <= 114) set.add(n);
    }));
    return [...set].sort((a, b) => a - b);
}

/**
 * سور الأوسمة للطالب عبر كل برامجه: أوسع اتحاد ممكن + المحتسب التلقائي من كل برنامج.
 * @param {Array<Object>} boards لوحات المعلم
 * @param {string} cohortStudentId
 * @returns {number[]}
 */
export function badgeSurahsAcrossPrograms(boards = [], cohortStudentId = '') {
    const set = new Set();
    const id = String(cohortStudentId || '');
    if (!id) return [];

    for (const board of boards) {
        const entry = Object.entries(board.students || {}).find(([, data]) => String(data?.cohortStudentId || '') === id);
        if (!entry) continue;
        const [, data] = entry;
        (data.memorized || []).forEach(n => Number.isInteger(n) && n >= 1 && n <= 114 && set.add(n));
        resolvePriorSurahs(board, data).forEach(n => set.add(n));
    }
    return [...set].sort((a, b) => a - b);
}

/**
 * ترتيب الطالب داخل برنامجه (للعرض في بطاقة البرنامج).
 * @param {Object} program
 * @returns {{rank:number,total:number}}
 */
export function programRank(program) {
    return { rank: program?.rank || 0, total: program?.scopeSize || 0 };
}

export { rankStudents };
