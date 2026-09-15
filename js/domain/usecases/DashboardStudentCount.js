// عدّاد لوحة التحكم: طالب الدفعة يُحسب مرة واحدة مهما تكرر في برامجها.
import { normalizeArabic } from '../../shared/text-utils.js';

const norm = value => normalizeArabic(value).replace(/\s+/g, ' ').trim();
const activeStudents = board => Object.values(board?.students || {}).filter(student => !student?.removed);

function linkedCohort(board, cohorts) {
    const id = String(board?.settings?.cohortId || '');
    return id ? cohorts.find(cohort => String(cohort?.id) === id) || null : null;
}

function isMember(student, cohort) {
    const members = cohort?.students || {};
    if (student?.cohortStudentId) return Object.hasOwn(members, String(student.cohortStudentId));
    const names = new Set(Object.values(members).map(member => norm(member?.name)).filter(Boolean));
    return names.has(norm(student?.name));
}

function extraStudents(board, cohort) {
    return activeStudents(board).filter(student => !cohort || !isMember(student, cohort));
}

// يظهر على بطاقة اللوحة: جميع أعضاء الدفعة، بالإضافة إلى الطلاب المنفردين في اللوحة.
export function boardStudentCount(board, cohorts = []) {
    const cohort = linkedCohort(board, cohorts);
    return (cohort?.studentsCount?.() || 0) + extraStudents(board, cohort).length;
}

// يظهر في ملخص لوحة التحكم: لا يكرر طالب الدفعة عند وجود عدة برامج لها.
export function dashboardStudentCount(boards = [], cohorts = []) {
    const usedCohorts = new Map();
    let extras = 0;
    for (const board of boards) {
        const cohort = linkedCohort(board, cohorts);
        if (cohort) usedCohorts.set(String(cohort.id), cohort);
        extras += extraStudents(board, cohort).length;
    }
    return [...usedCohorts.values()].reduce((total, cohort) => total + cohort.studentsCount(), 0) + extras;
}
