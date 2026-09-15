// تدرّج الدفعة: ربط الدفعة باللوحات يجعل الطالب المجتاز يظهر في البرنامج التالي تلقائياً.
//
// المنطق:
// 1) الدفعة تحمل ترتيب برامجها (programs) بترتيب الربط.
// 2) لكل طالب في الدفعة نعرف في أي برنامج سُجّل، وهل أتمّ خطته كاملة.
// 3) الطالب الذي أتمّ برنامجاً ينتقل إلى **البرنامج التالي في الترتيب** إن لم يكن فيه.
//    لا يُنقل إلى برامج أبعد، ولا يُنقل من برنامج لم يتمّه.
import { normalizeArabic } from '../../shared/text-utils.js';
import { CURRICULUM_LEVELS, CURRICULUM_STAGES } from '../../shared/curriculum-data.js';

const norm = name => normalizeArabic(name).replace(/\s+/g, ' ').trim();

const singleJuz = board => {
    const scope = board?.settings?.scope;
    return scope?.type === 'juz' && scope.juzNumbers?.length === 1 ? Number(scope.juzNumbers[0]) : null;
};

const curriculumRank = board => {
    const scope = board?.settings?.scope;
    const curriculum = scope?.type === 'curriculum' ? scope.curriculum : null;
    if (!curriculum) return null;
    const countryId = Number(curriculum.countryId);
    const systemId = Number(curriculum.systemId);
    const stageId = Number(curriculum.stageId);
    const levelId = Number(curriculum.levelId);
    const stages = CURRICULUM_STAGES.filter(stage => stage.countryId === countryId && stage.systemId === systemId);
    const stageIndex = stages.findIndex(stage => stage.stageId === stageId);
    const level = CURRICULUM_LEVELS.find(item => item.countryId === countryId
        && item.systemId === systemId && item.stageId === stageId && item.levelId === levelId);
    if (stageIndex < 0 || !level) return null;
    return stageIndex * 10000 + Number(level.levelNum) * 100 + Number(curriculum.termId || 0);
};

/**
 * ترتيب برامج الدفعة: ما سُجّل في الدفعة أولاً، ثم أي لوحة تحمل cohortId ولم تُسجَّل.
 * @param {Object} cohort
 * @param {Array<Object>} boards
 * @returns {Array<Object>} لوحات مرتبة
 */
export function orderedPrograms(cohort, boards = []) {
    const byId = new Map(boards.map(board => [String(board.id), board]));
    const seen = new Set();
    const ordered = [];

    for (const entry of cohort?.programs || []) {
        const board = byId.get(String(entry.boardId));
        if (board && !seen.has(board.id)) {
            seen.add(board.id);
            ordered.push(board);
        }
    }
    for (const board of boards) {
        if (String(board.settings?.cohortId || '') === String(cohort?.id) && !seen.has(board.id)) {
            seen.add(board.id);
            ordered.push(board);
        }
    }
    const linkOrder = new Map(ordered.map((board, index) => [String(board.id), index]));
    const curriculumRanks = ordered.map(curriculumRank);
    if (curriculumRanks.length && curriculumRanks.every(rank => rank !== null)) {
        const families = new Set(ordered.map(board => {
            const item = board.settings.scope.curriculum;
            return `${item.countryId}:${item.systemId}`;
        }));
        if (families.size === 1) {
            return [...ordered].sort((a, b) => curriculumRank(a) - curriculumRank(b)
                || linkOrder.get(String(a.id)) - linkOrder.get(String(b.id)));
        }
    }

    const juzNumbers = ordered.map(singleJuz);
    if (juzNumbers.length && juzNumbers.every(Number.isFinite)) {
        const secondDistinct = juzNumbers.find(number => number !== juzNumbers[0]);
        if (secondDistinct !== undefined) {
            const direction = secondDistinct > juzNumbers[0] ? 1 : -1;
            return [...ordered].sort((a, b) => (singleJuz(a) - singleJuz(b)) * direction
                || linkOrder.get(String(a.id)) - linkOrder.get(String(b.id)));
        }
    }

    // الخطط المختلطة أو المخصّصة تتبع ترتيب الربط الصريح كما اختاره المعلّم.
    return ordered;
}

