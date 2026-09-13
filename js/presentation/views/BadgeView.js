import { uiIcon } from './InterfaceIcons.js';
import { BADGE_LEVELS } from '../../domain/usecases/Badges.js';
import { surahName } from '../../shared/quran-data.js';
import { escapeHtml } from './ui.js';

// Compensate for the transparent padding in the original juz calligraphy.
// Keep the visible ink inside 52% of the frame, at a maximum canvas width of 85%.
const JUZ_CALLIGRAPHY_WIDTHS = [85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 81.2, 85, 80.2, 85, 80.0, 72.9, 78.8, 85, 85, 85, 62.1, 67.1, 60.2, 72.0, 64.0, 59.2, 59.4, 64.9, 65.3, 85];

export function badgeArt(badge, { decorative = false, eager = false } = {}) {
    // The Quran artwork already includes the original circular calligraphy.
    // Render it once, without the separate label used by juz and surah badges.
    if (badge.type === 'quran') {
        return `<span class="badge-art badge-art-quran" ${decorative ? 'aria-hidden="true"' : `role="img" aria-label="${escapeHtml(badge.name)}"`}>
            <img class="badge-frame" src="/images/badges-assets/frames/quran-botanical-v10.webp" alt="" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} width="1024" height="1024">
        </span>`;
    }
    return `<span class="badge-art badge-art-${badge.type}" ${decorative ? 'aria-hidden="true"' : `role="img" aria-label="${escapeHtml(badge.name)}"`}>
        <img class="badge-frame" src="/images/badges-assets/frames/${badge.type}-soft-v5.png" alt="" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} width="1254" height="1254">
        ${badge.labelArt ? `<img class="badge-kind-label" src="${badge.labelArt}" alt="" ${eager ? '' : 'loading="lazy"'} width="512" height="160">` : ''}
        <img class="badge-calligraphy" style="--calligraphy-width: ${badge.type === 'juz' ? JUZ_CALLIGRAPHY_WIDTHS[badge.number - 1] : 85}%" src="${badge.art}" alt="" ${eager ? '' : 'loading="lazy"'} width="512" height="160">
    </span>`;
}

export function badgeCard(badge, { catalog = false } = {}) {
    return `<button class="achievement-card achievement-card-${badge.type} ${!catalog && !badge.earned ? 'is-locked' : ''}" data-badge="${badge.id}" aria-label="${escapeHtml(badge.name)}، ${catalog ? 'عرض تفاصيل الوسام' : badge.earned ? 'وسام مكتسب' : 'لم يُكتسب بعد'}">
        <span class="achievement-tier">${BADGE_LEVELS[badge.type].tier}<span class="achievement-number">${String(badge.number).padStart(2, '0')}</span></span>
        ${badgeArt(badge, { decorative: true })}
        <span class="achievement-title">${escapeHtml(badge.name)}</span>
        <span class="achievement-caption">${catalog ? (badge.type === 'surah' ? 'خطوة في رحلة النور' : badge.type === 'juz' ? 'إنجاز يستحق الاحتفاء' : 'أسمى أوسمة الحفظ') : badge.earned ? 'تم اكتساب الوسام' : `${badge.completed} من ${badge.total} سورة`}</span>
        <span class="achievement-status ${catalog ? 'catalog-status' : badge.earned ? 'earned-status' : ''}">${catalog ? 'اكتشف الوسام' : badge.earned ? 'مكتسب' : 'قيد الإنجاز'}</span>
    </button>`;
}

export function showBadgeDetails(badge, { catalog = false, signal } = {}) {
    if (signal?.aborted) return;
    const prior = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = `badge-dialog badge-dialog-${badge.type}`;
    dialog.setAttribute('aria-labelledby', 'badge-detail-title');
    const requirements = badge.type === 'quran' ? 'يُمنح عند تسجيل حفظ سور القرآن الكريم الـ 114 كاملة.'
        : badge.type === 'surah' ? `يُمنح عند تسجيل حفظ ${badge.name} كاملة.`
        : 'يُمنح عند تسجيل حفظ جميع السور التي تغطي هذا الجزء، بما فيها السور المشتركة مع الأجزاء المجاورة.';
    dialog.innerHTML = `<button class="dialog-close" aria-label="إغلاق التفاصيل">${uiIcon('x')}</button>
        <span class="eyebrow">${BADGE_LEVELS[badge.type].tier}</span>
        ${badgeArt(badge, { decorative: true, eager: true })}
        <h2 id="badge-detail-title">${escapeHtml(badge.name)}</h2>
        <span class="achievement-status ${!catalog && badge.earned ? 'earned-status' : ''}">${catalog ? 'من مجموعة أوسمة وسام' : badge.earned ? 'مبارك لك هذا الإنجاز' : 'خطوتك القادمة'}</span>
        <p>${escapeHtml(requirements)}</p>
        ${!catalog ? `<p class="badge-detail-progress">${badge.completed} من ${badge.total} سورة مكتملة</p><progress value="${badge.completed}" max="${badge.total}" aria-label="السور المكتملة"></progress>` : ''}
        ${badge.type === 'juz' ? `<div class="badge-required-surahs">${badge.requiredSurahs.map(n => `<span>${escapeHtml(surahName(n))}</span>`).join('')}</div><p class="form-hint">التسجيل بالسورة الكاملة؛ لا يُحتسب حفظ جزء من سورة بشكل منفصل.</p>` : ''}
        <button class="btn btn-primary dialog-done">${catalog ? 'رائع، فهمت' : 'متابعة الرحلة'}</button>`;
    document.body.appendChild(dialog);
    const close = () => { dialog.close(); dialog.remove(); };
    signal?.addEventListener('abort', close, { once: true });
    dialog.querySelector('.dialog-close').onclick = close;
    dialog.querySelector('.dialog-done').onclick = close;
    dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } });
    dialog.addEventListener('close', () => { signal?.removeEventListener('abort', close); dialog.remove(); if(prior?.isConnected) prior.focus(); }, { once: true });
    dialog.showModal();
}

export function bindBadgeDetails(host, badges, options = {}) {
    host.querySelectorAll('[data-badge]').forEach(button => {
        button.addEventListener('click', () => {
            const badge = badges.find(b => b.id === button.dataset.badge);
            if (badge) showBadgeDetails(badge, options);
        });
    });
}
