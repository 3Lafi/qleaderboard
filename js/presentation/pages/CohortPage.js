// صفحة الدفعة: تعديل بياناتها، إضافة الطلاب بأسماء متتابعة، وإنشاء برنامج (لوحة) لها
import { cohortSummaryText } from '../../domain/models/Cohort.js';
import { defaultSettings, sanitizeSettings } from '../../domain/models/BoardSettings.js';
import { escapeHtml, confirmDialog } from '../views/ui.js';
import { createFeedbackState } from '../layout/FeedbackStateView.js';
import { LIMITS } from '../../shared/config.js';
import { expandScope } from '../../shared/quran-data.js';
import { planProgression, applyProgression, orderedPrograms } from '../../domain/usecases/CohortProgression.js';

export default async function CohortPage(container, { toast, params, layout, navigate, user, services, setTitle, signal, onDispose }) {
    const CohortRepository = services.cohorts;
    const BoardRepository = services.boards;
    const cohortId = params?.cohortId;

    let cohort = null;
    let disposed = false;
    onDispose(() => { disposed = true; });
    let saving = false;

    setTitle('الدفعة — وسام');
    layout?.setActiveBoard(null);
    container.innerHTML = `<div id="cohortHost"><p role="status">جارِ تحميل الدفعة…</p></div>`;
    const host = container.querySelector('#cohortHost');

    try {
        cohort = await CohortRepository.get(cohortId);
    } catch (error) {
        console.error(error);
    }

    if (signal.aborted) return;
    if (!cohort || (cohort.ownerUid && cohort.ownerUid !== user?.uid)) {
        host.replaceChildren(createFeedbackState({
            type: 'unavailable',
            icon: '🔒',
            eyebrow: 'الدفعات',
            title: cohort ? 'هذه الدفعة مسجلة لمعلم آخر' : 'الدفعة غير موجودة',
            message: cohort ? 'يمكنك العودة إلى دفعاتك.' : 'تحقق من الرابط أو أنشئ دفعة جديدة.',
            actions: [
                { label: 'الدفعات', href: '/cohorts', primary: true },
                { label: 'لوحاتي', href: '/dashboard' }
            ]
        }));
        return;
    }

    setTitle(`${cohort.name} — دفعة — وسام`);

    function render() {
        layout?.setLocationTrail([{ label: 'الدفعات', href: '/cohorts' }, { label: cohort.name }]);
        const students = cohort.listStudents();
        host.innerHTML = `
            <div class="page-title-row">
                <div>
                    <a class="cohort-back" href="/cohorts">← كل الدفعات</a>
                    <h1 class="page-title" id="cohortTitle">${escapeHtml(cohort.name)}</h1>
                    <p class="page-subtitle" id="cohortSummary">${escapeHtml(cohortSummaryText(cohort))}</p>
                </div>
                <div class="cohort-actions">
                    <button type="button" class="btn btn-secondary" id="editCohort">تعديل الاسم</button>
                    <button type="button" class="btn btn-primary" id="createProgram">إنشاء برنامج لهذه الدفعة</button>
                </div>
            </div>

            <form class="cohort-edit" id="cohortEditForm" hidden>
                <label class="cohort-field"><span>اسم الدفعة</span><input type="text" id="editCohortName" value="${escapeHtml(cohort.name)}" maxlength="${LIMITS.MAX_NAME_LENGTH}" required></label>
                <button type="submit" class="btn btn-primary" id="saveCohort">حفظ</button>
                <button type="button" class="btn btn-secondary" id="cancelCohortEdit">إلغاء</button>
            </form>

            <section class="cohort-path">
                <div class="cohort-students-head">
                    <h2>مسار الدفعة</h2>
                    <p>البرامج المرتبطة بهذه الدفعة بالترتيب. الطالب الذي يُتمّ برنامجاً ينتقل تلقائياً إلى التالي.</p>
                </div>
                <div id="cohortPathList"><p class="cohort-students-empty">جارِ تحميل البرامج…</p></div>
                <div class="cohort-path-actions">
                    <button type="button" class="btn btn-primary" id="syncProgression">مزامنة التقدّم الآن</button>
                    <span class="cohort-path-status" id="syncStatus" role="status" aria-live="polite"></span>
                </div>
            </section>

            <section class="cohort-students">
                <div class="cohort-students-head">
                    <h2>طلاب الدفعة <bdi class="numeric-value">${students.length}</bdi></h2>
                    <p>أضف الأسماء واحداً واحداً، ويبقى الحقل مفتوحاً للإضافة السريعة.</p>
                </div>

                <form class="cohort-add" id="cohortAddForm">
                    <input type="text" id="cohortStudentName" placeholder="اسم الطالب…" maxlength="${LIMITS.MAX_NAME_LENGTH}" autocomplete="off" aria-label="اسم الطالب الجديد">
                    <button type="submit" class="btn btn-primary" id="addCohortStudent">إضافة</button>
                    <button type="button" class="btn btn-secondary" id="bulkToggle">إضافة قائمة أسماء</button>
                </form>

                <form class="cohort-bulk" id="cohortBulkForm" hidden>
                    <label class="cohort-field"><span>ألصق الأسماء، كل اسم في سطر</span><textarea id="cohortBulkNames" rows="5" placeholder="محمد أحمد&#10;عبد الله سالم"></textarea></label>
                    <button type="submit" class="btn btn-primary" id="saveBulk">إضافة الكل</button>
                    <button type="button" class="btn btn-secondary" id="cancelBulk">إلغاء</button>
                </form>

                <div id="cohortStudentsList">
                    ${students.length ? students.map(studentRowHtml).join('') : '<p class="cohort-students-empty">لا يوجد طلاب في هذه الدفعة بعد.</p>'}
                </div>
            </section>
        `;
        bind();
    }

    function studentRowHtml(student) {
        return `
            <div class="cohort-student" data-cohort-student="${escapeHtml(student.id)}">
                <span class="cohort-student-avatar" aria-hidden="true">${escapeHtml(Array.from(student.name || 'ط')[0])}</span>
                <span class="cohort-student-name">${escapeHtml(student.name)}</span>
                <button type="button" class="cohort-student-btn" data-rename="${escapeHtml(student.id)}" aria-label="تعديل اسم ${escapeHtml(student.name)}">تعديل</button>
                <button type="button" class="cohort-student-btn is-danger" data-remove="${escapeHtml(student.id)}" aria-label="حذف ${escapeHtml(student.name)}">حذف</button>
            </div>
        `;
    }

    function bind() {
        const editForm = host.querySelector('#cohortEditForm');
        host.querySelector('#editCohort').onclick = () => {
            editForm.hidden = !editForm.hidden;
            if (!editForm.hidden) host.querySelector('#editCohortName').focus();
        };
        host.querySelector('#cancelCohortEdit').onclick = () => { editForm.hidden = true; };

        editForm.addEventListener('submit', async event => {
            event.preventDefault();
            const name = host.querySelector('#editCohortName').value.trim();
            if (!name) return;
            try {
                await CohortRepository.update(cohort.id, { name });
                cohort.name = name;
                setTitle(`${name} — دفعة — وسام`);
                toast('تم حفظ بيانات الدفعة', 'success');
                render();
            } catch (error) {
                console.error(error);
                toast(error?.message || 'تعذر الحفظ', 'error');
            }
        });

        // إضافة طالب (مع إبقاء الحقل مفتوحاً للإضافة المتتابعة)
        const addForm = host.querySelector('#cohortAddForm');
        const nameInput = host.querySelector('#cohortStudentName');
        addForm.addEventListener('submit', async event => {
            event.preventDefault();
            const name = nameInput.value.trim();
            if (!name || saving) return;
            saving = true;
            const button = host.querySelector('#addCohortStudent');
            button.disabled = true;
            try {
                const id = await CohortRepository.addStudent(cohort.id, name, cohort.studentsCount());
                cohort.students[id] = { name };
                if (disposed) return;
                nameInput.value = '';
                render();
                await syncProgression({ silent: true });
                host.querySelector('#cohortStudentName')?.focus({ preventScroll: true });
                host.querySelector('#cohortSummary').textContent = cohortSummaryText(cohort);
            } catch (error) {
                console.error(error);
                toast(error?.message || 'تعذر إضافة الطالب', 'error');
            } finally {
                saving = false;
                if (host.querySelector('#addCohortStudent')) host.querySelector('#addCohortStudent').disabled = false;
            }
        });

        // إضافة قائمة أسماء مرة واحدة
        const bulkForm = host.querySelector('#cohortBulkForm');
        host.querySelector('#bulkToggle').onclick = () => {
            bulkForm.hidden = false;
            host.querySelector('#cohortBulkNames').focus();
        };
        host.querySelector('#cancelBulk').onclick = () => { bulkForm.hidden = true; };
        bulkForm.addEventListener('submit', async event => {
            event.preventDefault();
            const names = host.querySelector('#cohortBulkNames').value.split('\n').map(n => n.trim()).filter(Boolean);
            if (!names.length) return;
            const button = host.querySelector('#saveBulk');
            button.disabled = true;
            try {
                const ids = await CohortRepository.addStudents(cohort.id, names, cohort.studentsCount());
                ids.forEach((id, index) => { cohort.students[id] = { name: names[index] }; });
                toast(`تمت إضافة ${ids.length} طالباً`, 'success');
                render();
                await syncProgression({ silent: true });
            } catch (error) {
                console.error(error);
                toast(error?.message || 'تعذر إضافة الأسماء', 'error');
                button.disabled = false;
            }
        });

        // تعديل/حذف طالب
        host.querySelector('#cohortStudentsList').addEventListener('click', async event => {
            const renameBtn = event.target.closest('[data-rename]');
            const removeBtn = event.target.closest('[data-remove]');
            if (renameBtn) {
                const id = renameBtn.dataset.rename;
                const current = cohort.students[id]?.name || '';
                const next = window.prompt('اسم الطالب', current);
                if (!next?.trim() || next.trim() === current) return;
                try {
                    await CohortRepository.renameStudent(cohort.id, id, next.trim());
                    cohort.students[id].name = next.trim();
                    render();
                    toast('تم تحديث الاسم', 'success');
                } catch (error) {
                    console.error(error);
                    toast('تعذر تحديث الاسم', 'error');
                }
                return;
            }
            if (removeBtn) {
                const id = removeBtn.dataset.remove;
                const name = cohort.students[id]?.name || '';
                const ok = await confirmDialog({ signal,
                    title: 'حذف الطالب من الدفعة',
                    message: `سيُحذف "${name}" من هذه الدفعة. سجلات الحفظ في البرامج السابقة لا تتأثر.`,
                    confirmText: 'حذف',
                    danger: true
                });
                if (!ok) return;
                try {
                    await CohortRepository.removeStudent(cohort.id, id);
                    delete cohort.students[id];
                    render();
                    toast('تم حذف الطالب من الدفعة', 'success');
                } catch (error) {
                    console.error(error);
                    toast('تعذر الحذف', 'error');
                }
            }
        });

        // إنشاء برنامج (لوحة) لهذه الدفعة بكل طلابها
        host.querySelector('#createProgram').onclick = () => openProgramDialog();
    }

    function openProgramDialog() {
        const students = cohort.listStudents();
        const dialog = document.createElement('dialog');
        dialog.className = 'promote-dialog cohort-program-dialog';
        dialog.setAttribute('aria-labelledby', 'cohortProgramTitle');
        dialog.innerHTML = `
            <div class="promote-head">
                <div><span class="eyebrow">برنامج جديد</span><h2 id="cohortProgramTitle">إنشاء برنامج لـ«${escapeHtml(cohort.name)}»</h2></div>
                <button type="button" class="sheet-icon-button" id="closeProgramDialog" aria-label="إغلاق">✕</button>
            </div>
            <p class="promote-summary">سيُنشأ برنامج جديد ويُضاف إليه <strong>${students.length}</strong> طالباً من هذه الدفعة، ثم تفتح إعدادات البرنامج لضبط خطة الحفظ.</p>
            <label class="promote-name">
                <span>اسم البرنامج</span>
                <input type="text" id="programName" value="${escapeHtml(cohort.name)}" maxlength="${LIMITS.MAX_NAME_LENGTH}">
            </label>
            <fieldset class="promote-field">
                <legend>خطة الحفظ المبدئية</legend>
                <div class="promote-choices">
                    <label class="promote-choice">
                        <input type="radio" name="programScope" value="juz30" checked>
                        <span><strong>جزء 30 (عمّ)</strong><small>يبدأ من النبأ إلى الناس — الخطة المعتادة للبداية.</small></span>
                    </label>
                    <label class="promote-choice">
                        <input type="radio" name="programScope" value="juz29">
                        <span><strong>جزء 29 (تبارك)</strong><small>يبدأ من الملك إلى المرسلات، ويُحتسب جزء 30 تلقائياً في الأوسمة.</small></span>
                    </label>
                </div>
            </fieldset>
            <p class="promote-note" id="programNote"></p>
            <div class="promote-actions">
                <button type="button" class="btn btn-primary" id="confirmProgram">إنشاء البرنامج وإضافة الطلاب</button>
                <button type="button" class="btn btn-secondary" id="cancelProgram">إلغاء</button>
            </div>
        `;
        container.append(dialog);
        dialog.querySelector('#closeProgramDialog').onclick = () => dialog.close();
        dialog.querySelector('#cancelProgram').onclick = () => dialog.close();
        dialog.addEventListener('close', () => dialog.remove(), { once: true });

        const scopeFor = value => {
            const juzNumber = Number(value.replace('juz', ''));
            return { type: 'juz', juzNumbers: [juzNumber], curriculum: null, surahNumbers: expandScope({ type: 'juz', juzNumbers: [juzNumber] }) };
        };

        dialog.querySelectorAll('input[name="programScope"]').forEach(input => input.addEventListener('change', () => {
            const value = dialog.querySelector('input[name="programScope"]:checked').value;
            const scope = scopeFor(value);
            dialog.querySelector('#programNote').textContent = `${scope.surahNumbers.length} سورة في الخطة · يُحتسب ما قبلها تلقائياً في الأوسمة.`;
        }));
        dialog.querySelector('#programNote').textContent = `${scopeFor('juz30').surahNumbers.length} سورة في الخطة · يُحتسب ما قبلها تلقائياً في الأوسمة.`;

        dialog.querySelector('#confirmProgram').onclick = async () => {
            const button = dialog.querySelector('#confirmProgram');
            const name = dialog.querySelector('#programName').value.trim();
            if (!name) { toast('اكتب اسم البرنامج', 'error'); return; }
            button.disabled = true;
            button.textContent = 'جارٍ الإنشاء…';
            try {
                const scope = scopeFor(dialog.querySelector('input[name="programScope"]:checked').value);
                const settings = sanitizeSettings({ ...defaultSettings(), name, scope, direction: 'reverse', priorMode: 'auto', cohortId: cohort.id });
                const boardId = await BoardRepository.create(user.uid, settings);
                try {
                    await CohortRepository.linkProgram(cohort.id, boardId);
                } catch (linkError) {
                    console.error('Failed to link program to cohort', linkError);
                }
                let added = 0;
                for (const student of students) {
                    try {
                        await BoardRepository.addStudent(boardId, student.name, added, { cohortStudentId: student.id, hidden: true });
                        added += 1;
                    } catch (error) {
                        console.error('cohort import failed', student.name, error);
                    }
                }
                const boards = await BoardRepository.listMine(user.uid);
                await applyProgression(planProgression({ cohort, boards }), {
                    addStudent: (targetId, studentName, count, extra) => BoardRepository.addStudent(targetId, studentName, count, extra),
                    setStudentVisibility: (targetId, studentId, hidden, cohortStudentId) => BoardRepository.setStudentVisibility(targetId, studentId, hidden, '', cohortStudentId),
                });
                dialog.close();
                toast(`أُنشئ «${name}» بـ ${added} طالباً`, 'success');
                navigate(`/edit/${boardId}`);
            } catch (error) {
                console.error(error);
                toast(error?.message || 'تعذر إنشاء البرنامج', 'error');
                button.disabled = false;
                button.textContent = 'إنشاء البرنامج وإضافة الطلاب';
            }
        };
        dialog.showModal();
    }

    // مسار الدفعة: البرامج المرتبطة بالترتيب + مزامنة التقدّم
    let linkedBoards = [];
    async function loadPath() {
        const host2 = host.querySelector('#cohortPathList');
        try {
            const mine = await BoardRepository.listMine(user.uid);
            linkedBoards = orderedPrograms(cohort, mine);
        } catch (error) {
            console.error(error);
        }
        if (!linkedBoards.length) {
            host2.innerHTML = '<p class="cohort-students-empty">لا يوجد برنامج مرتبط بعد. اربط الدفعة من إعدادات أي لوحة، أو أنشئ برنامجاً جديداً من الأعلى.</p>';
            host.querySelector('#syncProgression').disabled = true;
            return;
        }
        host2.innerHTML = `
            <ol class="cohort-path-list">
                ${linkedBoards.map((board, index) => {
                    const members = Object.values(board.students || {}).filter(s => s?.cohortStudentId && s.hidden !== true);
                    const done = members.filter(s => {
                        const scopeSet = board.orderedSurahs();
                        const memorized = new Set(s.memorized || []);
                        return scopeSet.length > 0 && scopeSet.every(n => memorized.has(n));
                    }).length;
                    return `
                        <li class="cohort-path-item ${done === members.length && members.length ? 'is-done' : ''}">
                            <span class="cohort-path-step">${index + 1}</span>
                            <span class="cohort-path-copy">
                                <a href="/edit/${escapeHtml(board.id)}/students">${escapeHtml(board.settings?.name || 'برنامج')}</a>
                                <small><bdi class="numeric-value">${members.length}</bdi> من الدفعة · <bdi class="numeric-value">${done}</bdi> أتمّوا</small>
                            </span>
                        </li>
                    `;
                }).join('')}
            </ol>
        `;
        host.querySelector('#syncProgression').disabled = false;
    }

    async function syncProgression({ silent = false } = {}) {
        const status = host.querySelector('#syncStatus');
        const button = host.querySelector('#syncProgression');
        button.disabled = true;
        if (status) status.textContent = 'جارٍ المزامنة…';
        try {
            const plan = planProgression({ cohort, boards: linkedBoards });
            if (!plan.total) {
                if (status) status.textContent = 'لا يوجد من ينقل حالياً — كل مجتاز وصل إلى برنامجه التالي.';
                return;
            }
            const result = await applyProgression(plan, {
                addStudent: (boardId, name, count, extra) => BoardRepository.addStudent(boardId, name, count, extra),
                setStudentVisibility: (boardId, studentId, hidden, cohortStudentId) => BoardRepository.setStudentVisibility(boardId, studentId, hidden, '', cohortStudentId),
            });
            if (status) status.textContent = `تمت مزامنة ${result.added + result.updated} سجلاً${result.failed.length ? ` — تعذّر ${result.failed.length}` : ''}.`;
            if (!silent) toast('تم تحديث ظهور الطلاب حسب تقدّمهم', 'success');
            await loadPath();
        } catch (error) {
            console.error(error);
            if (status) status.textContent = 'تعذرت المزامنة، حاول مرة أخرى.';
        } finally {
            if (host.querySelector('#syncProgression')) host.querySelector('#syncProgression').disabled = false;
        }
    }

    host.querySelector('#syncProgression')?.addEventListener('click', () => syncProgression());
    render();
    await loadPath();
    // مزامنة تلقائية عند فتح الدفعة: المجتاز يظهر في البرنامج التالي بلا خطوة يدوية
    syncProgression({ silent: true });
    return () => { disposed = true; };
}
