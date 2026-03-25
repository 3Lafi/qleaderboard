window.QuranApp = window.QuranApp || {};

window.QuranApp.DashboardView = class DashboardView {
    constructor() {
        this.grid = document.getElementById('studentsGrid');
        this.skeleton = document.getElementById('skeletonLoader');
        this.errorMsg = document.getElementById('error-msg');
    }

    showLoader() {
        this.skeleton.style.display = 'grid';
        this.grid.innerHTML = '';
        this.errorMsg.style.display = 'none';
    }

    hideLoader() {
        this.skeleton.style.display = 'none';
        const hSkeleton = document.getElementById('classProgressContainer');
        if (hSkeleton && hSkeleton.querySelector('.skeleton-pulse')) {
             hSkeleton.style.display = 'none'; // Will be shown in renderClassProgress
        }
    }

    showError() {
        this.hideLoader();
        this.errorMsg.style.display = 'block';
    }

    renderStudents(students) {
        this.hideLoader();
        this.grid.innerHTML = '';
        
        if (!students || students.length === 0) {
            this.grid.innerHTML = '<p style="text-align:center; width:100%; font-size:1.2rem; font-weight:bold;">لا توجد بيانات لهذا المنهج حتى الآن.</p>';
            return;
        }

        students.forEach((student, index) => {
            const cardView = new window.QuranApp.StudentCardView(student, index);
            this.grid.appendChild(cardView.render());
        });
    }

    renderClassProgress(classStudent) {
        const header = document.querySelector('header');
        if (!header) return;

        // حساب السورة الحالية: السورة المطلوبة هي السورة التي التّي تلي آخر سورة تم الإنتهاء منها (باتجاه الأعلى)
        let calculatedCurrentSurah = 'لم تُحدد بعد';
        const fullList = classStudent.curriculumType && window.QuranApp.CONFIG.SURAHS_LIST[classStudent.curriculumType] 
                            ? window.QuranApp.CONFIG.SURAHS_LIST[classStudent.curriculumType] 
                            : [];

        if (classStudent.memorizedSurahs && classStudent.memorizedSurahs.length > 0 && fullList.length > 0) {
            const withoutFatiha = classStudent.memorizedSurahs.filter(s => s !== "الفاتحة" && s !== "سورة الفاتحة");
            
            if (withoutFatiha.length > 0) {
                // أول سورة في المصفوفة (يسار الشيت) هي أحدث سورة انتهى منها الطالب
                const lastMemorized = withoutFatiha[0];
                const lastIdx = fullList.indexOf(lastMemorized.replace('سورة ', '').trim());
                
                if (lastIdx > 0) {
                    calculatedCurrentSurah = fullList[lastIdx - 1]; // السورة التالية للحفظ (باتجاه البداية)
                } else if (lastIdx === 0) {
                    calculatedCurrentSurah = 'تم الختم 🏆';
                } else {
                    calculatedCurrentSurah = lastMemorized;
                }
            } else {
                // إذا لم يحفظ سوى الفاتحة نفترض البداية من آخر سورة
                calculatedCurrentSurah = fullList[fullList.length - 1]; 
            }
        } else if (fullList.length > 0) {
            // لم يبدأ الحفظ بعد
            calculatedCurrentSurah = fullList[fullList.length - 1];
        }

        // الأولولية للسورة المكتوبة يدوياً في الشيت (مثل: إنجاز الفصل - سورة الفجر)
        let currentSurah = classStudent.customCurrentSurah || calculatedCurrentSurah;

        // عرض المؤشر المدمج في الهيدر
        const container = document.getElementById('classProgressContainer');
        if (!container) return;

        const hasProgress = classStudent.progressPercentage > 0;
        
        container.style.display = 'flex'; // إظهار الحاوية
        
        if (hasProgress) {
            container.classList.remove('no-bar');
            container.innerHTML = `
                <div class="m-progress-bar-container">
                    <div class="m-progress-bar-fill" data-target-width="${classStudent.progressPercentage}%"></div>
                </div>
                
                <div class="m-progress-header">
                    <div class="m-progress-surah">السورة الحالية: ${currentSurah}</div>
                    <div class="m-progress-percentage">${classStudent.progressPercentage}%</div>
                </div>
            `;
        } else {
            container.classList.add('no-bar');
            container.innerHTML = `
                <div class="m-progress-header">
                    <div class="m-progress-surah">السورة الحالية: ${currentSurah}</div>
                    <!-- إخفاء النسبة إذا كانت صفراً في البرامج الثانوية -->
                </div>
            `;
        }

        // إخفاء الحاوية القديمة الفارغة إذا وجدت
        const oldContainer = document.getElementById('classProgressBanner');
        if (oldContainer) oldContainer.style.display = 'none';

        setTimeout(() => {
            const progressBar = container.querySelector('.m-progress-bar-fill');
            if(progressBar) {
                progressBar.style.width = progressBar.getAttribute('data-target-width');
            }
        }, 150);
    }
};
