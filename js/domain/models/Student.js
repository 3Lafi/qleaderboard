window.QuranApp = window.QuranApp || {};

window.QuranApp.Student = class Student {
    constructor({ name, surahsCount, progressPercentage, completedDate, memorizedSurahs, totalSurahs, curriculumType }) {
        this.name = name;
        this.surahsCount = surahsCount;
        this.progressPercentage = progressPercentage;
        this.completedDate = completedDate ? new Date(completedDate) : null;
        this.memorizedSurahs = memorizedSurahs || [];
        this.totalSurahs = totalSurahs;
        this.curriculumType = curriculumType;
    }
    get isCompleted() {
        return this.progressPercentage === 100;
    }

    get surahsTimeline() {
        const fullList = window.QuranApp.CONFIG.SURAHS_LIST[this.curriculumType] || [];
        
        if (fullList.length === 0) {
            if (!this.memorizedSurahs || this.memorizedSurahs.length === 0) return [];
            return this.memorizedSurahs.map(s => ({ name: s, state: 'memorized' }));
        }

        if (!this.memorizedSurahs || this.memorizedSurahs.length === 0) {
            return fullList.map(surahName => ({ name: surahName, state: 'pending' }));
        }

        // Remove "سورة " prefix if it exists to match the config array reliably
        const cleanSurahs = this.memorizedSurahs.map(s => s.replace('سورة ', '').trim());
        
        const memorizedIndices = cleanSurahs
            .map(s => fullList.indexOf(s))
            .filter(idx => idx !== -1);

        if (memorizedIndices.length === 0) {
            return fullList.map(surahName => ({ name: surahName, state: 'pending' }));
        }

        // استبعاد الفاتحة من حساب (أقل مؤشر) لكي لا تتلون جميع السور التي بين الفاتحة وآخر سورة حفظها الطالب باللون الأحمر
        const indicesWithoutFatiha = memorizedIndices.filter(idx => fullList[idx] !== "الفاتحة" && fullList[idx] !== "سورة الفاتحة");
        
        let minIndex = Infinity;
        let maxIndex = -Infinity;
        
        if (indicesWithoutFatiha.length > 0) {
            minIndex = Math.min(...indicesWithoutFatiha);
            maxIndex = Math.max(...indicesWithoutFatiha);
        }

        const timeline = [];
        for (let i = 0; i < fullList.length; i++) {
            const surahName = fullList[i];
            let state = 'pending';
            if (memorizedIndices.includes(i)) {
                state = 'memorized';
            } else if (i > minIndex && i < maxIndex && surahName !== "الفاتحة") {
                state = 'skipped';
            }
            timeline.push({ name: surahName, state: state });
        }
        
        return timeline;
    }

    get formattedSurahsCount() {
        return `${this.surahsCount} من ${this.totalSurahs} سورة`;
    }
};
