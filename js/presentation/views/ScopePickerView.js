// عنصر اختيار نطاق الحفظ الكامل: القرآن/أجزاء/تحديد سور/حسب المنهج — يملك حالته الخاصة بمعزل عن الصفحة المستضيفة
import { SURAHS, expandScope } from '../../core/quran-data.js';
import {
    CURRICULUM_COUNTRIES, curriculumSystems, curriculumStages, curriculumLevels, curriculumTerms,
    resolveCurriculumSurahs,
} from '../../core/curriculum-data.js';
import { escapeHtml } from './ui.js';
import { renderSurahChipGrid, renderJuzChipGrid, renderCurriculumPreviewChips, scopeSummaryText } from './SurahPickerView.js';

// hostEl: العنصر الذي سيُرسم بداخله؛ initialScope: settings.scope الحالي (أو الافتراضي)
// onChange: يُستدعى بعد أي تغيير قد يؤثر على النطاق المحسوب (لتحديث معاينات خارجية إن وُجدت)
export function mountScopePicker(hostEl, initialScope, onChange = () => {}) {
    let scopeType = initialScope.type || 'quran';
    const selectedJuz = new Set(initialScope.juzNumbers || []);
    const selectedSurahs = new Set(initialScope.surahNumbers || []);
    const curriculumSel = {
        countryId: initialScope.curriculum?.countryId ?? CURRICULUM_COUNTRIES[0].id,
        systemId: initialScope.curriculum?.systemId ?? null,
        stageId: initialScope.curriculum?.stageId ?? null,
        levelId: initialScope.curriculum?.levelId ?? null,
        termId: initialScope.curriculum?.termId ?? null,
    };

    hostEl.innerHTML = `
        <label class="form-label">نطاق الحفظ</label>
        <div class="seg-tabs" id="scopeTabs">
            <button type="button" class="seg-tab ${scopeType === 'quran' ? 'active' : ''}" data-scope="quran">القرآن كاملاً</button>
            <button type="button" class="seg-tab ${scopeType === 'juz' ? 'active' : ''}" data-scope="juz">أجزاء</button>
            <button type="button" class="seg-tab ${scopeType === 'custom' ? 'active' : ''}" data-scope="custom">تحديد سور</button>
            <button type="button" class="seg-tab ${scopeType === 'curriculum' ? 'active' : ''}" data-scope="curriculum">حسب المنهج الرسمي</button>
        </div>
        <div id="scopePanelQuran" style="display:${scopeType === 'quran' ? 'block' : 'none'};">
            <p class="form-hint">سيشمل النطاق جميع سور القرآن الكريم الـ 114 (6236 آية).</p>
        </div>
        <div id="scopePanelJuz" style="display:${scopeType === 'juz' ? 'block' : 'none'};"></div>
        <div id="scopePanelCustom" style="display:${scopeType === 'custom' ? 'block' : 'none'};">
            <div class="range-row">
                <div class="form-group">
                    <label class="form-label">من سورة</label>
                    <select class="form-select" id="rangeFrom">${SURAHS.map(s => `<option value="${s.n}">${escapeHtml(s.name)}</option>`).join('')}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">إلى سورة</label>
                    <select class="form-select" id="rangeTo">${SURAHS.map(s => `<option value="${s.n}">${escapeHtml(s.name)}</option>`).join('')}</select>
                </div>
                <button type="button" class="btn btn-secondary" id="applyRangeBtn">تحديد النطاق</button>
            </div>
            <div id="customChipHost"></div>
        </div>
        <div id="scopePanelCurriculum" style="display:${scopeType === 'curriculum' ? 'block' : 'none'};">
            <p class="form-hint">يُحسب النطاق تلقائياً حسب المنهج الرسمي المعتمد — إن غطّى المنهج جزءاً من سورة كبيرة فسيُدرَج نطاقها كاملاً (يتتبّع وسام الحفظ سورةً كاملة).</p>
        </div>
        <div class="scope-counter" id="scopeCounter"></div>
    `;

    const juzPanel = hostEl.querySelector('#scopePanelJuz');
    const customChipHost = hostEl.querySelector('#customChipHost');
    const curriculumPanel = hostEl.querySelector('#scopePanelCurriculum');
    const scopeCounter = hostEl.querySelector('#scopeCounter');

    function updateCounter() {
        scopeCounter.textContent = scopeSummaryText(currentSurahNumbers());
        onChange();
    }

    function currentSurahNumbers() {
        if (scopeType === 'quran') return expandScope({ type: 'quran' });
        if (scopeType === 'juz') return expandScope({ type: 'juz', juzNumbers: [...selectedJuz] });
        if (scopeType === 'curriculum') return currentCurriculumSurahs();
        return [...selectedSurahs].sort((a, b) => a - b);
    }

    // يتأكد أن الاختيارات الفرعية (نظام/مرحلة/صف) ما زالت صالحة ضمن الدولة/النظام الحاليين
    function normalizeCurriculumSel() {
        const systems = curriculumSystems(curriculumSel.countryId);
        if (!systems.some(s => s.systemId === curriculumSel.systemId)) {
            curriculumSel.systemId = systems[0]?.systemId ?? null;
        }
        const stages = curriculumStages(curriculumSel.countryId, curriculumSel.systemId);
        if (!stages.some(s => s.stageId === curriculumSel.stageId)) {
            curriculumSel.stageId = stages[0]?.stageId ?? null;
        }
        const levels = curriculumLevels(curriculumSel.countryId, curriculumSel.systemId, curriculumSel.stageId);
        if (!levels.some(l => l.levelId === curriculumSel.levelId)) {
            curriculumSel.levelId = levels[0]?.levelId ?? null;
        }
    }

    function currentCurriculumSurahs() {
        normalizeCurriculumSel();
        return resolveCurriculumSurahs(curriculumSel);
    }

    function renderCurriculumPanel() {
        normalizeCurriculumSel();
        const systems = curriculumSystems(curriculumSel.countryId);
        const stages = curriculumStages(curriculumSel.countryId, curriculumSel.systemId);
        const levels = curriculumLevels(curriculumSel.countryId, curriculumSel.systemId, curriculumSel.stageId);
        const terms = curriculumTerms(curriculumSel.countryId);

        const hint = curriculumPanel.querySelector('.form-hint').outerHTML;
        curriculumPanel.innerHTML = `
            ${hint}
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">الدولة / المنهج</label>
                    <select class="form-select" id="curCountry">${CURRICULUM_COUNTRIES.map(c => `<option value="${c.id}" ${c.id === curriculumSel.countryId ? 'selected' : ''}>${escapeHtml(c.manhagName)}</option>`).join('')}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">النظام التعليمي</label>
                    <select class="form-select" id="curSystem">${systems.map(s => `<option value="${s.systemId}" ${s.systemId === curriculumSel.systemId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">المرحلة</label>
                    <select class="form-select" id="curStage">${stages.map(s => `<option value="${s.stageId}" ${s.stageId === curriculumSel.stageId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">الصف / المستوى</label>
                    <select class="form-select" id="curLevel">${levels.map(l => `<option value="${l.levelId}" ${l.levelId === curriculumSel.levelId ? 'selected' : ''}>${escapeHtml(l.name)}</option>`).join('')}</select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">الفصل الدراسي</label>
                <select class="form-select" id="curTerm">
                    <option value="" ${curriculumSel.termId == null ? 'selected' : ''}>السنة الدراسية كاملة (كل الفصول)</option>
                    ${terms.map(t => `<option value="${t.termId}" ${t.termId === curriculumSel.termId ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
                </select>
            </div>
            <div id="curPreviewHost"></div>
        `;

        curriculumPanel.querySelector('#curCountry').addEventListener('change', e => {
            curriculumSel.countryId = Number(e.target.value);
            curriculumSel.systemId = null; curriculumSel.stageId = null; curriculumSel.levelId = null; curriculumSel.termId = null;
            renderCurriculumPanel();
            updateCounter();
        });
        curriculumPanel.querySelector('#curSystem').addEventListener('change', e => {
            curriculumSel.systemId = Number(e.target.value);
            curriculumSel.stageId = null; curriculumSel.levelId = null;
            renderCurriculumPanel();
            updateCounter();
        });
        curriculumPanel.querySelector('#curStage').addEventListener('change', e => {
            curriculumSel.stageId = Number(e.target.value);
            curriculumSel.levelId = null;
            renderCurriculumPanel();
            updateCounter();
        });
        curriculumPanel.querySelector('#curLevel').addEventListener('change', e => {
            curriculumSel.levelId = Number(e.target.value);
            renderCurriculumPanel();
            updateCounter();
        });
        curriculumPanel.querySelector('#curTerm').addEventListener('change', e => {
            curriculumSel.termId = e.target.value ? Number(e.target.value) : null;
            renderCurriculumPreview();
            updateCounter();
        });

        renderCurriculumPreview();
    }

    function renderCurriculumPreview() {
        const host = curriculumPanel.querySelector('#curPreviewHost');
        if (!host) return;
        host.innerHTML = '';
        host.appendChild(renderCurriculumPreviewChips(currentCurriculumSurahs()));
    }

    function renderJuzPanel() {
        juzPanel.innerHTML = '';
        juzPanel.appendChild(renderJuzChipGrid({
            selected: selectedJuz,
            onToggle: (j, on) => {
                if (on) selectedJuz.add(j); else selectedJuz.delete(j);
                updateCounter();
            },
        }));
    }

    function renderCustomPanel() {
        customChipHost.innerHTML = '';
        customChipHost.appendChild(renderSurahChipGrid({
            selected: selectedSurahs,
            onToggle: (n, on) => {
                if (on) selectedSurahs.add(n); else selectedSurahs.delete(n);
                updateCounter();
            },
        }));
    }

    renderJuzPanel();
    renderCustomPanel();
    renderCurriculumPanel();
    updateCounter();

    hostEl.querySelector('#scopeTabs').addEventListener('click', e => {
        const btn = e.target.closest('.seg-tab');
        if (!btn) return;
        scopeType = btn.dataset.scope;
        hostEl.querySelectorAll('#scopeTabs .seg-tab').forEach(t => t.classList.toggle('active', t === btn));
        hostEl.querySelector('#scopePanelQuran').style.display = scopeType === 'quran' ? 'block' : 'none';
        hostEl.querySelector('#scopePanelJuz').style.display = scopeType === 'juz' ? 'block' : 'none';
        hostEl.querySelector('#scopePanelCustom').style.display = scopeType === 'custom' ? 'block' : 'none';
        hostEl.querySelector('#scopePanelCurriculum').style.display = scopeType === 'curriculum' ? 'block' : 'none';
        updateCounter();
    });

    hostEl.querySelector('#applyRangeBtn').addEventListener('click', () => {
        const from = Number(hostEl.querySelector('#rangeFrom').value);
        const to = Number(hostEl.querySelector('#rangeTo').value);
        const [lo, hi] = from <= to ? [from, to] : [to, from];
        for (let n = lo; n <= hi; n++) selectedSurahs.add(n);
        renderCustomPanel();
        updateCounter();
    });

    return {
        // يُعيد كائن scope كاملاً جاهزاً للحفظ: {type, juzNumbers, curriculum, surahNumbers}
        getScope() {
            return {
                type: scopeType,
                juzNumbers: scopeType === 'juz' ? [...selectedJuz] : [],
                curriculum: scopeType === 'curriculum' ? { ...curriculumSel } : null,
                surahNumbers: currentSurahNumbers(),
            };
        },
    };
}
