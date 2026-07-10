// معالج استيراد البيانات من Google Sheets القديمة إلى لوحات Firestore
import { authState } from '../../core/authState.js';
import { fetchLegacyCurricula, splitClassProgressRow } from '../../data/api/LegacySheetsApi.js';
import { BoardRepository } from '../../data/repositories/BoardRepository.js';
import { surahNumberFromName, expandScope, normalizeArabic } from '../../core/quran-data.js';
import { topbar, bindTopbar, toast, escapeHtml, boardShareUrl, copyToClipboard } from '../views/ui.js';

// تعريف اللوحات الثلاث القديمة وكيفية تحويل كل منها إلى إعدادات لوحة جديدة
const CURRICULUM_PRESETS = {
    'المنهج': {
        boardName: 'منهج حفظ الصف الأول',
        scope: { type: 'custom', juzNumbers: [], surahNumbers: [1, ...Array.from({ length: 31 }, (_, i) => 84 + i)] },
    },
    'جزء عم': {
        boardName: 'برنامج حفظ جزء عمّ',
        scope: { type: 'juz', juzNumbers: [30], surahNumbers: expandScope({ type: 'juz', juzNumbers: [30] }) },
    },
    'جزء تبارك': {
        boardName: 'برنامج حفظ جزء تبارك',
        scope: { type: 'juz', juzNumbers: [29], surahNumbers: expandScope({ type: 'juz', juzNumbers: [29] }) },
    },
};
const DEFAULT_SCHOOL = 'ابتدائية هشام بن عمار لتحفيظ القرآن ببريدة';
const DEFAULT_CLASS = 'الصف الأول';

