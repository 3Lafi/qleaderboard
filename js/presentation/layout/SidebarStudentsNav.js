import { escapeHtml } from '../views/ui.js';
import { normalizeArabic } from '../../shared/text-utils.js';
import { NAV_ICONS } from './NavigationIcons.js';

export function normalizeStudents(students = []) {
    return (Array.isArray(students) ? students : []).filter(Boolean)
        .map(student => ({ id: String(student.id ?? ''), name: String(student.name ?? '').trim() || 'طالب بدون اسم' }))
        .filter(student => student.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'ar') || a.id.localeCompare(b.id));
}

// Student navigation is an optional shortcut, not a second editing workspace.
export function updateStudentsNav(sidebar, context) {
    const host = sidebar.querySelector('#sidebarStudentsHost');
    if (!host) return;
    host.hidden = !context?.boardId;
    if (!context?.boardId) { host.replaceChildren(); delete host.dataset.boardId; return; }
    const fresh = host.dataset.boardId !== String(context.boardId);
    if (fresh) {
        host._rows = '';
        host.dataset.boardId = String(context.boardId);
        host.innerHTML = `<details class="student-shortcuts"><summary>ملفات الطلاب <span class="shortcut-count"></span><span class="nav-chevron">${NAV_ICONS.back}</span></summary>
            <label class="nav-search">${NAV_ICONS.search}<input type="search" id="sidebarStudentSearch" aria-label="ابحث في ملفات الطلاب" placeholder="ابحث عن طالب" autocomplete="off"></label>
            <nav class="student-shortcut-list" aria-label="ملفات الطلاب"></nav><p class="nav-empty" role="status" id="studentShortcutEmpty" hidden>لا يوجد طالب مطابق.</p>
        </details>`;
    }
    const roster = normalizeStudents(context.students);
    host.querySelector('.shortcut-count').textContent = roster.length;
    const active = String(context.activeStudentId || '');
    const signature = JSON.stringify([roster.map(s => [s.id, s.name]), active, context.ownerView, context.linkable]);
    if (host._rows !== signature) {
        const focused = host.contains(document.activeElement) ? document.activeElement?.dataset.studentId : '';
        host.querySelector('.student-shortcut-list').innerHTML = roster.map(student => {
            const linkable = context.linkable !== false;
            const tag = linkable ? 'a' : 'span';
            const href = `/${context.ownerView ? 'edit' : 'b'}/${encodeURIComponent(context.boardId)}/students/${encodeURIComponent(student.id)}`;
            return `<${tag} ${linkable ? `href="${href}"` : ''} data-student-id="${escapeHtml(student.id)}" data-name="${escapeHtml(normalizeArabic(student.name))}" class="student-shortcut ${student.id === active ? 'active' : ''}" ${linkable && student.id === active ? 'aria-current="page"' : ''}>${escapeHtml(student.name)}</${tag}>`;
        }).join('');
        host._rows = signature;
        if (focused) [...host.querySelectorAll('[data-student-id]')].find(row => row.dataset.studentId === focused)?.focus();
    }
    if (active && (fresh || host.dataset.activeStudent !== active)) host.querySelector('details').open = true;
    host.dataset.activeStudent = active;
    filterStudents(host);
}

function filterStudents(host) {
    const query = normalizeArabic(host.querySelector('input')?.value || '').trim();
    let count = 0;
    host.querySelectorAll('[data-student-id]').forEach(row => {
        row.hidden = !row.dataset.name.includes(query);
        if (!row.hidden) count++;
    });
    const empty = host.querySelector('#studentShortcutEmpty');
    empty.hidden = count > 0;
    empty.textContent = host.querySelector('[data-student-id]') ? 'لا يوجد طالب مطابق.' : 'لا يوجد طلاب في هذه اللوحة بعد.';
}

export function bindStudentsNav(sidebar) {
    sidebar.addEventListener('input', event => {
        if (event.target.id === 'sidebarStudentSearch') filterStudents(sidebar.querySelector('#sidebarStudentsHost'));
    });
}
