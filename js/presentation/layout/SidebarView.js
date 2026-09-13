import { escapeHtml, toast } from '../views/ui.js';
import { normalizeArabic } from '../../shared/text-utils.js';
import { primaryDestinations, primarySection, boardDestinations, isBoardOwner } from '../../application/navigation/navigation-model.js';
import { NAV_ICONS as ICONS } from './NavigationIcons.js';
import { updateStudentsNav, bindStudentsNav } from './SidebarStudentsNav.js';

export function sidebarHtml(activeKey = '', context = {}) {
    return `
        <div class="sidebar-inner">
            <div class="sidebar-header">
                <a href="${context.user ? '/dashboard' : '/'}" class="sidebar-brand" id="sidebarBrand" aria-label="وسام — ${context.user ? 'لوحاتي' : 'الرئيسية'}">
                    <img src="/images/app-icons/badge-v10-192.png" alt="" width="42" height="42">
                    <span><strong>وسام</strong><small>رحلة حفظ تستحق الاحتفاء</small></span>
                </a>
                <button class="nav-icon-button sidebar-close-btn" id="sidebarCloseBtn" type="button" aria-label="إغلاق القائمة">${ICONS.close}</button>
            </div>
            <div class="sidebar-body">
                <nav class="sidebar-global" id="sidebarGlobalNav" aria-label="التنقل الرئيسي">${renderGlobalNavHtml(activeKey, context.user)}</nav>
                <div id="sidebarCreateHost"></div>
                <section class="sidebar-workspace" id="sidebarWorkspaceHost"></section>
                <section class="sidebar-picker" id="sidebarBoardPicker" hidden aria-label="اختيار اللوحة"></section>
                <nav class="sidebar-board-nav" id="sidebarContextHost" aria-label="صفحات اللوحة" hidden></nav>
                <section class="sidebar-roster" id="sidebarStudentsHost" hidden></section>
            </div>
            <div class="sidebar-footer" id="sidebarUserSection"></div>
        </div>`;
}

export function renderGlobalNavHtml(activeKey = '', user = null, board = null) {
    const section = primarySection(activeKey, user, board);
    return primaryDestinations(user).map(item => `
        <a href="${item.href}" class="sidebar-nav-link ${section === item.key ? 'active' : ''}" data-nav-key="${item.key}" ${section === item.key ? `aria-current="${activeKey === item.key ? 'page' : 'true'}"` : ''}>
            ${ICONS[item.icon]}<span>${item.label}</span>
        </a>`).join('');
}

function workspaceHtml(board, user, pickerOpen) {
    if (!user && !board?.id) return '';
    const owned = isBoardOwner(board, user);
    const name = board?.settings?.name || board?.name || 'اختر لوحة';
    const meta = board?.id ? (board.settings ? (board.settings.isPublic === false ? 'لوحة خاصة' : 'لوحة عامة') : 'جارٍ تحميل اللوحة…') : 'انتقل إلى لوحة المتابعة';
    const copy = `<span class="workspace-icon">${ICONS.boards}</span><span class="workspace-copy"><strong>${escapeHtml(name)}</strong><small>${meta}</small></span>`;
    return `<p class="nav-section-label">${board?.id ? 'اللوحة الحالية' : 'لوحات المتابعة'}</p>
        ${user && (!board?.id || owned) ? `<button class="workspace-switcher" id="boardSwitcherBtn" type="button" aria-expanded="${pickerOpen}" aria-controls="sidebarBoardPicker">${copy}<span class="nav-chevron">${ICONS.back}</span></button>` : `<div class="workspace-switcher">${copy}</div>`}`;
}

export function renderContextHtml(board, activeKey = '', user = null, activeStudentId = '') {
    return boardDestinations(board, user).map(item => `
        <a href="${item.href}" class="sidebar-nav-link board-nav-link ${activeKey === item.key ? 'active' : ''}" ${activeKey === item.key ? `aria-current="${activeStudentId ? 'true' : 'page'}"` : ''}>
            ${ICONS[item.icon]}<span>${item.label}</span>
        </a>`).join('');
}

export function renderBoardPickerHtml(boards = [], activeBoard = null) {
    return `<label class="nav-search">${ICONS.search}<input type="search" id="boardPickerSearch" aria-label="ابحث باسم اللوحة" placeholder="ابحث باسم اللوحة" autocomplete="off"></label>
        <nav class="picker-list" id="boardPickerList" aria-label="اختيار لوحة">
            ${boards.map(board => {
                const name = board.settings?.name || board.name || 'لوحة بدون اسم';
                const selected = String(board.id) === String(activeBoard?.id);
                return `<a href="/edit/${encodeURIComponent(board.id)}/students" class="picker-row ${selected ? 'active' : ''}" data-board-row data-name="${escapeHtml(normalizeArabic(name))}" ${selected ? 'aria-current="true"' : ''}><span>${escapeHtml(name)}</span>${selected ? ICONS.check : ''}</a>`;
            }).join('')}
            <p class="nav-empty" id="boardPickerEmpty" ${boards.length ? 'hidden' : ''}>${boards.length ? 'لا توجد لوحة بهذا الاسم.' : 'ستظهر لوحاتك هنا بعد إنشائها.'}</p>
        </nav>
        <a class="nav-text-link" href="/dashboard">عرض كل اللوحات</a>`;
}

