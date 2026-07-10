// شريط إنجاز الفصل المدمج في الهيدر
import { computeClassProgress } from '../../domain/usecases/ClassProgress.js';
import { surahName } from '../../core/quran-data.js';
import { escapeHtml } from './ui.js';

export function renderClassProgress(board, students) {
    const container = document.getElementById('classProgressContainer');
    if (!container) return;

    if (!board.settings.showClassProgress || students.length === 0) {
        container.style.display = 'none';
        return;
    }

    const { progressPercentage, currentSurah, isCompleted } = computeClassProgress(board, students);
    const currentSurahLabel = isCompleted
        ? 'تم الختم 🏆'
        : (currentSurah != null ? surahName(currentSurah) : 'لم تُحدد بعد');

    container.style.display = 'flex';
    const hasProgress = progressPercentage > 0;

    if (hasProgress) {
        container.classList.remove('no-bar');
        container.innerHTML = `
            <div class="m-progress-bar-container">
                <div class="m-progress-bar-fill" data-target-width="${progressPercentage}%"></div>
            </div>
            <div class="m-progress-header">
                <div class="m-progress-surah">السورة الحالية: ${escapeHtml(currentSurahLabel)}</div>
                <div class="m-progress-percentage">${progressPercentage}%</div>
            </div>
        `;
    } else {
        container.classList.add('no-bar');
        container.innerHTML = `
            <div class="m-progress-header">
                <div class="m-progress-surah">السورة الحالية: ${escapeHtml(currentSurahLabel)}</div>
            </div>
        `;
    }

    requestAnimationFrame(() => {
        setTimeout(() => {
            const bar = container.querySelector('.m-progress-bar-fill');
            if (bar) bar.style.width = bar.getAttribute('data-target-width');
        }, 150);
    });
}
