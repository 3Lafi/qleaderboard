window.QuranApp = window.QuranApp || {};

window.QuranApp.DashboardController = class DashboardController {
    constructor(getCurriculumDataUseCase, dashboardView) {
        this.getCurriculumData = getCurriculumDataUseCase;
        this.view = dashboardView;
    }

    async init(curriculumType) {
        this.view.showLoader();

        try {
            const result = await this.getCurriculumData.execute(curriculumType);
            this.view.renderStudents(result.students);
            
            if (result.classProgress && this.view.renderClassProgress) {
                this.view.renderClassProgress(result.classProgress);
            }
        } catch (error) {
            console.error(error);
            this.view.showError();
        }
    }
};