/**
 * سجل الطالب في لوحة: بالارتباط أولاً ثم بالاسم الموحّد.
 * @returns {{studentId:string, data:Object}|null}
 */
export function findRecord(board, member) {
    const entries = Object.entries(board?.students || {});
    const byLink = entries.find(([, data]) => data?.cohortStudentId && String(data.cohortStudentId) === String(member.id));
    if (byLink) return { studentId: byLink[0], data: byLink[1] };
    const byName = entries.find(([, data]) => norm(data?.name) === norm(member.name));
    return byName ? { studentId: byName[0], data: byName[1] } : null;
}

/**
 * هل أتمّ الطالب خطة اللوحة كاملة؟
 */
export function hasCompleted(board, record) {
    if (!record) return false;
    const scope = board.orderedSurahs?.() || [];
    if (!scope.length) return false;
    const memorized = new Set(record.data?.memorized || []);
    return scope.every(n => memorized.has(n));
}

/**
 * خطة التدرّج: من ينقل وإلى أي برنامج.
 * @param {{cohort:Object, boards:Array<Object>}} input
 * @returns {{moves:Array<{boardId:string,boardName:string,currentCount:number,students:Array<Object>}>, total:number, programs:number}}
 */
export function planProgression({ cohort, boards = [] } = {}) {
    const programs = orderedPrograms(cohort, boards);
    const moves = [], visibility = [];

    for (const member of cohort?.listStudents?.() || []) {
        for (let index = 0; index < programs.length; index += 1) {
            const target = programs[index];
            if ((target.excludedCohortStudentIds || []).map(String).includes(String(member.id))) continue;
            const record = findRecord(target, member);
            const eligible = index === 0 || programs.slice(0, index).every(program => hasCompleted(program, findRecord(program, member)));
            const override = record?.data?.visibilityOverride;
            const hidden = override === 'shown' ? false : override === 'hidden' ? true : !eligible;
            if (!record) {
                let move = moves.find(item => item.boardId === target.id);
                if (!move) {
                    move = { boardId: target.id, boardName: target.settings?.name || 'برنامج', currentCount: Object.keys(target.students || {}).length, students: [] };
                    moves.push(move);
                }
                move.students.push({ cohortStudentId: member.id, name: member.name, hidden });
            } else if (Boolean(record.data.hidden) !== hidden || String(record.data.cohortStudentId || '') !== String(member.id)) {
                visibility.push({ boardId: target.id, studentId: record.studentId, cohortStudentId: member.id, hidden });
            }
        }
    }

    return { moves, visibility, total: moves.reduce((sum, move) => sum + move.students.length, 0) + visibility.length, programs: programs.length };
}

/**
 * تنفيذ الخطة عبر دالة الإضافة (تفصل المنطق عن قاعدة البيانات ليكون قابلاً للاختبار).
 * @param {ReturnType<typeof planProgression>} plan
 * @param {{addStudent:(boardId:string,name:string,count:number,extra?:Object)=>Promise<string>}} io
 */
export async function applyProgression(plan, { addStudent, setStudentVisibility } = {}) {
    let added = 0;
    const failed = [];
    for (const move of plan?.moves || []) {
        let count = move.currentCount;
        for (const student of move.students) {
            try {
                await addStudent(move.boardId, student.name, count, { cohortStudentId: student.cohortStudentId, hidden: student.hidden });
                count += 1;
                added += 1;
            } catch (error) {
                console.error('progression failed', student.name, error);
                failed.push(student.name);
            }
        }
    }
    let updated = 0;
    for (const change of plan?.visibility || []) {
        try {
            await setStudentVisibility(change.boardId, change.studentId, change.hidden, change.cohortStudentId);
            updated += 1;
        } catch (error) {
            console.error('visibility sync failed', change.studentId, error);
            failed.push(change.studentId);
        }
    }
    return { added, updated, failed };
}
