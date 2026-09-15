import { Student } from '../models/Student.js';
import { rankStudents } from './RankStudents.js';
import { resolvePriorSurahs } from './PriorMemorization.js';

// Student pages inherit the board's public visibility; they do not create new access.
export function publicStudentProfile(board, studentId) {
    if (!board?.settings?.isPublic) return null;
    if (board?.students?.[studentId]?.hidden === true) return null;
    return buildStudentProfile(board, studentId, { excludeHidden: true });
}

export function ownerStudentProfile(board, studentId, ownerUid) {
    if (!ownerUid || board?.ownerUid !== ownerUid) return null;
    return buildStudentProfile(board, studentId);
}

function buildStudentProfile(board, studentId, { excludeHidden = false } = {}) {
    if (!Object.hasOwn(board.students || {}, studentId)) return null;
    const scope = board.orderedSurahs();
    const students = rankStudents(Object.entries(board.students).filter(([, data]) => !excludeHidden || data?.hidden !== true).map(([id, data]) =>
        new Student(id, data, scope, resolvePriorSurahs(board, data))));
    const student = students.find(s => s.id === studentId);
    if (!student) return null;
    const rank = student.rank ?? (students.findIndex(s => s.id === studentId) + 1);
    return { student, rank, students, boardName: board.settings.name };
}
