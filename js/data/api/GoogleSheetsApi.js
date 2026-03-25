window.QuranApp = window.QuranApp || {};

window.QuranApp.GoogleSheetsApi = class GoogleSheetsApi {
    async fetchCurriculum(curriculumType) {
        try {
            // Add parameter to fetch exactly what we need, making the API response much faster
            let url = window.QuranApp.CONFIG.API_URL;
            url += url.includes('?') ? '&' : '?';
            
            if (curriculumType) {
                url += `type=${encodeURIComponent(curriculumType)}&`;
            }
            
            // Bypass browser caching completely
            url += `t=${new Date().getTime()}`;


            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const json = await response.json();
            
            if (json.status !== "success") {
                throw new Error("Failed to fetch from Google Sheets Api");
            }

            return json.data;
        } catch (error) {
            console.error("API Fetch Error:", error);
            throw error;
        }
    }
};
