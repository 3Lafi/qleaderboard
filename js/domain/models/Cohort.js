// الدفعة: قائمة طلاب تُسجَّل مرة واحدة باسمها ثم تُختار في البرامج.
// الدفعة هوية الطالب (الاسم)، واللوحة تبقى سجل الحفظ لكل برنامج على حدة.
import { LIMITS } from '../../shared/config.js';

export class Cohort {
    constructor(id, data = {}) {
        this.id = id;
        this.ownerUid = data.ownerUid || null;
        this.name = data.name || '';
        this.note = data.note || '';
        this.students = data.students || {};       // { studentId: { name, joinedAt } }
        this.programs = Array.isArray(data.programs) ? data.programs : []; // [{ boardId, linkedAt }] بترتيب الربط
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
    }

    studentsCount() {
        return Object.keys(this.students).length;
    }

    isFull() {
        return this.studentsCount() >= LIMITS.MAX_STUDENTS_PER_BOARD;
    }

    // أسماء الطلاب مرتبة عربياً مع معرّفاتهم
    listStudents() {
        return Object.entries(this.students)
            .map(([id, data]) => ({ id, name: data?.name || '', joinedAt: data?.joinedAt || null }))
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }

    hasStudentNamed(name) {
        const target = String(name || '').trim();
        return Object.values(this.students).some(student => String(student?.name || '').trim() === target);
    }
}

// وصف مختصر للدفعة: عدد الطلاب.
export function cohortSummaryText(cohort) {
    return `${cohort?.studentsCount?.() || 0} طالب`;
}
