// ترتيب الطلاب: النسبة تنازلياً، ثم أسبق تاريخ إنجاز، ثم الاسم أبجدياً
export function rankStudents(students) {
    return [...students].sort((a, b) => {
        if (b.progress !== a.progress) return b.progress - a.progress;

        const aDate = a.isCompleted && a.completedDate ? toMillis(a.completedDate) : null;
        const bDate = b.isCompleted && b.completedDate ? toMillis(b.completedDate) : null;
        if (aDate !== null && bDate !== null && aDate !== bDate) return aDate - bDate;
        if (aDate !== null && bDate === null) return -1;
        if (bDate !== null && aDate === null) return 1;

        return a.name.localeCompare(b.name, 'ar');
    });
}

// ترتيب جدول المعلم: الطلاب الظاهرون أولاً، ثم المخفيون، وأبجدياً داخل كل مجموعة.
export function sortTrackingStudents(students) {
    return [...students].sort((a, b) => Number(a.hidden === true) - Number(b.hidden === true)
        || a.name.localeCompare(b.name, 'ar'));
}

function toMillis(ts) {
    if (!ts) return null;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d.getTime();
}
