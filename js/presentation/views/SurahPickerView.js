// شبكة شرائح قابلة لإعادة الاستخدام: اختيار نطاق (سور/أجزاء) أو تحديد الحفظ لطالب
import { SURAHS, JUZ_WITH_SURAHS, surahsInJuz, surahAyahs } from '../../core/quran-data.js';
import { escapeHtml } from './ui.js';

// وضع اختيار السور المخصصة (114 شريحة برقم السورة)
export function renderSurahChipGrid({ selected = new Set(), onToggle }) {
    const html = SURAHS.map(s => `
        <button type="button" class="chip ${selected.has(s.n) ? 'chip-selected' : ''}" data-n="${s.n}">
            <span>${escapeHtml(s.name)}</span>
            <span class="chip-ayahs">${s.ayahs} آية</span>
        </button>`).join('');

    const wrap = document.createElement('div');
    wrap.className = 'chip-grid';
    wrap.innerHTML = html;
    wrap.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const n = Number(chip.dataset.n);
            const nowSelected = !chip.classList.contains('chip-selected');
            chip.classList.toggle('chip-selected', nowSelected);
            onToggle(n, nowSelected);
        });
    });
    return wrap;
}

// وضع اختيار الأجزاء (30 شريحة، تعطيل الأجزاء التي لا تبدأ فيها سورة)
export function renderJuzChipGrid({ selected = new Set(), onToggle }) {
    const html = Array.from({ length: 30 }, (_, i) => i + 1).map(j => {
        const hasSurahs = JUZ_WITH_SURAHS.includes(j);
        const count = hasSurahs ? surahsInJuz(j).length : 0;
        return `
            <button type="button" class="chip ${selected.has(j) ? 'chip-selected' : ''} ${hasSurahs ? '' : 'chip-disabled'}"
                data-j="${j}" ${hasSurahs ? '' : 'disabled title="لا تبدأ فيه سورة كاملة"'}>
                <span>الجزء ${j}</span>
                <span class="chip-ayahs">${hasSurahs ? count + ' سورة' : '—'}</span>
            </button>`;
    }).join('');

    const wrap = document.createElement('div');
    wrap.className = 'chip-grid';
    wrap.innerHTML = html;
    wrap.querySelectorAll('.chip:not(.chip-disabled)').forEach(chip => {
        chip.addEventListener('click', () => {
            const j = Number(chip.dataset.j);
            const nowSelected = !chip.classList.contains('chip-selected');
            chip.classList.toggle('chip-selected', nowSelected);
            onToggle(j, nowSelected);
        });
    });
    return wrap;
}

// وضع تسجيل حفظ الطالب: شرائح مرتبة حسب اتجاه الحفظ، حالة memorized بدل selected
export function renderMemorizationChipGrid({ orderedSurahs, memorizedSet, onToggle, disabled = false }) {
    const wrap = document.createElement('div');
    wrap.className = 'chip-grid';
    wrap.innerHTML = orderedSurahs.map(n => `
        <button type="button" class="chip ${memorizedSet.has(n) ? 'chip-memorized' : ''}" data-n="${n}" ${disabled ? 'disabled' : ''}>
            <span>${escapeHtml(SURAHS[n - 1].name)}</span>
            <span class="chip-ayahs">${surahAyahs(n)} آية</span>
        </button>`).join('');

    wrap.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', async () => {
            const n = Number(chip.dataset.n);
            const nowMemorized = !chip.classList.contains('chip-memorized');
            chip.classList.toggle('chip-memorized', nowMemorized);
            chip.disabled = true;
            try {
                await onToggle(n, nowMemorized);
            } catch (err) {
                chip.classList.toggle('chip-memorized', !nowMemorized);
                throw err;
            } finally {
                chip.disabled = false;
            }
        });
    });
    return wrap;
}

// معاينة غير تفاعلية لنطاق منهج محسوب تلقائياً (بلا إمكانية تبديل)
export function renderCurriculumPreviewChips(surahNumbers) {
    const wrap = document.createElement('div');
    wrap.className = 'chip-grid';
    wrap.innerHTML = surahNumbers.map(n => `
        <button type="button" class="chip chip-selected" disabled>
            <span>${escapeHtml(SURAHS[n - 1].name)}</span>
            <span class="chip-ayahs">${surahAyahs(n)} آية</span>
        </button>`).join('');
    return wrap;
}

export function scopeSummaryText(surahNumbers) {
    const count = surahNumbers.length;
    const ayahs = surahNumbers.reduce((sum, n) => sum + surahAyahs(n), 0);
    return `${count} سورة · ${ayahs} آية`;
}
