import { escapeHtml, toast } from '../views/ui.js';
import { primaryDestinations, primarySection, boardDestinations, isBoardOwner } from '../../application/navigation/navigation-model.js';
import { NAV_ICONS as ICONS } from './NavigationIcons.js';

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
            <nav class="sidebar-global" id="sidebarGlobalNav" aria-label="التنقل الرئيسي">${renderGlobalNavHtml(activeKey, context.user)}</nav>
            <div class="sidebar-body">
                <section class="sidebar-boards-section" id="sidebarBoardsHost"></section>
            </div>
            <div class="sidebar-bottom">
                <div class="sidebar-create-wrap" id="sidebarCreateHost"></div>
                <div class="sidebar-footer" id="sidebarUserSection"></div>
            </div>
        </div>`;
}

export function renderGlobalNavHtml(activeKey = '', user = null, board = null) {
    const section = primarySection(activeKey, user, board);
    return primaryDestinations(user).map(item => `
        <a href="${item.href}" class="sidebar-nav-link ${section === item.key ? 'active' : ''}" data-nav-key="${item.key}" ${section === item.key ? `aria-current="${activeKey === item.key ? 'page' : 'true'}"` : ''}>
            ${ICONS[item.icon]}<span>${item.label}</span>
        </a>`).join('');
}

export function renderContextHtml(board, activeKey = '', user = null, activeStudentId = '') {
    return boardDestinations(board, user).map(item => `
        <a href="${item.href}" class="capsule-btn sidebar-nav-link board-nav-link ${activeKey === item.key ? 'active' : ''}" ${activeKey === item.key ? `aria-current="${activeStudentId ? 'true' : 'page'}"` : ''}>
            ${ICONS[item.icon]}<span>${item.label}</span>
        </a>`).join('');
}

export function capsuleHtml(board, activeKey = '', user = null, activeStudentId = '') {
    if (!board?.id) return '';
    const name = board.settings?.name || board.name || 'لوحة المتابعة';
    const isPublic = board.settings?.isPublic !== false;
    const meta = isPublic ? 'لوحة عامة' : 'لوحة خاصة';

    return `
        <div class="sidebar-board-capsule active" aria-current="true">
            <div class="capsule-header">
                <span class="capsule-icon">${ICONS.boards}</span>
                <div class="capsule-info">
                    <strong class="capsule-title" title="${escapeHtml(name)}">${escapeHtml(name)}</strong>
                    <span class="capsule-meta">${meta}</span>
                </div>
                <span class="board-item-badge">المفتوحة</span>
            </div>
            <nav class="capsule-actions" aria-label="أزرار اللوحة">
                ${renderContextHtml(board, activeKey, user, activeStudentId)}
            </nav>
        </div>`;
}

export function boardsListHtml(boards = [], activeBoard = null, user = null, activeKey = '', activeStudentId = '') {
    if (!user) return '';

    // Ensure activeBoard is present in the list if loaded
    const allBoards = [...boards];
    if (activeBoard?.id && !allBoards.some(b => String(b.id) === String(activeBoard.id))) {
        allBoards.unshift(activeBoard);
    }

    if (allBoards.length === 0) {
        return `
            <p class="nav-section-label">لوحات المتابعة</p>
            <p class="nav-empty">ستظهر لوحاتك هنا بعد إنشائها.</p>`;
    }

    return `
        <p class="nav-section-label">لوحات المتابعة (${allBoards.length})</p>
        <nav class="sidebar-boards-list" aria-label="قائمة اللوحات">
            ${allBoards.map(b => {
                const name = b.settings?.name || b.name || 'لوحة بدون اسم';
                const isSelected = String(b.id) === String(activeBoard?.id);
                const isOwner = isBoardOwner(b, user);
                const defaultHref = isOwner ? `/edit/${encodeURIComponent(b.id)}/students` : `/b/${encodeURIComponent(b.id)}`;

                if (isSelected) {
                    const targetBoard = activeBoard?.id === b.id ? activeBoard : b;
                    return capsuleHtml(targetBoard, activeKey, user, activeStudentId);
                }

                return `
                    <a href="${defaultHref}" class="sidebar-board-item" title="${escapeHtml(name)}">
                        <span class="board-item-icon">${ICONS.boards}</span>
                        <span class="board-item-name">${escapeHtml(name)}</span>
                    </a>`;
            }).join('')}
        </nav>`;
}

export function renderBoardPickerHtml(boards = [], activeBoard = null) {
    return boardsListHtml(boards, activeBoard);
}

function userHtml(user) {
    if (!user) return `<p class="nav-footer-note">وسام · نحتفي بالحفظ ونُلهم الاستمرار</p>`;
    const name = user.displayName || user.email?.split('@')[0] || 'المعلم';
    return `<div class="sidebar-account"><span class="account-avatar" aria-hidden="true">${escapeHtml(Array.from(name)[0])}</span><span class="account-copy"><strong>${escapeHtml(name)}</strong><small>حساب المعلم</small></span></div>
        <div class="sidebar-account-actions"><a class="nav-about" href="/">عن وسام</a><button class="sidebar-signout-btn" id="sidebarSignOutBtn" type="button">${ICONS.signout}<span>تسجيل الخروج</span></button></div>`;
}

// Update only changed sections so live data does not steal keyboard focus or reset interactions.
function patch(host, html) {
    if (host && host._markup !== html) { host.innerHTML = html; host._markup = html; }
}

export function updateSidebarActive(sidebar, activeKey = '', { activeBoard = null, user = null, boards = [], studentsNav = null } = {}) {
    if (!sidebar) return;
    const brand = sidebar.querySelector('#sidebarBrand');
    brand?.setAttribute('href', user ? '/dashboard' : '/');
    brand?.setAttribute('aria-label', `وسام — ${user ? 'لوحاتي' : 'الرئيسية'}`);
    patch(sidebar.querySelector('#sidebarGlobalNav'), renderGlobalNavHtml(activeKey, user, activeBoard));

    const boardsHost = sidebar.querySelector('#sidebarBoardsHost');
    if (boardsHost) {
        boardsHost.hidden = !user;
        patch(boardsHost, boardsListHtml(boards, activeBoard, user, activeKey, studentsNav?.activeStudentId));
    }

    patch(sidebar.querySelector('#sidebarCreateHost'), user ? `<a href="/new" class="sidebar-create ${activeKey === 'new' ? 'active' : ''}" ${activeKey === 'new' ? 'aria-current="page"' : ''}>${ICONS.newBoard}<span>إنشاء لوحة جديدة</span></a>` : '');
    patch(sidebar.querySelector('#sidebarUserSection'), userHtml(user));
}

export function bindSidebarEvents(sidebar, { closeDrawer, signOut } = {}) {
    sidebar.addEventListener('click', async event => {
        if (event.target.closest('#sidebarCloseBtn')) return closeDrawer?.();
        if (event.target.closest('#sidebarSignOutBtn')) {
            const button = event.target.closest('button');
            button.disabled = true;
            try { await signOut?.(); toast('تم تسجيل الخروج'); }
            catch { toast('تعذر تسجيل الخروج حالياً', 'error'); }
            finally { if (button.isConnected) button.disabled = false; }
        }
    });
}
