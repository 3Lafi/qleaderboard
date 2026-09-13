import { boardDestinations, navigationTitle, isBoardOwner } from '../../application/navigation/navigation-model.js';
import { escapeHtml } from '../views/ui.js';
import { NAV_ICONS } from './NavigationIcons.js';

export function appHeaderHtml() {
    return `<header class="app-header">
        <div class="app-header-row">
            <button type="button" id="appMenuBtn" class="nav-icon-button app-menu-button" aria-label="فتح القائمة" aria-expanded="false" aria-controls="appSidebarHost" aria-haspopup="dialog">${NAV_ICONS.menu}</button>
            <nav class="app-location" id="appLocation" aria-label="مسار الصفحة"></nav>
            <a class="header-brand" id="headerBrand" href="/" aria-label="وسام — الرئيسية"><img src="/images/app-icons/badge-v10-192.png" alt="" width="32" height="32"></a>
        </div>
        <nav class="mobile-board-nav" id="mobileBoardNav" aria-label="صفحات اللوحة للهاتف" hidden></nav>
    </header>`;
}

export function updateAppHeader(host, { activeKey, board, user, studentsNav, trail }) {
    if (!host) return;
    const title = navigationTitle(activeKey);
    const student = studentsNav?.students?.find(item => item.id === studentsNav.activeStudentId);
    const crumbs = [];
    if (board?.id) {
        const ownerView = activeKey !== 'board-public' && isBoardOwner(board, user);
        const boardPath = `/${ownerView ? 'edit' : 'b'}/${encodeURIComponent(board.id)}${ownerView ? '/students' : ''}`;
        if (isBoardOwner(board, user)) crumbs.push({ label: 'لوحاتي', href: '/dashboard' });
        crumbs.push({ label: board.settings?.name || board.name || 'اللوحة', href: student || activeKey === 'board-settings' ? boardPath : '' });
        crumbs.push({ label: student?.name || title });
    } else if (activeKey === 'new') crumbs.push({ label: 'لوحاتي', href: '/dashboard' }, { label: title });
    else crumbs.push({ label: title });
    const locationItems = trail || crumbs;
    const location = host.querySelector('#appLocation');
    const locationMarkup = `<ol>${locationItems.map((item, i) => `<li>${item.href ? `<a href="${item.href}">${escapeHtml(item.label)}</a>` : `<span ${i === locationItems.length - 1 ? 'aria-current="page"' : ''}>${escapeHtml(item.label)}</span>`}</li>`).join('')}</ol>`;
    if (location._markup !== locationMarkup) { location.innerHTML = locationMarkup; location._markup = locationMarkup; }
    const brand = host.querySelector('#headerBrand');
    brand.setAttribute('href', user ? '/dashboard' : '/');
    brand.setAttribute('aria-label', `وسام — ${user ? 'لوحاتي' : 'الرئيسية'}`);
    const tabs = host.querySelector('#mobileBoardNav');
    const destinations = boardDestinations(board, user);
    // A guest's only board destination is already available in the location trail.
    tabs.hidden = destinations.length < 2;
    const tabsMarkup = destinations.map(item => `<a href="${item.href}" class="${activeKey === item.key ? 'active' : ''}" ${activeKey === item.key ? `aria-current="${student ? 'true' : 'page'}"` : ''}>${escapeHtml(item.label)}</a>`).join('');
    if (tabs._markup !== tabsMarkup) { tabs.innerHTML = tabsMarkup; tabs._markup = tabsMarkup; }
}
