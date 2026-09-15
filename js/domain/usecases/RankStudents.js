// ترتيب الطلاب: النسبة تنازلياً، ثم أسبق تاريخ إنجاز (باليوم التقويمي)، ثم الاسم أبجدياً
export function rankStudents(students) {
    const sorted = [...students].sort((a, b) => {
        if (b.progress !== a.progress) return b.progress - a.progress;

        const aDay = a.isCompleted && a.completedDate ? toDayKey(a.completedDate) : null;
        const bDay = b.isCompleted && b.completedDate ? toDayKey(b.completedDate) : null;
        if (aDay !== null && bDay !== null && aDay !== bDay) return aDay.localeCompare(bDay);
        if (aDay !== null && bDay === null) return -1;
        if (bDay !== null && aDay === null) return 1;

        return a.name.localeCompare(b.name, 'ar');
    });

    let currentRank = 1;
    sorted.forEach((student, index) => {
        if (index > 0) {
            const prev = sorted[index - 1];
            if (!isSameRankTier(student, prev)) {
                currentRank++;
            }
        }
        student.rank = currentRank;
    });

    return sorted;
}

function isSameRankTier(a, b) {
    if (a.progress !== b.progress) return false;
    if (a.isCompleted !== b.isCompleted) return false;
    if (a.isCompleted) {
        const aDay = toDayKey(a.completedDate);
        const bDay = toDayKey(b.completedDate);
        return aDay === bDay;
    }
    return true;
}

// ترتيب جدول المعلم: الطلاب الظاهرون أولاً، ثم المخفيون، وأبجدياً داخل كل مجموعة.
export function sortTrackingStudents(students) {
    return [...students].sort((a, b) => Number(a.hidden === true) - Number(b.hidden === true)
        || a.name.localeCompare(b.name, 'ar'));
}

export function toDayKey(ts) {
    if (!ts) return null;
    if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ts)) {
        return ts;
    }
    let d = null;
    if (typeof ts.toDate === 'function') {
        d = ts.toDate();
    } else if (typeof ts.toMillis === 'function') {
        d = new Date(ts.toMillis());
    } else if (typeof ts.seconds === 'number') {
        d = new Date(ts.seconds * 1000);
    } else if (ts instanceof Date) {
        d = ts;
    } else {
        d = new Date(ts);
    }
    if (!d || Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
