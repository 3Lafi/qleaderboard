import { uiIcon } from '../views/InterfaceIcons.js';
import { Student } from '../../domain/models/Student.js';
import { createMemorizationRecorder } from '../../domain/usecases/MemorizationRecorder.js';
import { sortTrackingStudents } from '../../domain/usecases/RankStudents.js';
import { resolvePriorSurahs, priorSummaryText } from '../../domain/usecases/PriorMemorization.js';
import { confirmDialog, promptDialog, escapeHtml, formatProgress } from '../views/ui.js';
import { surahName, expandScope } from '../../shared/quran-data.js';
import { matchesQueryNameOrNumber, matchesStudentName } from '../../shared/text-utils.js';
import { LIMITS } from '../../shared/config.js';
import { createFeedbackState } from '../layout/FeedbackStateView.js';
import { planProgression, applyProgression } from '../../domain/usecases/CohortProgression.js';

export default async function StudentsPage(container, { toast, params, layout, user, services, setTitle, signal, onDispose }) {
    const BoardRepository = services.boards;
    const CohortRepository = services.cohorts;
    setTitle('جدول المتابعة — وسام');
    const boardId = params.boardId;
    const board = await BoardRepository.get(boardId);
    if (signal.aborted) return;

    if (!board || board.ownerUid !== user?.uid) {
        setTitle('اللوحة غير متاحة — وسام');
        layout?.setActiveBoard(null);
        container.replaceChildren(createFeedbackState({
            type: 'unavailable',
            icon: '🔒',
            eyebrow: 'إدارة اللوحة',
            title: board ? 'لا تملك صلاحية إدارة هذه اللوحة' : 'اللوحة غير موجودة',
            message: board ? 'هذه اللوحة مسجلة لمعلم آخر. يمكنك العودة إلى قائمة لوحاتك.' : 'لم نتمكن من العثور على اللوحة المطلوبة.',
            actions: [
                { label: 'العودة إلى لوحاتي', href: '/dashboard', primary: true },
                { label: 'الرئيسية', href: '/' }
            ]
        }));
        return;
    }

    onDispose(() => { disposed = true; });
    let disposed = false, adding = false, activeCell = null;
    const busyStudents = new Set();
    const scope = board.orderedSurahs();
    const student = id => board.students[id]
        ? new Student(id, board.students[id], scope, resolvePriorSurahs(board, board.students[id]))
        : null;

    // مزامنة قسم طلاب اللوحة في الشريط الجانبي.
    // اللوحات الخاصة تُعرض بلا روابط (ملف الطالب غير منشور) لكن يبقى زر الإضافة متاحاً.
    const rosterEntries = () => sortTrackingStudents(Object.keys(board.students).map(student));

    const syncStudentsNav = () => {
        layout?.setStudentsNav({
            boardId,
            boardName: board.settings.name,
            linkable: true,
            ownerView: true,
            students: rosterEntries().map(entry => ({
                id: entry.id,
                name: entry.name,
                progress: entry.progress,
                completed: entry.isCompleted,
            })),
        });
    };

    setTitle(`${board.settings.name} — جدول المتابعة — وسام`);
    layout?.setActiveBoard(board);
    syncStudentsNav();

    container.innerHTML = `
        <section class="sheet-page" aria-labelledby="sheetTitle">
            <div class="sheet-heading">
                <div>
                    <p class="sheet-board-name">${escapeHtml(board.settings.name)}</p>
                    <h1 id="sheetTitle">جدول المتابعة</h1>
                    <p>تابع حفظ طلابك بخانة واحدة لكل سورة. تُحفظ التغييرات تلقائياً.</p>
                </div>
            </div>
            <div class="sheet-panel">
                <div class="sheet-toolbar">
                    <label class="sheet-search"><span>الطالب</span><input id="studentSearch" type="search" placeholder="ابحث عن طالب…" aria-label="ابحث عن طالب"></label>
                    <label class="sheet-search"><span>السورة</span><input id="surahSearch" type="search" placeholder="الاسم أو الرقم…" aria-label="ابحث عن سورة"></label>
                    <button type="button" class="sheet-expand-button" id="expandSheet" aria-haspopup="dialog">توسيع الجدول</button>
                    <div class="sheet-save"><span id="sheetSaveStatus" role="status" aria-live="polite">✓ جميع التغييرات محفوظة</span><button type="button" id="retrySave" hidden>إعادة المحاولة</button></div>
                </div>
                <div class="sheet-rangebar">
                    <div class="sheet-browse-summary"><strong id="surahRange" aria-live="polite"></strong><span id="sheetScrollHelp">اسحب الجدول جانبياً لعرض بقية السور</span><button type="button" id="clearSheetFilters" hidden>عرض الكل</button></div>
                    <div class="sheet-legend"><span><i class="sheet-legend-check" aria-hidden="true">${uiIcon('check')}</i> محفوظة</span><span><i class="sheet-legend-empty" aria-hidden="true"></i> لم تحفظ</span></div>
                </div>
                <div id="studentsHost" class="sheet-scroll" role="region" aria-label="جدول المتابعة" aria-describedby="sheetScrollHelp sheetKeyboardHelp" tabindex="0"></div>
                <form id="addStudentForm" class="sheet-add"><span aria-hidden="true">＋</span><label for="newStudentName">طالب جديد</label><input class="form-input" id="newStudentName" placeholder="اكتب اسم الطالب…" maxlength="${LIMITS.MAX_NAME_LENGTH}" required autocomplete="off"><button class="btn btn-primary" id="addStudentBtn" type="submit">إضافة طالب</button></form>
                <div class="sheet-selection-status" id="sheetSelectionHint" role="status" aria-live="polite">اختر خانة الطالب والسورة لتحديث الحفظ.</div>
                <div class="sheet-footer"><span id="studentCount"></span><span id="sheetKeyboardHelp">تنقّل بالأسهم بين الخانات · Enter أو المسافة لتغيير الحالة</span></div>
            </div>
        </section>
        <dialog class="sheet-student-dialog" aria-labelledby="studentActionsTitle">
            <form method="dialog"><div class="sheet-dialog-heading"><h2 id="studentActionsTitle"></h2><button aria-label="إغلاق" class="sheet-icon-button">${uiIcon('x')}</button></div></form>
            <a id="studentProfileLink" class="btn btn-secondary">ملف الطالب والأوسمة ↗</a>
            <button type="button" id="editStudentPrior" class="btn btn-secondary">المحتسب من برامج سابقة</button>
            <button type="button" id="renameStudent" class="btn btn-secondary">تعديل الاسم</button>
            <button type="button" id="toggleStudentVisibility" class="btn btn-secondary"></button>
            <button type="button" id="deleteStudent" class="btn btn-secondary sheet-delete">حذف الطالب</button>
        </dialog>
    `;

    const host = container.querySelector('#studentsHost');
    const nameInput = container.querySelector('#newStudentName');
    const searchInput = container.querySelector('#studentSearch');
    const surahInput = container.querySelector('#surahSearch');
    const dialog = container.querySelector('dialog');
    const panel = container.querySelector('.sheet-panel');
    const expandButton = container.querySelector('#expandSheet');
    const panelAnchor = document.createComment('Table location');
    panel.before(panelAnchor);

    const expandedDialog = document.createElement('dialog');
    expandedDialog.className = 'sheet-expanded';
    expandedDialog.setAttribute('aria-label', 'جدول المتابعة الموسّع');
    container.append(expandedDialog);

    let expandedScroll = { left: 0, top: 0 };
    const rememberExpandedScroll = () => { expandedScroll = { left: host.scrollLeft, top: host.scrollTop }; };
    expandedDialog.addEventListener('cancel', rememberExpandedScroll);

    expandButton.onclick = () => {
        if (expandedDialog.open) { rememberExpandedScroll(); expandedDialog.close(); return; }
        const horizontal = host.scrollLeft, vertical = host.scrollTop;
        expandedDialog.append(panel);
        expandButton.autofocus = true;
        expandedDialog.showModal();
        expandButton.autofocus = false;
        expandButton.textContent = 'إنهاء التوسيع';
        expandButton.removeAttribute('aria-haspopup');
        host.scrollLeft = horizontal; host.scrollTop = vertical;
        expandButton.focus({ preventScroll: true });
    };

    expandedDialog.addEventListener('close', () => {
        const { left: horizontal, top: vertical } = expandedScroll;
        if (panelAnchor.isConnected) panelAnchor.after(panel);
        expandButton.textContent = 'توسيع الجدول';
        expandButton.setAttribute('aria-haspopup', 'dialog');
        host.scrollLeft = horizontal; host.scrollTop = vertical;
        if (!disposed) expandButton.focus({ preventScroll: true });
    });

    let actionStudentId = null;

    async function syncLinkedPrograms() {
        if (!board.settings.cohortId) return;
        const [cohort, boards] = await Promise.all([
            CohortRepository.get(board.settings.cohortId),
            BoardRepository.listMine(user.uid),
        ]);
        if (!cohort) return;
        const plan = planProgression({ cohort, boards });
        if (!plan.total) return;
        await applyProgression(plan, {
            addStudent: (targetId, name, count, extra) => BoardRepository.addStudent(targetId, name, count, extra),
            setStudentVisibility: (targetId, studentId, hidden, cohortStudentId) => BoardRepository.setStudentVisibility(targetId, studentId, hidden, '', cohortStudentId),
        });
    }

    const recorder = createMemorizationRecorder({
        getStudent: student,
        persist: async ({ id, surah, selected }, change) => {
            await BoardRepository.setSurah(boardId, id, surah, selected, change.isNowComplete, change.wasComplete);
            board.students[id].memorized = change.memorized;
            if (change.isNowComplete && !change.wasComplete) board.students[id].completedDate = { toMillis: () => Date.now() };
            else if (!change.isNowComplete && change.wasComplete) board.students[id].completedDate = null;
            if (change.isNowComplete !== change.wasComplete) await syncLinkedPrograms();
        },
        onChange: ({ id, surah, status }) => {
            if (disposed) return;
            const row = [...host.querySelectorAll('[data-student-row]')].find(el => el.dataset.studentRow === id);
            const cell = row?.querySelector(`[data-surah="${surah}"]`);
            if (cell) updateCell(cell);
            const summary = row?.querySelector('.sheet-student-summary');
            if (summary) summary.innerHTML = summaryHtml(student(id));
            updateStatus();
            if (status === 'saved') syncStudentsNav();
            if (activeCell === `${id}:${surah}`) updateSelection(id, surah);
        },
    });

    function updateStatus() {
        const status = container.querySelector('#sheetSaveStatus');
        status.dataset.state = recorder.failedCount ? 'error' : recorder.pendingCount ? 'saving' : 'saved';
        status.textContent = recorder.failedCount
            ? `${recorder.failedCount === 1 ? 'تغيير واحد لم يُحفظ' : `${recorder.failedCount} تغييرات لم تُحفظ`}${recorder.pendingCount ? ` · جارٍ حفظ ${recorder.pendingCount}` : ''}`
            : recorder.pendingCount ? (recorder.pendingCount === 1 ? 'جارٍ حفظ التغيير…' : `جارٍ حفظ ${recorder.pendingCount} تغييرات…`) : '✓ جميع التغييرات محفوظة';
        container.querySelector('#retrySave').hidden = !recorder.failedCount;
    }

    function summaryHtml(s) {
        return `<span><bdi>${s.surahsCount} / ${s.totalSurahsInScope}</bdi> سورة <span class="sheet-progress-label">${formatProgress(s.progress)}٪</span></span><span class="sheet-progress" title="نسبة الحفظ بحسب عدد الآيات"><i style="width:${s.progress}%"></i></span>`;
    }

    function updateCell(button) {
        const id = button.dataset.student, n = Number(button.dataset.surah), s = student(id);
        const state = recorder.state(id, n);
        const saving = state?.status === 'pending', failed = state?.status === 'failed';
        const saved = saving ? state.selected : s.memorized.includes(n);
        button.dataset.state = saving ? 'saving' : failed ? 'error' : saved ? 'saved' : 'empty';
        button.setAttribute('aria-checked', String(saved));
        button.setAttribute('aria-disabled', String(saving || busyStudents.has(id)));
        button.setAttribute('aria-label', `${s.name} — سورة ${surahName(n)} — ${saving ? 'جارٍ الحفظ' : failed ? 'تعذر الحفظ، اضغط للمحاولة مجدداً' : saved ? 'محفوظة' : 'لم تحفظ'}`);
        button.innerHTML = `<span aria-hidden="true">${saving ? uiIcon('loader-circle') : failed ? uiIcon('circle-alert') : saved ? uiIcon('check') : ''}</span>`;
    }

    function updateSelection(id, n) {
        const s = student(id); if (!s) return;
        const state = recorder.state(id, n);
        container.querySelector('#sheetSelectionHint').textContent = `${s.name} · ${surahName(n)} · ${state?.status === 'pending' ? 'جارٍ الحفظ…' : state?.status === 'failed' ? 'تعذر الحفظ، أعد المحاولة' : s.memorized.includes(n) ? 'محفوظة' : 'لم تحفظ'}`;
        host.querySelector('.sheet-active-surah')?.classList.remove('sheet-active-surah');
        host.querySelector(`th[data-surah-heading="${n}"]`)?.classList.add('sheet-active-surah');
    }

    function visibleSurahs() {
        return scope.filter(n => matchesQueryNameOrNumber({ name: surahName(n), number: n }, surahInput.value));
    }

    function renderTable() {
        const all = sortTrackingStudents(Object.keys(board.students).map(student));
        const students = all.filter(s => matchesStudentName(s.name, searchInput.value));
        const columns = visibleSurahs();

        container.querySelector('#surahRange').textContent = columns.length ? `${columns.length} سورة · ${students.length} طالب` : 'لا توجد سور مطابقة';
        container.querySelector('#clearSheetFilters').hidden = !searchInput.value && !surahInput.value;
        container.querySelector('#sheetSelectionHint').textContent = 'اختر خانة الطالب والسورة لتحديث الحفظ.';
        container.querySelector('#studentCount').textContent = `${students.length} من ${all.length} طالب`;

        if (!students.length || !columns.length) {
            host.innerHTML = `<div class="sheet-empty"><strong>${!all.length ? 'أضف طلابك إلى جدول المتابعة' : !students.length ? 'لا يوجد طالب بهذا الاسم' : 'لا توجد سورة مطابقة ضمن خطة اللوحة'}</strong><p>${!all.length ? 'اكتب اسم أول طالب في الحقل أدناه. سيظهر في صف مستقل.' : 'جرّب اسماً آخر أو امسح البحث.'}</p>${all.length ? '<button type="button" class="btn btn-secondary" data-clear-search>مسح البحث</button>' : ''}</div>`;
            return;
        }

        host.innerHTML = `
            <table class="memorization-sheet" style="--sheet-columns:${columns.length}" aria-describedby="sheetKeyboardHelp">
                <caption class="sheet-sr-only">جدول متابعة طلاب ${escapeHtml(board.settings.name)}. اضغط الخانة لتسجيل الحفظ أو إلغائه.</caption>
                <thead>
                    <tr>
                        <th scope="col" class="sheet-student-column"><span>الطالب</span><small>الحفظ ضمن خطة اللوحة</small></th>
                        ${columns.map(n => `<th scope="col" class="sheet-surah-column" data-surah-heading="${n}"><div class="sheet-surah-heading"><small>${n}</small><span>${surahName(n)}</span></div></th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${students.map((s, r) => `
                        <tr data-student-row="${s.id}" class="${s.hidden ? 'is-hidden-student' : ''}">
                            <th scope="row" class="sheet-student-column">
                                <div class="sheet-student-top">
                                    <a href="/edit/${boardId}/students/${s.id}" title="ملف الطالب والأوسمة">${escapeHtml(s.name)}</a>${s.hidden ? '<span class="sheet-hidden-badge">مخفي</span>' : ''}
                                    <button type="button" class="sheet-icon-button" data-options="${s.id}" aria-label="خيارات ${escapeHtml(s.name)}">${uiIcon('ellipsis')}</button>
                                </div>
                                <div class="sheet-student-summary">${summaryHtml(s)}</div>
                            </th>
                            ${columns.map((n, c) => `<td><button type="button" role="checkbox" class="sheet-cell" data-student="${s.id}" data-surah="${n}" data-row="${r}" data-col="${c}" tabindex="-1"></button></td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const cells = [...host.querySelectorAll('.sheet-cell')];
        cells.forEach(updateCell);

        const first = cells[0];
        if (first) {
            first.tabIndex = 0;
            activeCell = `${first.dataset.student}:${first.dataset.surah}`;
            updateSelection(first.dataset.student, Number(first.dataset.surah));
        }
    }

    host.addEventListener('click', async event => {
        const optionsButton = event.target.closest('[data-options]');
        if (optionsButton) {
            actionStudentId = optionsButton.dataset.options;
            const s = student(actionStudentId);
            if (!s) return;
            dialog.querySelector('#studentActionsTitle').textContent = s.name;
            dialog.querySelector('#toggleStudentVisibility').textContent = s.hidden ? 'إظهار الطالب في اللوحة العامة' : 'إخفاء الطالب من اللوحة العامة';
            const link = dialog.querySelector('#studentProfileLink');
            link.href = `/edit/${boardId}/students/${s.id}`;
            link.hidden = false;
            dialog.showModal();
            return;
        }

        const cell = event.target.closest('.sheet-cell');
        if (!cell || cell.getAttribute('aria-disabled') === 'true') return;
        const id = cell.dataset.student, surah = Number(cell.dataset.surah);
        activeCell = `${id}:${surah}`;
        host.querySelectorAll('.sheet-cell[tabindex="0"]').forEach(c => c.tabIndex = -1);
        cell.tabIndex = 0;
        updateSelection(id, surah);
        recorder.toggle(id, surah);
    });

    host.addEventListener('keydown', event => {
        const cell = event.target.closest('.sheet-cell');
        if (!cell) return;
        const r = Number(cell.dataset.row), c = Number(cell.dataset.col);
        const next = (row, col) => host.querySelector(`.sheet-cell[data-row="${row}"][data-col="${col}"]`);
        let target = null;
        if (event.key === 'ArrowRight') target = next(r, c - 1);
        else if (event.key === 'ArrowLeft') target = next(r, c + 1);
        else if (event.key === 'ArrowUp') target = next(r - 1, c);
        else if (event.key === 'ArrowDown') target = next(r + 1, c);
        else if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            cell.click();
            return;
        }
        if (target) {
            event.preventDefault();
            cell.tabIndex = -1;
            target.tabIndex = 0;
            target.focus();
            activeCell = `${target.dataset.student}:${target.dataset.surah}`;
            updateSelection(target.dataset.student, Number(target.dataset.surah));
        }
    });

    searchInput.addEventListener('input', renderTable);
    surahInput.addEventListener('input', renderTable);
    container.addEventListener('click', event => {
        if (event.target.closest('[data-clear-search]')) clearFilters();
    });

    function clearFilters() {
        searchInput.value = '';
        surahInput.value = '';
        renderTable();
        host.scrollLeft = 0;
        host.focus({ preventScroll: true });
    }

    container.querySelector('#clearSheetFilters').onclick = clearFilters;
    container.querySelector('#retrySave').onclick = () => recorder.retry();

    // نافذة اختيار الأجزاء المحتسبة لطالب واحد (برنامج سابق أنهىه)
    function manageStudentPrior() {
        const id = actionStudentId;
        dialog.close();
        const s = student(id);
        if (!s) return;
        const priorDialog = document.createElement('dialog');
        priorDialog.className = 'promote-dialog prior-dialog';
        priorDialog.setAttribute('aria-labelledby', 'priorDialogTitle');
        const current = new Set(board.students[id]?.priorSurahs || []);
        const coveredJuzs = new Set(s.priorSurahs.map(n => SURAHS[n - 1]?.juz).filter(Boolean));
        priorDialog.innerHTML = `
            <div class="promote-head">
                <div><span class="eyebrow">محتسب سابقاً</span><h2 id="priorDialogTitle">${escapeHtml(s.name)}</h2></div>
                <button type="button" class="sheet-icon-button" id="closePrior" aria-label="إغلاق">✕</button>
            </div>
            <p class="promote-summary">اختر الأجزاء التي أتمها الطالب في برنامج سابق. تُضاف لأوسمته ولا تُحتسب في تقدم الخطة الحالية.</p>
            <div class="prior-juz-grid">
                ${Array.from({ length: 30 }, (_, i) => i + 1).map(juz => `
                    <button type="button" class="prior-juz-chip ${coveredJuzs.has(juz) ? 'is-on' : ''}" data-prior-juz="${juz}" aria-pressed="${coveredJuzs.has(juz)}">${juz}</button>
                `).join('')}
            </div>
            <p class="promote-note" id="priorNote"></p>
            <div class="promote-actions">
                <button type="button" class="btn btn-primary" id="savePrior">حفظ</button>
                <button type="button" class="btn btn-secondary" id="clearPrior">مسح المحتسب</button>
                <button type="button" class="btn btn-secondary" id="cancelPrior">إلغاء</button>
            </div>
        `;
        container.append(priorDialog);
        const note = priorDialog.querySelector('#priorNote');
        const selectedJuzs = () => [...priorDialog.querySelectorAll('[data-prior-juz][aria-pressed="true"]')].map(b => Number(b.dataset.priorJuz));
        const refreshNote = () => {
            const juzs = selectedJuzs();
            const surahs = juzs.length ? expandScope({ type: 'juz', juzNumbers: juzs }) : [];
            note.textContent = juzs.length
                ? `سيُحتسب ${priorSummaryText(surahs)}.`
                : 'لا يوجد محتسب إضافي لهذا الطالب.';
        };
        priorDialog.querySelectorAll('[data-prior-juz]').forEach(chip => chip.addEventListener('click', () => {
            const on = chip.getAttribute('aria-pressed') === 'true';
            chip.setAttribute('aria-pressed', String(!on));
            chip.classList.toggle('is-on', !on);
            refreshNote();
        }));
        priorDialog.querySelector('#closePrior').onclick = () => priorDialog.close();
        priorDialog.querySelector('#cancelPrior').onclick = () => priorDialog.close();
        priorDialog.addEventListener('close', () => priorDialog.remove(), { once: true });
        priorDialog.querySelector('#clearPrior').onclick = async () => {
            await savePriorFor(id, []);
        };
        priorDialog.querySelector('#savePrior').onclick = async () => {
            const juzs = selectedJuzs();
            await savePriorFor(id, juzs.length ? expandScope({ type: 'juz', juzNumbers: juzs }) : []);
        };
        async function savePriorFor(studentId, surahNumbers) {
            const button = priorDialog.querySelector('#savePrior');
            button.disabled = true;
            try {
                await BoardRepository.setStudentPrior(boardId, studentId, surahNumbers);
                board.students[studentId].priorSurahs = surahNumbers;
                priorDialog.close();
                if (!disposed) { renderTable(); toast('تم تحديث المحتسب سابقاً', 'success'); }
            } catch (error) {
                console.error(error);
                toast('تعذر حفظ المحتسب', 'error');
                button.disabled = false;
            }
        }
        refreshNote();
        priorDialog.showModal();
    }

    container.querySelector('#addStudentForm').addEventListener('submit', async event => {
        event.preventDefault();
        const name = nameInput.value.trim();
        if (!name || adding) return;
        adding = true;
        const button = container.querySelector('#addStudentBtn');
        button.disabled = true;
        try {
            const id = await BoardRepository.addStudent(boardId, name, Object.keys(board.students).length);
            board.students[id] = { name, memorized: [], completedDate: null };
            if (disposed) return;
            nameInput.value = '';
            searchInput.value = '';
            syncStudentsNav();
            renderTable();
            toast(`تمت إضافة ${name}`, 'success');
        } catch (error) {
            if (!disposed) toast(error.message || 'تعذر إضافة الطالب', 'error');
        } finally {
            adding = false;
            if (!disposed) { button.disabled = false; nameInput.focus(); }
        }
    });

    async function manageStudent(remove) {
        const id = actionStudentId;
        dialog.close();
        if (recorder.isPending(id) || busyStudents.has(id)) {
            toast('انتظر اكتمال حفظ تغييرات الطالب أولاً');
            return;
        }
        busyStudents.add(id);
        try {
            const name = board.students[id].name;
            if (remove) {
                const ok = await confirmDialog({ signal,
                    title: 'حذف الطالب',
                    message: `سيتم حذف "${name}" وكل بيانات حفظه من اللوحة نهائياً.`,
                    confirmText: 'حذف',
                    danger: true
                });
                if (!ok || disposed) return;
                await BoardRepository.deleteStudent(boardId, id);
                delete board.students[id];
                recorder.forget(id);
            } else {
                const newName = await promptDialog({ signal, title: 'تعديل اسم الطالب', label: 'اسم الطالب', value: name });
                if (!newName?.trim() || newName === name || disposed) return;
                await BoardRepository.renameStudent(boardId, id, newName.trim());
                board.students[id].name = newName.trim();
            }
            if (!disposed) {
                syncStudentsNav();
                renderTable();
                updateStatus();
                const options = [...host.querySelectorAll('[data-options]')].find(button => button.dataset.options === id);
                (options || searchInput).focus({ preventScroll: true });
                toast(remove ? 'تم حذف الطالب' : 'تم تحديث الاسم', 'success');
            }
        } catch {
            if (!disposed) toast('تعذر حفظ التغيير، حاول مجدداً', 'error');
        } finally {
            busyStudents.delete(id);
            if (!disposed) host.querySelectorAll('.sheet-cell').forEach(updateCell);
        }
    }

    container.querySelector('#renameStudent').onclick = () => manageStudent(false);

    container.querySelector('#toggleStudentVisibility').onclick = async () => {
        const id = actionStudentId;
        const current = board.students[id];
        dialog.close();
        if (!current) return;
        const hidden = current.hidden !== true;
        try {
            await BoardRepository.setStudentVisibility(boardId, id, hidden, hidden ? 'hidden' : 'shown');
            current.hidden = hidden;
            current.visibilityOverride = hidden ? 'hidden' : 'shown';
            renderTable();
            syncStudentsNav();
            toast(hidden ? 'تم إخفاء الطالب من اللوحة العامة' : 'تم إظهار الطالب في اللوحة العامة', 'success');
        } catch (error) {
            console.error(error);
            toast('تعذر تغيير ظهور الطالب', 'error');
        }
    };

    // محتسب سابقاً لطالب واحد: يُضاف لأوسمته دون التأثير على تقدم الخطة
    container.querySelector('#editStudentPrior').onclick = () => manageStudentPrior();
    container.querySelector('#deleteStudent').onclick = () => manageStudent(true);

    renderTable();
    return () => {
        disposed = true;
        if (dialog.open) dialog.close();
        if (expandedDialog.open) expandedDialog.close();
    };
}
