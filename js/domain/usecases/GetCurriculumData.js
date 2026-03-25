window.QuranApp = window.QuranApp || {};

window.QuranApp.GetCurriculumData = class GetCurriculumData {
    constructor(repository) {
        this.repository = repository;
    }

    async execute(curriculumType) {
        const parsedData = await this.repository.fetchCurriculum(curriculumType);
        const allStudents = parsedData[curriculumType] || [];
        
        let classProgress = null;
        const students = allStudents.filter(student => {
            if (student.name.includes('إنجاز الفصل') || student.name.includes('تقدم الفصل') || student.name === 'المنهج' || student.name.includes('المنهج -')) {
                classProgress = student;
                
                // Allow the teacher to set the current Surah manually via the name e.g "إنجاز الفصل - سورة الفجر"
                if (student.name.includes('-')) {
                    classProgress.customCurrentSurah = student.name.split('-')[1].trim();
                }
                
                return false;
            }
            return true;
        });
        
        const sortedStudents = students.sort((a, b) => {
            const diff = b.progressPercentage - a.progressPercentage;
            if (diff !== 0) return diff;

            if (a.isCompleted && b.isCompleted) {
                const dateA = a.completedDate ? a.completedDate.getTime() : Infinity;
                const dateB = b.completedDate ? b.completedDate.getTime() : Infinity;
                return dateA - dateB;
            }
            return 0;
        });

        return { students: sortedStudents, classProgress };
    }
};
