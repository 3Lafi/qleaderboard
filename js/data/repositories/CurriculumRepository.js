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
        
        const normalize = (str) => str ? str.replace(/[\u064B-\u065F]/g, "").trim().replace(/\s+/g, " ") : "";

        for (const type of typesToProcess) {
            // Find the best matching key in rawData by normalizing both
            const normalizedTarget = normalize(type);
            const actualKey = Object.keys(rawData).find(key => normalize(key) === normalizedTarget) || type;
            
            const studentsRaw = rawData[actualKey] || [];
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
