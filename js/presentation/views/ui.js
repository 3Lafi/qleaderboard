// عناصر واجهة مشتركة: تنبيهات، حوارات تأكيد، هيدر، أدوات مساعدة
import { BOARD_SHARE_ORIGIN } from '../../shared/config.js';

export function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// إظهار الحفظ القليل دون تقريبه إلى صفر في واجهة الطالب.
export function formatProgress(value) {
    const safe = Math.max(0, Math.min(100, Number(value) || 0));
    return safe > 0 && safe < 1 ? safe.toFixed(2) : String(Math.round(safe));
}

/* ---------------------------------- تنبيهات ---------------------------------- */

export function toast(message, type = 'info') {
    let host = document.getElementById('toastHost');
    if (!host) {
        host = document.createElement('div');
        host.id = 'toastHost';
        host.setAttribute('role', 'status');
        host.setAttribute('aria-live', 'polite');
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
export function confirmDialog({ signal, title, message, confirmText = 'تأكيد', cancelText = 'إلغاء', danger = false, requireText = null }) {
    return new Promise(resolve => {
        if (signal?.aborted) { resolve(null); return; }
        const previouslyFocused = document.activeElement;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
                <h3 class="modal-title" id="modalTitle">${escapeHtml(title)}</h3>
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
        const cancelBtn = overlay.querySelector('#modalCancelBtn');
        const input = overlay.querySelector('#modalConfirmInput');
        if (input) {
            input.addEventListener('input', () => {
                confirmBtn.disabled = input.value.trim() !== requireText;
            });
            input.focus();
        } else {
            // تفادي التنفيذ العرضي لإجراء خطير عند الضغط على Enter دون قصد
            (danger ? cancelBtn : confirmBtn).focus();
        }

        const close = result => {
            overlay.remove();
            document.removeEventListener('keydown', onKeydown);
            signal?.removeEventListener('abort', onAbort);
            if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
            resolve(result);
        };
        const onAbort = () => close(false);
        const onKeydown = e => { if (e.key === 'Escape') close(false); else trapModalFocus(e, overlay); };
        signal?.addEventListener('abort', onAbort, { once: true });
        document.addEventListener('keydown', onKeydown);
        confirmBtn.addEventListener('click', () => close(true));
        cancelBtn.addEventListener('click', () => close(false));
        overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
    });
}

// حوار إدخال نص بسيط (مثل إعادة تسمية طالب)
export function promptDialog({ signal, title, label, value = '', confirmText = 'حفظ' }) {
    return new Promise(resolve => {
        if (signal?.aborted) { resolve(null); return; }
        const previouslyFocused = document.activeElement;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
                <h3 class="modal-title" id="modalTitle">${escapeHtml(title)}</h3>
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
            document.removeEventListener('keydown', onKeydown);
            signal?.removeEventListener('abort', onAbort);
            if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
            resolve(result);
        };
        const onAbort = () => close(null);
        const onKeydown = e => { if (e.key === 'Escape') close(null); else trapModalFocus(e, overlay); };
        signal?.addEventListener('abort', onAbort, { once: true });
        document.addEventListener('keydown', onKeydown);
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
export function bannerHeader({ title, subtitle = '', extraHtml = '', className = '' }) {
    return `
        <header class="${escapeHtml(className)}">
            <div class="header-icon"></div>
            <h1 class="banner-title">${escapeHtml(title)}</h1>
            ${subtitle ? `<div class="banner-separator"></div><div class="banner-subtitle">${escapeHtml(subtitle)}</div>` : ''}
            ${extraHtml}
        </header>`;
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

// رابط المشاركة العام للوحة
export function boardShareUrl(boardId) {
    return `${BOARD_SHARE_ORIGIN}/b/${encodeURIComponent(boardId)}`;
}

function trapModalFocus(event, overlay) {
    if (event.key !== 'Tab') return;
    const controls = [...overlay.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
