// إنشاء/تعديل لوحة: الاسم، المدرسة، نطاق المنهج، الاتجاه، الخصوصية
import { authState } from '../../core/authState.js';
import { BoardRepository, defaultSettings } from '../../data/repositories/BoardRepository.js';
import { SURAHS, expandScope, surahsInJuz } from '../../core/quran-data.js';
import {
    CURRICULUM_COUNTRIES, curriculumSystems, curriculumStages, curriculumLevels, curriculumTerms,
    resolveCurriculumSurahs,
} from '../../core/curriculum-data.js';
import { topbar, bindTopbar, toast, confirmDialog, escapeHtml } from '../views/ui.js';
import { renderSurahChipGrid, renderJuzChipGrid, renderCurriculumPreviewChips, scopeSummaryText } from '../views/SurahPickerView.js';

export default async function BoardSettingsPage(container, { params, navigate }) {
    const user = authState.user();
    const isEdit = Boolean(params.boardId);
    let board = null;

    if (isEdit) {
        board = await BoardRepository.get(params.boardId);
        if (!board) {
            container.innerHTML = `<div id="error-msg" style="display:block;"><p>اللوحة غير موجودة.</p></div>`;
            return;
        }
        if (board.ownerUid !== user.uid) {
            container.innerHTML = `<div id="error-msg" style="display:block;"><p>لا تملك صلاحية تعديل هذه اللوحة.</p></div>`;
            return;
        }
    }

    const settings = isEdit
        ? JSON.parse(JSON.stringify(board.settings))
        : defaultSettings();

    const oldSurahNumbers = new Set(settings.scope.surahNumbers || []);
    let scopeType = settings.scope.type || 'quran';
    const selectedJuz = new Set(settings.scope.juzNumbers || []);
    const selectedSurahs = new Set(settings.scope.surahNumbers || []);
    const curriculumSel = {
        countryId: settings.scope.curriculum?.countryId ?? CURRICULUM_COUNTRIES[0].id,
        systemId: settings.scope.curriculum?.systemId ?? null,
        stageId: settings.scope.curriculum?.stageId ?? null,
        levelId: settings.scope.curriculum?.levelId ?? null,
        termId: settings.scope.curriculum?.termId ?? null,
    };

    container.innerHTML = `
        ${topbar('dashboard')}
        <div class="page-title-row">
            <h1 class="page-title">${isEdit ? 'إعدادات اللوحة' : 'لوحة جديدة'}</h1>
        </div>

        <form id="boardForm">
            <div class="form-card">
                <div class="form-group">
                    <label class="form-label">اسم اللوحة *</label>
                    <input type="text" class="form-input" id="fName" required maxlength="100" value="${escapeHtml(settings.name)}" placeholder="مثال: حلقة الفجر — المستوى الثاني">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">اسم المدرسة / الحلقة</label>
                        <input type="text" class="form-input" id="fSchool" maxlength="150" value="${escapeHtml(settings.schoolName)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">اسم الفصل / المجموعة</label>
                        <input type="text" class="form-input" id="fClass" maxlength="100" value="${escapeHtml(settings.classLabel)}">
                    </div>
                </div>
            </div>

            <div class="form-card">
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
            </div>

            <div class="form-card">
                <div class="toggle-row">
                    <div>
                        <div class="toggle-label">اتجاه الحفظ</div>
                        <p class="form-hint" style="margin-top:2px;">عكسي: من الناس صعوداً (المعتاد في التحفيظ) — طردي: من الفاتحة</p>
                    </div>
                    <div class="seg-tabs" style="width:220px; margin-bottom:0;">
                        <button type="button" class="seg-tab ${settings.direction !== 'forward' ? 'active' : ''}" data-dir="reverse">عكسي</button>
                        <button type="button" class="seg-tab ${settings.direction === 'forward' ? 'active' : ''}" data-dir="forward">طردي</button>
                    </div>
                </div>
                <div class="toggle-row">
                    <span class="toggle-label">لوحة عامة (رابط مشاركة بدون تسجيل دخول)</span>
                    <label class="toggle">
                        <input type="checkbox" id="fPublic" ${settings.isPublic ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="toggle-row">
                    <span class="toggle-label">إظهار شريط إنجاز الفصل</span>
                    <label class="toggle">
                        <input type="checkbox" id="fShowClass" ${settings.showClassProgress ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="form-group" style="margin-top:16px; margin-bottom:0;">
                    <label class="form-label">السورة الحالية للفصل</label>
                    <select class="form-select" id="fCurrentSurah">
                        <option value="">تلقائي (يُحسب حسب تقدم الطلاب)</option>
                        ${SURAHS.map(s => `<option value="${s.n}" ${settings.classCurrentSurah === s.n ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div style="display:flex; gap:10px;">
                <button type="submit" class="btn btn-primary btn-lg" id="submitBtn">${isEdit ? 'حفظ التغييرات' : 'إنشاء اللوحة'}</button>
                <a href="/dashboard" class="btn btn-secondary btn-lg">إلغاء</a>
            </div>
        </form>

        ${isEdit ? `
            <div class="danger-zone">
                <h3 class="danger-zone-title">منطقة الخطر</h3>
                <p class="form-hint" style="margin-bottom:14px;">حذف اللوحة يزيل جميع بيانات الطلاب نهائياً ولا يمكن التراجع عنه.</p>
                <button type="button" class="btn btn-danger" id="deleteBoardBtn">حذف اللوحة</button>
            </div>
        ` : ''}
    `;
    bindTopbar(container);

    const juzPanel = container.querySelector('#scopePanelJuz');
    const customChipHost = container.querySelector('#customChipHost');
    const curriculumPanel = container.querySelector('#scopePanelCurriculum');
    const scopeCounter = container.querySelector('#scopeCounter');

    function updateCounter() {
        const nums = currentSurahNumbers();
        scopeCounter.textContent = scopeSummaryText(nums);
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

    container.querySelector('#scopeTabs').addEventListener('click', e => {
        const btn = e.target.closest('.seg-tab');
        if (!btn) return;
        scopeType = btn.dataset.scope;
        container.querySelectorAll('#scopeTabs .seg-tab').forEach(t => t.classList.toggle('active', t === btn));
        container.querySelector('#scopePanelQuran').style.display = scopeType === 'quran' ? 'block' : 'none';
        container.querySelector('#scopePanelJuz').style.display = scopeType === 'juz' ? 'block' : 'none';
        container.querySelector('#scopePanelCustom').style.display = scopeType === 'custom' ? 'block' : 'none';
        container.querySelector('#scopePanelCurriculum').style.display = scopeType === 'curriculum' ? 'block' : 'none';
        updateCounter();
    });

    container.querySelector('#applyRangeBtn').addEventListener('click', () => {
        const from = Number(container.querySelector('#rangeFrom').value);
        const to = Number(container.querySelector('#rangeTo').value);
        const [lo, hi] = from <= to ? [from, to] : [to, from];
        for (let n = lo; n <= hi; n++) selectedSurahs.add(n);
        renderCustomPanel();
        updateCounter();
    });

    let direction = settings.direction !== 'forward' ? 'reverse' : 'forward';
    container.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => {
            direction = btn.dataset.dir;
            container.querySelectorAll('[data-dir]').forEach(b => b.classList.toggle('active', b === btn));
        });
    });

    if (isEdit) {
        container.querySelector('#deleteBoardBtn').addEventListener('click', async () => {
            const ok = await confirmDialog({
                title: 'حذف اللوحة',
                message: `سيتم حذف لوحة "${settings.name}" وجميع بيانات الطلاب فيها نهائياً.`,
                confirmText: 'حذف نهائياً',
                danger: true,
                requireText: settings.name,
            });
            if (!ok) return;
            try {
                await BoardRepository.delete(board.id);
                toast('تم حذف اللوحة', 'success');
                navigate('/dashboard');
            } catch (err) {
                console.error(err);
                toast('تعذر حذف اللوحة', 'error');
            }
        });
    }

    container.querySelector('#boardForm').addEventListener('submit', async e => {
        e.preventDefault();
        const submitBtn = container.querySelector('#submitBtn');
        const name = container.querySelector('#fName').value.trim();
        if (!name) { toast('اكتب اسم اللوحة', 'error'); return; }

        const surahNumbers = currentSurahNumbers();
        if (surahNumbers.length === 0) { toast('اختر نطاقاً يحتوي على سورة واحدة على الأقل', 'error'); return; }

        const newSettings = {
            name,
            schoolName: container.querySelector('#fSchool').value.trim(),
            classLabel: container.querySelector('#fClass').value.trim(),
            scope: {
                type: scopeType,
                juzNumbers: scopeType === 'juz' ? [...selectedJuz] : [],
                curriculum: scopeType === 'curriculum' ? { ...curriculumSel } : null,
                surahNumbers,
            },
            direction,
            isPublic: container.querySelector('#fPublic').checked,
            showClassProgress: container.querySelector('#fShowClass').checked,
            classCurrentSurah: container.querySelector('#fCurrentSurah').value
                ? Number(container.querySelector('#fCurrentSurah').value)
                : null,
        };

        submitBtn.disabled = true;
        try {
            if (isEdit) {
                const shrunk = [...oldSurahNumbers].some(n => !surahNumbers.includes(n));
                await BoardRepository.updateSettings(board.id, newSettings);
                if (shrunk) toast('تم الحفظ — بيانات الحفظ خارج النطاق الجديد محفوظة ولن تُحتسب فقط', 'success');
                else toast('تم حفظ التغييرات', 'success');
                navigate(`/edit/${board.id}`);
            } else {
                const id = await BoardRepository.create(user.uid, newSettings);
                toast('تم إنشاء اللوحة ✓', 'success');
                navigate(`/edit/${id}/students`);
            }
        } catch (err) {
            console.error(err);
            toast('تعذر حفظ اللوحة، حاول مرة أخرى', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });
}