function userHtml(user) {
    if (!user) return `<p class="nav-footer-note">وسام · نحتفي بالحفظ ونُلهم الاستمرار</p>`;
    const name = user.displayName || user.email?.split('@')[0] || 'المعلم';
    return `<div class="sidebar-account"><span class="account-avatar" aria-hidden="true">${escapeHtml(Array.from(name)[0])}</span><span class="account-copy"><strong>${escapeHtml(name)}</strong><small>حساب المعلم</small></span></div>
        <div class="sidebar-account-actions"><a class="nav-about" href="/">عن وسام</a><button class="sidebar-signout-btn" id="sidebarSignOutBtn" type="button">${ICONS.signout}<span>تسجيل الخروج</span></button></div>`;
}

// Update only changed sections so live data does not steal keyboard focus or reset searches.
function patch(host, html) {
    if (host && host._markup !== html) { host.innerHTML = html; host._markup = html; }
}

export function updateSidebarActive(sidebar, activeKey = '', { activeBoard = null, user = null, boards = [], studentsNav = null, boardPickerOpen = false } = {}) {
    if (!sidebar) return;
    const brand = sidebar.querySelector('#sidebarBrand');
    brand?.setAttribute('href', user ? '/dashboard' : '/');
    brand?.setAttribute('aria-label', `وسام — ${user ? 'لوحاتي' : 'الرئيسية'}`);
    patch(sidebar.querySelector('#sidebarGlobalNav'), renderGlobalNavHtml(activeKey, user, activeBoard));
    patch(sidebar.querySelector('#sidebarCreateHost'), user ? `<a href="/new" class="sidebar-create ${activeKey === 'new' ? 'active' : ''}" ${activeKey === 'new' ? 'aria-current="page"' : ''}>${ICONS.newBoard}<span>إنشاء لوحة جديدة</span></a>` : '');
    patch(sidebar.querySelector('#sidebarWorkspaceHost'), workspaceHtml(activeBoard, user, boardPickerOpen));
    const context = sidebar.querySelector('#sidebarContextHost');
    context.hidden = !activeBoard?.id;
    patch(context, activeBoard ? renderContextHtml(activeBoard, activeKey, user, studentsNav?.activeStudentId) : '');
    const picker = sidebar.querySelector('#sidebarBoardPicker');
    picker.hidden = !boardPickerOpen;
    if (boardPickerOpen) {
        const query = picker.querySelector('input')?.value || '';
        const wasSearching = document.activeElement === picker.querySelector('input');
        patch(picker, renderBoardPickerHtml(boards, activeBoard));
        const input = picker.querySelector('input');
        if (input) input.value = query;
        if (wasSearching && document.activeElement !== input) input?.focus({ preventScroll: true });
        filterBoards(sidebar, query);
    }
    updateStudentsNav(sidebar, activeBoard ? studentsNav : null);
    patch(sidebar.querySelector('#sidebarUserSection'), userHtml(user));
}

function filterBoards(sidebar, value) {
    const query = normalizeArabic(value).trim();
    let count = 0;
    sidebar.querySelectorAll('[data-board-row]').forEach(row => {
        row.hidden = !row.dataset.name.includes(query);
        if (!row.hidden) count++;
    });
    const empty = sidebar.querySelector('#boardPickerEmpty');
    if (empty) empty.hidden = count > 0;
}

export function bindSidebarEvents(sidebar, { closeDrawer, toggleBoardPicker, signOut }) {
    sidebar.addEventListener('click', async event => {
        if (event.target.closest('#sidebarCloseBtn')) return closeDrawer();
        if (event.target.closest('#boardSwitcherBtn')) return toggleBoardPicker();
        if (event.target.closest('#sidebarSignOutBtn')) {
            const button = event.target.closest('button');
            button.disabled = true;
            try { await signOut(); toast('تم تسجيل الخروج'); }
            catch { toast('تعذر تسجيل الخروج حالياً', 'error'); }
            finally { if (button.isConnected) button.disabled = false; }
        }
    });
    sidebar.addEventListener('input', event => {
        if (event.target.id === 'boardPickerSearch') filterBoards(sidebar, event.target.value);
    });
    sidebar.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !sidebar.querySelector('#sidebarBoardPicker').hidden) {
            event.stopPropagation();
            toggleBoardPicker(false);
        }
    });
    bindStudentsNav(sidebar);
}
