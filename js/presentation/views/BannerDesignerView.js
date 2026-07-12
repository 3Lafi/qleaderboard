// مصمّم البانر: يُعرض عند إنشاء اللوحة فقط — التصميم يُختار مرة واحدة ولا يُعدَّل لاحقاً
// (صفحة الإعدادات لا تعرضه، وقواعد Firestore تمنع تغييره بعد الحفظ)
import { BANNER_THEMES, DEFAULT_THEME_ID, bannerTheme } from '../../core/banner-themes.js';
import { escapeHtml } from './ui.js';

// hostEl: عنصر الاستضافة؛ getTexts(): تعيد {name, schoolName, classLabel} الحالية من نموذج الصفحة
// تعيد {getThemeId, refreshPreview} — اربط refreshPreview بأحداث input لحقول النص
export function mountBannerDesigner(hostEl, getTexts) {
    let themeId = DEFAULT_THEME_ID;

    hostEl.innerHTML = `
        <label class="form-label">تصميم البانر</label>
        <p class="form-hint" style="margin-bottom:14px;">يظهر هذا التصميم أعلى اللوحة العامة وفي معاينة الرابط عند المشاركة (واتساب وغيره) — يُختار مرة واحدة عند الإنشاء ولا يمكن تعديله لاحقاً.</p>
        <div class="theme-grid" role="group" aria-label="لون البانر">
            ${BANNER_THEMES.map(t => `
                <button type="button" class="theme-swatch ${t.id === themeId ? 'selected' : ''}"
                    data-theme="${t.id}" style="--banner-gradient:${t.gradient};"
                    aria-pressed="${t.id === themeId}">${escapeHtml(t.name)}</button>
            `).join('')}
        </div>
        <header class="banner-preview" aria-hidden="true">
            <div class="header-icon"></div>
            <h1 class="banner-title"></h1>
            <div class="banner-separator"></div>
            <div class="banner-subtitle"></div>
        </header>
    `;

    const previewEl = hostEl.querySelector('.banner-preview');
    const titleEl = hostEl.querySelector('.banner-title');
    const separatorEl = hostEl.querySelector('.banner-separator');
    const subtitleEl = hostEl.querySelector('.banner-subtitle');

    function refreshPreview() {
        const { name, schoolName, classLabel } = getTexts();
        titleEl.textContent = name.trim() || 'اسم اللوحة';
        const subtitle = [schoolName, classLabel].map(s => s.trim()).filter(Boolean).join(' — ');
        subtitleEl.textContent = subtitle;
        separatorEl.style.display = subtitle ? '' : 'none';
        subtitleEl.style.display = subtitle ? '' : 'none';
        const theme = bannerTheme(themeId);
        previewEl.style.setProperty('--banner-gradient', theme.gradient);
        previewEl.style.setProperty('--banner-shadow', theme.shadow);
    }

    hostEl.querySelectorAll('.theme-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            themeId = btn.dataset.theme;
            hostEl.querySelectorAll('.theme-swatch').forEach(b => {
                b.classList.toggle('selected', b === btn);
                b.setAttribute('aria-pressed', String(b === btn));
            });
            refreshPreview();
        });
    });

    refreshPreview();

    return {
        getThemeId: () => themeId,
        refreshPreview,
    };
}
