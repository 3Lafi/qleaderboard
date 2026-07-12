// بطاقة طالب واحد في اللوحة العامة: شريط تقدم، شارات، خط زمني للسور
import { escapeHtml } from './ui.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export function renderStudentCard(student, rank) {
    const isCompleted = student.isCompleted;
    const cardClasses = isCompleted ? 'card gold-card' : 'card';

    const timeline = student.surahsTimeline || [];
    let surahsHtml;
    if (timeline.length > 0) {
        const tags = timeline
            .map(s => `<span class="surah-tag tag-${s.state}">${escapeHtml(s.name)}</span>`)
            .join('');
        surahsHtml = `<div class="tags-container">${tags}</div>`;
    } else {
        surahsHtml = '<span style="color:var(--meta-text); font-size:0.9rem; font-weight:bold;">لا توجد خطة منهج مسجلة</span>';
    }

    const crownIcon = isCompleted ? '<div class="crown-icon">👑</div>' : '';
    const rankBadge = rank <= 3
        ? `<div class="rank-badge rank-medal">${MEDALS[rank - 1]}</div>`
        : `<div class="rank-badge">${rank}</div>`;

    const card = document.createElement('div');
    card.className = cardClasses;
    const detailsId = `details-${student.id}`;
    const btnId = `btn-${student.id}`;

    card.innerHTML = `
        ${crownIcon}
        ${rankBadge}
        <div class="student-name">${escapeHtml(student.name)}</div>
        <div class="progress-container">
            <div class="progress-bar" style="width: 0%" data-target-width="${student.progressPercentage}%"></div>
        </div>
        <div class="stats">
            <span class="surah-count-badge">${student.formattedSurahsCount}</span>
            <span class="percentage-badge">${student.progressPercentage}%</span>
        </div>
        <button id="${btnId}" class="details-btn" aria-expanded="false" aria-controls="${detailsId}">عرض السور</button>
        <div id="${detailsId}" class="surahs-list">${surahsHtml}</div>
    `;

    const btn = card.querySelector(`#${btnId}`);
    const details = card.querySelector(`#${detailsId}`);
    btn.addEventListener('click', () => {
        const isOpen = details.style.display === 'block';
        details.style.display = isOpen ? 'none' : 'block';
        btn.textContent = isOpen ? 'عرض السور' : 'إخفاء السور';
        btn.setAttribute('aria-expanded', String(!isOpen));
    });

    requestAnimationFrame(() => {
        setTimeout(() => {
            const bar = card.querySelector('.progress-bar');
            if (bar) bar.style.width = bar.getAttribute('data-target-width');
        }, 100);
    });

    return card;
}