export default async function ImportPage(container, { navigate }) {
    const user = authState.user();
    let step = 1;
    let rawData = null;
    let existingNames = new Set();

    try {
        const mine = await BoardRepository.listMine(user.uid);
        existingNames = new Set(mine.map(b => b.settings.name));
    } catch { /* غير حرج لو فشل */ }

    function render() {
        container.innerHTML = `
            ${topbar('dashboard')}
            <div class="page-title-row"><h1 class="page-title">استيراد من Google Sheets</h1></div>
            <div class="wizard-steps">
                <div class="wizard-step ${step === 1 ? 'active' : ''}">1. جلب البيانات</div>
                <div class="wizard-step ${step === 2 ? 'active' : ''}">2. معاينة</div>
                <div class="wizard-step ${step === 3 ? 'active' : ''}">3. تم الاستيراد</div>
            </div>
            <div id="wizardHost"></div>
        `;
        bindTopbar(container);
        const host = container.querySelector('#wizardHost');
        if (step === 1) renderStep1(host);
        else if (step === 2) renderStep2(host);
    }

    function renderStep1(host) {
        host.innerHTML = `
            <div class="form-card">
                <p class="form-hint" style="margin-bottom:16px;">سيتم جلب اللوحات الثلاث (المنهج، جزء عمّ، جزء تبارك) من رابط Google Apps Script القديم وتحويلها إلى لوحات جديدة داخل التطبيق.</p>
                <button class="btn btn-primary" id="fetchBtn">جلب البيانات تلقائياً</button>
                <button class="btn btn-secondary" id="showPasteBtn" type="button" style="margin-inline-start:10px;">لصق JSON يدوياً</button>
                <div id="pasteArea" style="display:none; margin-top:16px;">
                    <label class="form-label">الصق محتوى استجابة الـ API (كائن data الخام)</label>
                    <textarea class="form-input" id="pasteInput" rows="6" style="font-family:monospace; direction:ltr;"></textarea>
                    <button class="btn btn-primary" id="usePasteBtn" style="margin-top:10px;">استخدام هذه البيانات</button>
                </div>
                <div id="fetchStatus" style="margin-top:16px;"></div>
            </div>
        `;
        const status = host.querySelector('#fetchStatus');

        host.querySelector('#fetchBtn').addEventListener('click', async () => {
            status.innerHTML = '<p class="form-hint">جارِ الجلب...</p>';
            try {
                rawData = await fetchLegacyCurricula();
                step = 2;
                render();
            } catch (err) {
                console.error(err);
                status.innerHTML = `<div class="auth-error" style="display:block;">تعذر جلب البيانات تلقائياً (${escapeHtml(err.message)}). جرّب لصق JSON يدوياً بدلاً من ذلك.</div>`;
            }
        });

        host.querySelector('#showPasteBtn').addEventListener('click', () => {
            host.querySelector('#pasteArea').style.display = 'block';
        });

        host.querySelector('#usePasteBtn').addEventListener('click', () => {
            try {
                const parsed = JSON.parse(host.querySelector('#pasteInput').value);
                rawData = parsed;
                step = 2;
                render();
            } catch {
                status.innerHTML = '<div class="auth-error" style="display:block;">النص الملصق ليس JSON صالحاً.</div>';
            }
        });
    }

    function buildPreview() {
        const boards = [];
        for (const [curriculumKey, preset] of Object.entries(CURRICULUM_PRESETS)) {
            const normalizedTarget = normalizeArabic(curriculumKey);
            const actualKey = Object.keys(rawData || {}).find(
                k => normalizeArabic(k) === normalizedTarget
            );
            if (!actualKey) continue;

            const rows = rawData[actualKey] || [];
            const { students: studentRows, classCurrentSurahName } = splitClassProgressRow(rows);

            const students = studentRows.map(row => {
                const rawNames = row.memorized_surahs || [];
                const matched = [];
                const unmatched = [];
                rawNames.forEach(n => {
                    const num = surahNumberFromName(n);
                    if (num) matched.push(num); else unmatched.push(n);
                });
                let completedDate = null;
                if (row.completed_date) {
                    const d = new Date(row.completed_date);
                    if (!isNaN(d.getTime())) completedDate = d;
                }
                return { name: row.name, matched, unmatched, completedDate };
            });

            const classCurrentSurah = classCurrentSurahName ? surahNumberFromName(classCurrentSurahName) : null;
            const boardName = preset.boardName;
            boards.push({
                curriculumKey,
                boardName,
                alreadyExists: existingNames.has(boardName),
                scope: preset.scope,
                classCurrentSurah,
                students,
                selected: true,
            });
        }
        return boards;
    }

    function renderStep2(host) {
        const boards = buildPreview();
        if (boards.length === 0) {
            host.innerHTML = `<div class="empty-state"><p class="empty-state-text">لم يتم العثور على أي من اللوحات الثلاث المعروفة في البيانات المجلوبة.</p></div>`;
            return;
        }

        host.innerHTML = `
            <p class="form-hint" style="margin-bottom:16px;">ملاحظة: قد تختلف النسب المئوية قليلاً عن الشيت القديم لأنها الآن تُحسب موزونة بعدد الآيات بدل عدد السور فقط.</p>
            ${boards.map((b, i) => `
                <div class="import-board-preview">
                    <div class="toggle-row" style="border-bottom:none; padding-top:0;">
                        <div>
                            <strong style="font-size:1.1rem; color:var(--primary-dark);">${escapeHtml(b.boardName)}</strong>
                            <div class="form-hint">${b.students.length} طالب${b.alreadyExists ? ' — ⚠️ لديك لوحة بنفس الاسم مسبقاً' : ''}</div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" class="board-select" data-idx="${i}" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <ul style="margin:10px 0 0 0; padding-inline-start:20px; font-size:0.88rem; color:var(--text-muted);">
                        ${b.students.slice(0, 8).map(s => `
                            <li>${escapeHtml(s.name)} — ${s.matched.length} سورة متطابقة
                                ${s.unmatched.length ? `<span class="unmatched-surah"> (${s.unmatched.length} غير متعرف عليها: ${s.unmatched.map(escapeHtml).join('، ')})</span>` : ''}
                            </li>`).join('')}
                        ${b.students.length > 8 ? `<li>... و${b.students.length - 8} طالباً آخر</li>` : ''}
                    </ul>
                </div>
            `).join('')}
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="btn btn-primary btn-lg" id="importBtn">استيراد اللوحات المحددة</button>
                <button class="btn btn-secondary" id="backBtn">رجوع</button>
            </div>
        `;

        host.querySelector('#backBtn').addEventListener('click', () => { step = 1; render(); });

        host.querySelector('#importBtn').addEventListener('click', async () => {
            const importBtn = host.querySelector('#importBtn');
            importBtn.disabled = true;
            const checkboxes = [...host.querySelectorAll('.board-select')];
            const toImport = checkboxes.filter(c => c.checked).map(c => boards[Number(c.dataset.idx)]);
            if (toImport.length === 0) { toast('اختر لوحة واحدة على الأقل', 'error'); importBtn.disabled = false; return; }

            const results = [];
            for (const b of toImport) {
                try {
                    const settings = {
                        name: b.boardName,
                        schoolName: DEFAULT_SCHOOL,
                        classLabel: DEFAULT_CLASS,
                        scope: b.scope,
                        direction: 'forward', // يحافظ على نفس ترتيب العرض المستخدم في التطبيق القديم
                        isPublic: true,
                        showClassProgress: true,
                        classCurrentSurah: b.classCurrentSurah,
                    };
                    const studentsMap = {};
                    b.students.forEach((s, idx) => {
                        const id = `imp${idx}${Math.random().toString(36).slice(2, 7)}`;
                        studentsMap[id] = {
                            name: s.name,
                            memorized: s.matched,
                            completedDate: s.completedDate,
                            createdAt: new Date(),
                        };
                    });
                    const id = await BoardRepository.createWithStudents(user.uid, settings, studentsMap);
                    results.push({ name: b.boardName, id, ok: true });
                } catch (err) {
                    console.error(err);
                    results.push({ name: b.boardName, ok: false, error: err.message });
                }
            }
            renderResults(host, results);
        });
    }

    function renderResults(host, results) {
        step = 3;
        container.querySelector('.wizard-step:nth-child(3)')?.classList.add('active');
        host.innerHTML = `
            <div class="form-card">
                <h3 style="margin-top:0;">نتيجة الاستيراد</h3>
                ${results.map(r => r.ok ? `
                    <div style="margin-bottom:16px;">
                        <strong>${escapeHtml(r.name)}</strong> — تم الاستيراد بنجاح ✓
                        <div class="share-link-box">
                            <code>${escapeHtml(boardShareUrl(r.id))}</code>
                            <button class="btn btn-secondary btn-sm" data-copy="${r.id}">نسخ</button>
                            <a href="#/edit/${r.id}/students" class="btn btn-primary btn-sm">الطلاب</a>
                        </div>
                    </div>
                ` : `
                    <div class="auth-error" style="display:block;">${escapeHtml(r.name)} — فشل الاستيراد: ${escapeHtml(r.error)}</div>
                `).join('')}
                <a href="#/dashboard" class="btn btn-primary" style="margin-top:10px;">الذهاب إلى لوحاتي</a>
            </div>
        `;
        host.querySelectorAll('[data-copy]').forEach(btn => {
            btn.addEventListener('click', () => copyToClipboard(boardShareUrl(btn.dataset.copy)));
        });
    }

    render();
}
