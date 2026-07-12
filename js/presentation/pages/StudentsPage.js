// إدارة الطلاب: إضافة سريعة + تسجيل الحفظ بلمسة واحدة لكل سورة
import { authState } from '../../core/authState.js';
import { BoardRepository } from '../../data/repositories/BoardRepository.js';
import { Student } from '../../domain/models/Student.js';
import { topbar, bindTopbar, toast, confirmDialog, promptDialog, escapeHtml } from '../views/ui.js';
import { renderMemorizationChipGrid } from '../views/SurahPickerView.js';
import { LIMITS } from '../../core/config.js';

export default async function StudentsPage(container, { params }) {
    const user = authState.user();
    const boardId = params.boardId;

    let board = await BoardRepository.get(boardId);
    if (!board) {
        container.innerHTML = `<div id="error-msg" style="display:block;"><p>اللوحة غير موجودة.</p></div>`;
        return;
    }
    if (board.ownerUid !== user.uid) {
        container.innerHTML = `<div id="error-msg" style="display:block;"><p>لا تملك صلاحية إدارة هذه اللوحة.</p></div>`;
        return;
    }

    let expandedId = null;

    container.innerHTML = `
        ${topbar('dashboard')}
        <div class="page-title-row">
            <div>
                <h1 class="page-title">${escapeHtml(board.settings.name)}</h1>
                <p class="page-subtitle">إدارة الطلاب وتسجيل الحفظ</p>
            </div>
            <div style="display:flex; gap:10px;">
                <a href="/edit/${boardId}" class="btn btn-secondary">الإعدادات</a>
                <a href="/b/${boardId}" class="btn btn-secondary">عرض اللوحة العامة</a>
            </div>
        </div>

        <div class="add-student-row">
            <input type="text" class="form-input" id="newStudentName" placeholder="اسم الطالب الجديد" maxlength="${LIMITS.MAX_NAME_LENGTH}">
            <button class="btn btn-primary" id="addStudentBtn">＋ إضافة</button>
        </div>

        <div id="studentsHost"></div>
    `;
    bindTopbar(container);

    const host = container.querySelector('#studentsHost');
    const nameInput = container.querySelector('#newStudentName');

    function orderedScope() {
        return board.orderedSurahs();
    }

    function buildStudent(id, data) {
        return new Student(id, data, orderedScope());
    }

    function renderList() {
        const entries = Object.entries(board.students);
        if (entries.length === 0) {
            host.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-emoji">👥</div>
                    <p class="empty-state-text">لا يوجد طلاب بعد — أضف أول طالب من الحقل أعلاه.</p>
                </div>`;
            return;
        }

        const students = entries.map(([id, data]) => buildStudent(id, data));
        students.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

        host.innerHTML = `<div class="students-list">${students.map(studentRowHtml).join('')}</div>`;

        host.querySelectorAll('.student-row-header').forEach(header => {
            header.addEventListener('click', () => {
                const id = header.closest('.student-row').dataset.id;
                expandedId = expandedId === id ? null : id;
                renderList();
            });
        });

        host.querySelectorAll('[data-expand-host]').forEach(expandHost => {
            const id = expandHost.dataset.expandHost;
            const student = students.find(s => s.id === id);
            if (!student) return;
            const memorizedSet = new Set(student.memorizedInScope);
            expandHost.appendChild(renderMemorizationChipGrid({
                orderedSurahs: orderedScope(),
                memorizedSet,
                onToggle: async (n, nowMemorized) => {
                    const wasComplete = student.isCompleted;
                    if (nowMemorized) memorizedSet.add(n); else memorizedSet.delete(n);
                    const willBeComplete = orderedScope().every(s => memorizedSet.has(s));
                    try {
                        await BoardRepository.setSurah(boardId, id, n, nowMemorized, willBeComplete, wasComplete);
                        // تحديث محلي متفائل لتفادي إعادة تحميل كاملة
                        const memorizedArr = board.students[id].memorized || [];
                        board.students[id].memorized = nowMemorized
                            ? [...new Set([...memorizedArr, n])]
                            : memorizedArr.filter(x => x !== n);
                        if (willBeComplete && !wasComplete) {
                            board.students[id].completedDate = { toMillis: () => Date.now() };
                            toast(`🎉 ${student.name} أتم الحفظ بالكامل!`, 'success');
                        } else if (!willBeComplete && wasComplete) {
                            board.students[id].completedDate = null;
                        }
                        renderMiniProgress(id);
                    } catch (err) {
                        console.error(err);
                        toast('تعذر حفظ التغيير — تحقق من الاتصال', 'error');
                        throw err;
                    }
                },
            }));
        });

        host.querySelectorAll('[data-rename]').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.stopPropagation();
                const id = btn.dataset.rename;
                const current = board.students[id]?.name || '';
                const newName = await promptDialog({ title: 'إعادة تسمية الطالب', label: '', value: current });
                if (!newName || newName === current) return;
                try {
                    await BoardRepository.renameStudent(boardId, id, newName);
                    board.students[id].name = newName;
                    renderList();
                    toast('تم تحديث الاسم', 'success');
                } catch (err) {
                    console.error(err);
                    toast('تعذر تحديث الاسم', 'error');
                }
            });
        });

        host.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.stopPropagation();
                const id = btn.dataset.delete;
                const name = board.students[id]?.name || '';
                const ok = await confirmDialog({
                    title: 'حذف الطالب',
                    message: `سيتم حذف "${name}" وكل بيانات حفظه من اللوحة نهائياً.`,
                    confirmText: 'حذف',
                    danger: true,
                });
                if (!ok) return;
                try {
                    await BoardRepository.deleteStudent(boardId, id);
                    delete board.students[id];
                    if (expandedId === id) expandedId = null;
                    renderList();
                    toast('تم حذف الطالب', 'success');
                } catch (err) {
                    console.error(err);
                    toast('تعذر حذف الطالب', 'error');
                }
            });
        });
    }

    function renderMiniProgress(id) {
        const row = host.querySelector(`.student-row[data-id="${id}"]`);
        if (!row) return;
        const student = buildStudent(id, board.students[id]);
        row.classList.toggle('completed', student.isCompleted);
        const fill = row.querySelector('.mini-progress-fill');
        const pct = row.querySelector('.student-row-pct');
        const meta = row.querySelector('.expand-meta-count');
        if (fill) fill.style.width = student.progressPercentage + '%';
        if (pct) pct.textContent = student.progressPercentage + '%';
        if (meta) meta.textContent = student.formattedSurahsCount;
    }

    function studentRowHtml(student) {
        const isExpanded = expandedId === student.id;
        return `
            <div class="student-row ${student.isCompleted ? 'completed' : ''}" data-id="${student.id}">
                <div class="student-row-header">
                    ${student.isCompleted ? '<span style="font-size:1.2rem;">👑</span>' : ''}
                    <span class="student-row-name">${escapeHtml(student.name)}</span>
                    <div class="mini-progress"><div class="mini-progress-fill" style="width:${student.progressPercentage}%;"></div></div>
                    <span class="student-row-pct">${student.progressPercentage}%</span>
                    <button class="menu-btn" data-rename="${student.id}" title="إعادة تسمية">✎</button>
                    <button class="menu-btn" data-delete="${student.id}" title="حذف">🗑</button>
                </div>
                ${isExpanded ? `
                    <div class="student-expand">
                        <div class="student-expand-meta">
                            <span class="expand-meta-count">${student.formattedSurahsCount}</span>
                            <span>اضغط على السورة لتسجيل الحفظ</span>
                        </div>
                        <div data-expand-host="${student.id}"></div>
                    </div>
                ` : ''}
            </div>`;
    }

    async function addStudent() {
        const name = nameInput.value.trim();
        if (!name) return;
        const addBtn = container.querySelector('#addStudentBtn');
        addBtn.disabled = true;
        try {
            const currentCount = Object.keys(board.students).length;
            const id = await BoardRepository.addStudent(boardId, name, currentCount);
            board.students[id] = { name, memorized: [], completedDate: null };
            nameInput.value = '';
            renderList();
            toast('تمت إضافة الطالب', 'success');
        } catch (err) {
            console.error(err);
            toast(err.message || 'تعذر إضافة الطالب', 'error');
        } finally {
            addBtn.disabled = false;
            nameInput.focus();
        }
    }

    container.querySelector('#addStudentBtn').addEventListener('click', addStudent);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addStudent(); } });

    renderList();
}
