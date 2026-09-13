// مصمّم البانر: يُتيح اختيار وتعديل لون وهوية اللوحة في أي وقت
import { BANNER_THEMES, DEFAULT_THEME_ID, bannerTheme } from '../../shared/banner-themes.js';
import { escapeHtml } from './ui.js';

// hostEl: عنصر الاستضافة؛ getTexts(): تعيد {name, schoolName, classLabel} الحالية من نموذج الصفحة
// تعيد {getThemeId, refreshPreview} — اربط refreshPreview بأحداث input لحقول النص
export function mountBannerDesigner(hostEl, getTexts, { initialThemeId = DEFAULT_THEME_ID, locked = false, previewHost = hostEl, onChange = () => {} } = {}) {
    let themeId = initialThemeId;

    hostEl.innerHTML = `
        <h3 class="setup-field-title">لون اللوحة</h3>
        <p class="form-hint">اختر اللون الذي يناسب حلقتك. يظهر في أعلى اللوحة ورابط المشاركة، ويمكنك تغييره في أي وقت.</p>
        <div class="theme-grid" role="group" aria-label="لون البانر">
            ${BANNER_THEMES.map(t => `
                <button type="button" class="theme-swatch ${t.id === themeId ? 'selected' : ''}"
                    data-theme="${t.id}" style="--banner-gradient:${t.gradient};"
                    aria-pressed="${t.id === themeId}">${escapeHtml(t.name)}</button>
            `).join('')}
        </div>`;
    const preview = document.createElement('div');
    preview.innerHTML = `
        <header class="banner-preview" aria-hidden="true">
            <h2 class="banner-title"></h2>
            <div class="banner-separator"></div>
            <div class="banner-subtitle"></div>
        </header>
    `;

    previewHost.appendChild(preview.firstElementChild);
    const previewEl = previewHost.querySelector('.banner-preview');
    const titleEl = previewEl.querySelector('.banner-title');
    const separatorEl = previewEl.querySelector('.banner-separator');
    const subtitleEl = previewEl.querySelector('.banner-subtitle');

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
            onChange();
        });
    });

    refreshPreview();

    return {
        getThemeId: () => themeId,
        refreshPreview,
    };
}
