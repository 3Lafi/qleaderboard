document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Dependencies
    const api = new window.QuranApp.GoogleSheetsApi();
    const repository = new window.QuranApp.CurriculumRepository(api);
    const getCurriculumDataUseCase = new window.QuranApp.GetCurriculumData(repository);
    
    const view = new window.QuranApp.DashboardView();
    
    // 2. Initialize Controller
    const controller = new window.QuranApp.DashboardController(getCurriculumDataUseCase, view);
    
    // Determine which page this is based on a data attribute on the body tag
    const targetCurriculum = document.body.getAttribute('data-curriculum-type');
    
    if (targetCurriculum) {
        controller.init(targetCurriculum);
    }
});
