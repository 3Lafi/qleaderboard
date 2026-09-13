import { Student } from '../models/Student.js';
import { rankStudents } from './RankStudents.js';
import { resolvePriorSurahs } from './PriorMemorization.js';

// Student pages inherit the board's public visibility; they do not create new access.
export function publicStudentProfile(board, studentId) {
    if (!board?.settings?.isPublic) return null;
    return buildStudentProfile(board, studentId);
}

export function ownerStudentProfile(board, studentId, ownerUid) {
    if (!ownerUid || board?.ownerUid !== ownerUid) return null;
    return buildStudentProfile(board, studentId);
}

function buildStudentProfile(board, studentId) {
    if (!Object.hasOwn(board.students || {}, studentId)) return null;
    const scope = board.orderedSurahs();
    const students = rankStudents(Object.entries(board.students).map(([id, data]) =>
        new Student(id, data, scope, resolvePriorSurahs(board, data))));
    const rank = students.findIndex(s => s.id === studentId) + 1;
    return { student: students[rank - 1], rank, students, boardName: board.settings.name };
}
