// إنجاز الفصل: متوسط نسب الطلاب والسورة الحالية المقترحة
export function computeClassProgress(board, students) {
    const scope = board.orderedSurahs();
    if (scope.length === 0 || students.length === 0) {
        return { progressPercentage: 0, currentSurah: null, isCompleted: false };
    }

    const avgProgress = students.reduce((sum, s) => sum + s.progress, 0) / students.length;
    const isCompleted = students.every(s => s.isCompleted);

    let currentSurah = null;
    if (board.settings.classCurrentSurah) {
        currentSurah = board.settings.classCurrentSurah;
    } else if (isCompleted) {
        currentSurah = null; // "تم الختم" — تُعرض في الواجهة
    } else {
        // السورة التالية بعد آخر سورة حفظها ٥٠٪ على الأقل من الطلاب (باتجاه الحفظ)
        const half = students.length / 2;
        let lastMasteredIdx = -1;
        scope.forEach((n, idx) => {
            const count = students.filter(s => s.memorized.includes(n)).length;
            if (count >= half) lastMasteredIdx = idx;
        });
        const nextIdx = lastMasteredIdx + 1;
        currentSurah = nextIdx < scope.length ? scope[nextIdx] : scope[scope.length - 1];
    }

    return {
        progressPercentage: Math.round(avgProgress),
        currentSurah,
        isCompleted,
    };
}
