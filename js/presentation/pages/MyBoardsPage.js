// لوحاتي: قائمة اللوحات الخاصة بالمعلم مع إجراءات سريعة
import { boardShareUrl, copyToClipboard, escapeHtml } from '../views/ui.js';
import { normalizeArabic } from '../../shared/text-utils.js';
import { createFeedbackState } from '../layout/FeedbackStateView.js';

export default async function MyBoardsPage(container, { layout, user, services, setTitle, refresh }) {
    const BoardRepository = services.boards;
    setTitle('لوحاتي — وسام');
    layout?.setActiveBoard(null);

    container.innerHTML = `
        <div class="page-title-row">
            <div>
                <h1 class="page-title">لوحاتي</h1>
                <p class="page-subtitle">مرحباً ${escapeHtml(user.displayName || user.email || '')}</p>
            </div>
            <div style="display:flex; gap:10px;">
                <a href="/new" class="btn btn-primary">＋ لوحة جديدة</a>
            </div>
        </div>
        <div id="boardsHost">${skeletonBoards()}</div>
    `;

    const host = container.querySelector('#boardsHost');

    let boards;
    try {
        boards = await BoardRepository.listMine(user.uid);
    } catch (err) {
        console.error(err);
        host.replaceChildren(createFeedbackState({
            headingLevel: 2,
            type: 'error',
            icon: '⚠️',
            eyebrow: 'لوحاتي',
            title: 'تعذر تحميل اللوحات',
            message: 'يتعذر الاتصال بقاعدة البيانات حالياً. يرجى إعادة المحاولة.',
            actions: [
                { label: 'تحديث الصفحة', onClick: refresh, primary: true },
                { label: 'الرئيسية', href: '/' }
            ]
        }));
        return;
    }

    if (boards.length === 0) {
        host.replaceChildren(createFeedbackState({
            headingLevel: 2,
            type: 'empty',
            icon: '📋',
            eyebrow: 'بداية جديدة',
            title: 'لا توجد لديك لوحات بعد',
            message: 'أنشئ أول لوحة لمتابعة حفظ طلابك والاحتفاء بإنجازاتهم.',
            actions: [
                { label: 'إنشاء أول لوحة', href: '/new', primary: true }
            ]
        }));
        return;
    }

    host.innerHTML = `
        <section class="dashboard-stats" aria-label="ملخص لوحاتك">
            <div><strong>${boards.length}</strong><span>لوحة</span></div>
            <div><strong>${boards.reduce((sum, board) => sum + board.studentsCount(), 0)}</strong><span>طالب</span></div>
            <div><strong>${boards.filter(board => board.settings.isPublic).length}</strong><span>لوحة عامة</span></div>
        </section>
        <div class="dashboard-tools">
            <label class="badge-search">
                <span>اللوحة</span>
                <input type="search" id="boardSearch" aria-label="ابحث عن لوحة" placeholder="اسم اللوحة أو المدرسة…">
            </label>
            <div class="choice-pills" role="group" aria-label="ظهور اللوحات">
                <button type="button" data-visibility="all" aria-pressed="true">الكل</button>
                <button type="button" data-visibility="public" aria-pressed="false">العامة</button>
                <button type="button" data-visibility="private" aria-pressed="false">الخاصة</button>
            </div>
            <span id="boardsResultCount" role="status" aria-live="polite"></span>
        </div>
        <div class="boards-grid" id="boardsGrid"></div>
    `;

    let visibility = 'all';
    const search = host.querySelector('#boardSearch');
    const grid = host.querySelector('#boardsGrid');

    function renderBoards() {
        const term = normalizeArabic(search.value).trim();
        const matches = boards.filter(board => {
            const s = board.settings;
            return (visibility === 'all' || s.isPublic === (visibility === 'public')) &&
                normalizeArabic([s.name, s.schoolName, s.classLabel].filter(Boolean).join(' ')).includes(term);
        });

        host.querySelector('#boardsResultCount').textContent = `${matches.length} من ${boards.length} لوحة`;
        grid.innerHTML = matches.length
            ? matches.map(boardCardHtml).join('')
            : `<div class="empty-search">
                   <h2>لا توجد لوحات مطابقة</h2>
                   <p>غيّر كلمات البحث أو اعرض كل اللوحات.</p>
                   <button type="button" class="btn btn-secondary" id="resetBoardSearch">مسح البحث والتصفية</button>
               </div>`;

        grid.querySelector('#resetBoardSearch')?.addEventListener('click', () => {
            search.value = '';
            visibility = 'all';
            updateFilter();
            renderBoards();
            search.focus();
        });
    }

    function updateFilter() {
        host.querySelectorAll('[data-visibility]').forEach(button =>
            button.setAttribute('aria-pressed', String(button.dataset.visibility === visibility))
        );
    }

    search.addEventListener('input', renderBoards);
    host.querySelectorAll('[data-visibility]').forEach(button => button.addEventListener('click', () => {
        visibility = button.dataset.visibility;
        updateFilter();
        renderBoards();
    }));

    grid.addEventListener('click', event => {
        const button = event.target.closest('[data-share-board]');
        if (!button) return;
        const board = boards.find(item => item.id === button.dataset.shareBoard);
        if (board) copyToClipboard(boardShareUrl(board.id, board.previewRevision));
    });

    renderBoards();
}

function boardCardHtml(board) {
    const s = board.settings;
    return `
        <div class="board-card">
            <span class="badge-visibility ${s.isPublic ? 'badge-public' : 'badge-private'}">${s.isPublic ? 'عامة' : 'خاصة'}</span>
            <h2 class="board-card-title"><a href="/edit/${board.id}/students">${escapeHtml(s.name || 'بدون اسم')}</a></h2>
            <div class="board-meta">
                ${s.schoolName ? `<span>${escapeHtml(s.schoolName)}</span>` : ''}
                ${s.classLabel ? `<span>${escapeHtml(s.classLabel)}</span>` : ''}
                <span>${board.studentsCount()} طالب</span>
            </div>
            <div class="board-actions">
                <a href="/edit/${board.id}/students" class="btn btn-primary btn-sm">جدول المتابعة</a>
                ${s.isPublic ? `<button type="button" class="btn btn-secondary btn-sm board-share-button" data-share-board="${escapeHtml(board.id)}">مشاركة اللوحة</button>` : ''}
                <a href="/edit/${board.id}" class="board-settings-link">إعدادات اللوحة <span aria-hidden="true">←</span></a>
            </div>
        </div>`;
}

function skeletonBoards() {
    const card = `<div class="skeleton-card" style="border-radius:24px;">
        <div class="skeleton-pulse s-text"></div>
        <div class="skeleton-pulse s-bar-bg" style="height:20px;"></div>
        <div class="skeleton-pulse s-btn"></div>
    </div>`;
    return `<div class="boards-grid">${card.repeat(3)}</div>`;
}
