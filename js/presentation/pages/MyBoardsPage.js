// لوحاتي: قائمة اللوحات الخاصة بالمعلم مع إجراءات سريعة
import { authState } from '../../core/authState.js';
import { BoardRepository } from '../../data/repositories/BoardRepository.js';
import { topbar, bindTopbar, escapeHtml, confirmDialog, toast, boardShareUrl, copyToClipboard } from '../views/ui.js';

export default async function MyBoardsPage(container, { navigate }) {
    const user = authState.user();

    container.innerHTML = `
        ${topbar('dashboard')}
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
    bindTopbar(container);

    const host = container.querySelector('#boardsHost');

    let boards;
    try {
        boards = await BoardRepository.listMine(user.uid);
    } catch (err) {
        console.error(err);
        host.innerHTML = `<div id="error-msg" style="display:block;"><p>يتعذر تحميل اللوحات حالياً.</p><button class="retry-btn" onclick="location.reload()">تحديث الصفحة</button></div>`;
        return;
    }

    if (boards.length === 0) {
        host.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-emoji">📋</div>
                <p class="empty-state-text">لا توجد لديك لوحات بعد.</p>
                <a href="/new" class="btn btn-primary">إنشاء أول لوحة</a>
            </div>`;
        return;
    }

    boards.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));

    host.innerHTML = `<div class="boards-grid">${boards.map(boardCardHtml).join('')}</div>`;

    host.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => copyToClipboard(boardShareUrl(btn.dataset.copy)));
    });

    host.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const boardId = btn.dataset.delete;
            const boardName = btn.dataset.name;
            const ok = await confirmDialog({
                title: 'حذف اللوحة',
                message: `سيتم حذف لوحة "${boardName}" وجميع بيانات الطلاب فيها نهائياً. لا يمكن التراجع عن هذا الإجراء.`,
                confirmText: 'حذف نهائياً',
                danger: true,
                requireText: boardName,
            });
            if (!ok) return;
            try {
                await BoardRepository.delete(boardId);
                toast('تم حذف اللوحة', 'success');
                navigate('/dashboard');
            } catch (err) {
                console.error(err);
                toast('تعذر حذف اللوحة', 'error');
            }
        });
    });
}

function boardCardHtml(board) {
    const s = board.settings;
    return `
        <div class="board-card">
            <span class="badge-visibility ${s.isPublic ? 'badge-public' : 'badge-private'}">${s.isPublic ? 'عامة' : 'خاصة'}</span>
            <h2 class="board-card-title">${escapeHtml(s.name || 'بدون اسم')}</h2>
            <div class="board-meta">
                ${s.schoolName ? `<span>🏫 ${escapeHtml(s.schoolName)}</span>` : ''}
                ${s.classLabel ? `<span>👥 ${escapeHtml(s.classLabel)}</span>` : ''}
                <span>👤 ${board.studentsCount()} طالب</span>
            </div>
            <div class="board-actions">
                <a href="/b/${board.id}" class="btn btn-secondary btn-sm">عرض</a>
                <a href="/edit/${board.id}/students" class="btn btn-secondary btn-sm">الطلاب</a>
                <a href="/edit/${board.id}" class="btn btn-secondary btn-sm">الإعدادات</a>
                <button class="btn btn-primary btn-sm" data-copy="${board.id}">نسخ الرابط</button>
                <button class="btn btn-danger btn-sm" data-delete="${board.id}" data-name="${escapeHtml(s.name)}">حذف</button>
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
