window.QuranApp = window.QuranApp || {};

window.QuranApp.StudentCardView = class StudentCardView {
    constructor(student, index) {
        this.student = student;
        this.index = index;
    }

    render() {
        const isCompleted = this.student.isCompleted;
        const cardClasses = isCompleted ? 'card gold-card' : 'card';
        
        let surahsHtml;
        const timeline = this.student.surahsTimeline || [];
        if (timeline.length > 0) {
            const tags = timeline
                .map(s => {
                    const tagClass = `surah-tag tag-${s.state}`;
                    return `<span class="${tagClass}">${s.name}</span>`;
                })
                .join('');
            surahsHtml = `<div class="tags-container">${tags}</div>`;
        } else {
            surahsHtml = '<span style="color:var(--meta-text); font-size:0.9rem; font-weight:bold;">لا توجد خطة منهج مسجلة</span>';
        }

        const crownIcon = isCompleted ? '<div class="crown-icon">👑</div>' : '';

        const card = document.createElement('div');
        card.className = cardClasses;
        
        card.innerHTML = `
            ${crownIcon}
            <div class="student-name">${this.student.name}</div>
            <div class="progress-container">
                <div class="progress-bar" style="width: 0%" data-target-width="${this.student.progressPercentage}%"></div>
            </div>
            <div class="stats">
                <span class="surah-count-badge">${this.student.formattedSurahsCount}</span>
                <span class="percentage-badge">${this.student.progressPercentage}%</span>
            </div>
            <button id="btn-${this.index}" class="details-btn">
                عرض السور
            </button>
            <div id="details-${this.index}" class="surahs-list">${surahsHtml}</div>
        `;

        // Event listeners
        const btn = card.querySelector(`#btn-${this.index}`);
        const details = card.querySelector(`#details-${this.index}`);
        
        btn.addEventListener('click', () => {
            if (details.style.display === "block") {
                details.style.display = "none";
                btn.innerText = "عرض السور";
            } else {
                details.style.display = "block";
                btn.innerText = "إخفاء السور";
            }
        });

        // Trigger progress bar animation after brief delay
        setTimeout(() => {
            const progressBar = card.querySelector('.progress-bar');
            if(progressBar) {
                progressBar.style.width = progressBar.getAttribute('data-target-width');
            }
        }, 100);

        return card;
    }
};
