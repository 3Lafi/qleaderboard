window.QuranApp = window.QuranApp || {};

window.QuranApp.CurriculumRepository = class CurriculumRepository {
    constructor(apiSource) {
        this.api = apiSource;
    }

    async fetchCurriculum(curriculumType) {
        const rawData = await this.api.fetchCurriculum(curriculumType);
        if (!rawData) return null;
        
        const result = {};

        // If specific type, only process that type, otherwise process all available
        const typesToProcess = curriculumType ? [curriculumType] : Object.keys(window.QuranApp.CONFIG.TOTAL_SURAHS);

        for (const type of typesToProcess) {
            const studentsRaw = rawData[type] || [];
            const totalSurahs = window.QuranApp.CONFIG.TOTAL_SURAHS[type] || 0;

            result[type] = studentsRaw.map(s => {
                return new window.QuranApp.Student({
                    name: s.name,
                    surahsCount: s.surahs_count,
                    progressPercentage: s.progress_percentage,
                    completedDate: s.completed_date,
                    memorizedSurahs: s.memorized_surahs,
                    totalSurahs: totalSurahs,
                    curriculumType: type
                });
            });
        }

        return result;
    }
};
