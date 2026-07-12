// عناصر واجهة مشتركة: تنبيهات، حوارات تأكيد، هيدر، أدوات مساعدة
import { navigate } from '../../core/router.js';
import { authState } from '../../core/authState.js';
import { auth } from '../../core/firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';

export function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/* ---------------------------------- تنبيهات ---------------------------------- */

export function toast(message, type = 'info') {
    let host = document.getElementById('toastHost');
    if (!host) {
        host = document.createElement('div');
        host.id = 'toastHost';
        document.body.appendChild(host);
    }
    const item = document.createElement('div');
    item.className = `toast toast-${type}`;
    item.textContent = message;
    host.appendChild(item);
    requestAnimationFrame(() => item.classList.add('toast-show'));
    setTimeout(() => {
        item.classList.remove('toast-show');
        setTimeout(() => item.remove(), 300);
    }, 3200);
}

/* ------------------------------- حوار التأكيد ------------------------------- */

// حوار تأكيد يعيد Promise<boolean>؛ requireText يطلب كتابة نص مطابق قبل التفعيل (للحذف الخطير)
export function confirmDialog({ title, message, confirmText = 'تأكيد', cancelText = 'إلغاء', danger = false, requireText = null }) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-card" role="dialog" aria-modal="true">
                <h3 class="modal-title">${escapeHtml(title)}</h3>
                <p class="modal-message">${escapeHtml(message)}</p>
                ${requireText ? `
                    <p class="modal-hint">اكتب "<b>${escapeHtml(requireText)}</b>" للتأكيد:</p>
                    <input type="text" class="form-input" id="modalConfirmInput" autocomplete="off">
                ` : ''}
                <div class="modal-actions">
                    <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modalConfirmBtn" ${requireText ? 'disabled' : ''}>${escapeHtml(confirmText)}</button>
                    <button class="btn btn-secondary" id="modalCancelBtn">${escapeHtml(cancelText)}</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const confirmBtn = overlay.querySelector('#modalConfirmBtn');
        const input = overlay.querySelector('#modalConfirmInput');
        if (input) {
            input.addEventListener('input', () => {
                confirmBtn.disabled = input.value.trim() !== requireText;
            });
            input.focus();
        }

        const close = result => {
            overlay.remove();
            resolve(result);
        };
        confirmBtn.addEventListener('click', () => close(true));
        overlay.querySelector('#modalCancelBtn').addEventListener('click', () => close(false));
        overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
    });
}

// حوار إدخال نص بسيط (مثل إعادة تسمية طالب)
export function promptDialog({ title, label, value = '', confirmText = 'حفظ' }) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-card" role="dialog" aria-modal="true">
                <h3 class="modal-title">${escapeHtml(title)}</h3>
                ${label ? `<p class="modal-message">${escapeHtml(label)}</p>` : ''}
                <input type="text" class="form-input" id="modalPromptInput" value="${escapeHtml(value)}">
                <div class="modal-actions">
                    <button class="btn btn-primary" id="modalConfirmBtn">${escapeHtml(confirmText)}</button>
                    <button class="btn btn-secondary" id="modalCancelBtn">إلغاء</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const input = overlay.querySelector('#modalPromptInput');
        input.focus();
        input.select();

        const close = result => {
            overlay.remove();
            resolve(result);
        };
        const submit = () => {
            const text = input.value.trim();
            if (text) close(text);
        };
        overlay.querySelector('#modalConfirmBtn').addEventListener('click', submit);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
        overlay.querySelector('#modalCancelBtn').addEventListener('click', () => close(null));
        overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
    });
}

/* --------------------------------- الهيدر --------------------------------- */

// الهيدر الكبير (الصفحات العامة): نفس تصميم البانر الحالي مع فتحة لشريط إنجاز الفصل
export function bannerHeader({ title, subtitle = '', extraHtml = '' }) {
    return `
        <header>
            <div class="header-icon"></div>
            <h1 class="banner-title">${escapeHtml(title)}</h1>
            ${subtitle ? `<div class="banner-separator"></div><div class="banner-subtitle">${escapeHtml(subtitle)}</div>` : ''}
            ${extraHtml}
        </header>`;
}

// شريط علوي مدمج لصفحات الإدارة مع شريحة الحساب
export function topbar(active = '') {
    const user = authState.user();
    const displayName = user ? (user.displayName || user.email || '') : '';
    return `
        <nav class="topbar">
            <a href="/" class="topbar-brand">
                <span class="topbar-icon"></span>
                <span class="topbar-title">لوحات حفظ القرآن</span>
            </a>
            <div class="topbar-links">
                ${user ? `
                    <a href="/dashboard" class="topbar-link ${active === 'dashboard' ? 'active' : ''}">لوحاتي</a>
                    <span class="account-chip" title="${escapeHtml(user.email || '')}">${escapeHtml(displayName)}</span>
                    <button class="topbar-link topbar-signout" id="topbarSignOut">خروج</button>
                ` : `
                    <a href="/login" class="topbar-link ${active === 'login' ? 'active' : ''}">دخول المعلمين</a>
                `}
            </div>
        </nav>`;
}

// يربط زر الخروج بعد إدراج الشريط العلوي في الصفحة
export function bindTopbar(container) {
    const signOutBtn = container.querySelector('#topbarSignOut');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            await signOut(auth);
            toast('تم تسجيل الخروج');
            navigate('/');
        });
    }
}

/* -------------------------------- أدوات عامة -------------------------------- */

export function skeletonCards(count = 3) {
    const card = `
        <div class="skeleton-card">
            <div class="skeleton-pulse s-text"></div>
            <div class="skeleton-pulse s-bar-bg"></div>
            <div class="s-stats">
                <div class="skeleton-pulse s-stat-item"></div>
                <div class="skeleton-pulse s-stat-item"></div>
            </div>
            <div class="skeleton-pulse s-btn"></div>
        </div>`;
    return `<div class="skeleton-wrapper" style="display:grid;">${card.repeat(count)}</div>`;
}

export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        toast('تم نسخ الرابط ✓', 'success');
    } catch {
        toast('تعذر النسخ — انسخ الرابط يدوياً', 'error');
    }
}

export function formatDate(date) {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

// رابط المشاركة العام للوحة
export function boardShareUrl(boardId) {
    return `${location.origin}/b/${boardId}`;
}
