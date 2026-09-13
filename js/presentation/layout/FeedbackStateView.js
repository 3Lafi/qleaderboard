// مكون موحد لحالات الخطأ، عدم التوفر، والفراغ
// يضمن دائماً وجود روابط وأزرار نجاة تمنع علوق المستخدم في أي صفحة
import { uiIcon } from '../views/InterfaceIcons.js';
import { escapeHtml } from '../views/ui.js';

/**
 * @typedef {Object} FeedbackAction
 * @property {string} label نص الزر أو الرابط
 * @property {string} [href] رابط الانتقال (إن وجد)
 * @property {() => void} [onClick] معالج النقر (إن وجد)
 * @property {boolean} [primary] تمييز الزر كإجراء رئيسي
 * @property {string} [variant] فئة الزر الإضافية
 */

/**
 * إنشاء عنصر واجهة متكامل للحالات الخاصة
 * @param {Object} options
 * @param {string} options.title العنوان الرئيسي
 * @param {string} [options.message] الرسالة التوضيحية
 * @param {string} [options.eyebrow] نص شريط الترويسة الصغير
 * @param {string} [options.icon] رمز أو إيموجي توضيحي
 * @param {FeedbackAction[]} [options.actions] قائمة أزرار الخروج والنجاة
 * @param {'error'|'unavailable'|'empty'} [options.type] نوع الحالة
 * @returns {HTMLElement}
 */
export function createFeedbackState({
    title,
    headingLevel = 1,
    message = '',
    eyebrow = '',
    icon = '',
    actions = [],
    type = 'empty'
}) {
    const section = document.createElement('section');
    section.className = `feedback-state feedback-${type} empty-state`;
    section.setAttribute('role', type === 'error' ? 'alert' : 'status');

    // إذا لم تُحدد أزرار نجاة، نزود أزراراً افتراضية ذكية بحسب حالة المستخدم
    const resolvedActions = actions.length > 0 ? actions : getDefaultActions();

    section.innerHTML = `
        ${icon ? `<div class="feedback-icon" aria-hidden="true">${uiIcon(type === 'error' ? 'circle-alert' : type === 'unavailable' ? 'arrow-left' : 'crown')}</div>` : ''}
        ${eyebrow ? `<span class="eyebrow">${escapeHtml(eyebrow)}</span>` : ''}
        <h${headingLevel === 2 ? 2 : 1} class="feedback-title">${escapeHtml(title)}</h${headingLevel === 2 ? 2 : 1}>
        ${message ? `<p class="feedback-message">${escapeHtml(message)}</p>` : ''}
        <div class="feedback-actions hero-actions">
            ${resolvedActions.map((act, index) => {
                const cls = `btn ${act.primary ? 'btn-primary' : 'btn-secondary'} ${act.variant || ''}`.trim();
                if (act.href) {
                    return `<a href="${escapeHtml(act.href)}" class="${cls}" data-action-index="${index}">${escapeHtml(act.label)}</a>`;
                }
                return `<button type="button" class="${cls}" data-action-index="${index}">${escapeHtml(act.label)}</button>`;
            }).join('')}
        </div>
    `;

    // ربط معالجات النقر (إن وُجدت)
    resolvedActions.forEach((act, index) => {
        if (typeof act.onClick === 'function') {
            const btn = section.querySelector(`[data-action-index="${index}"]`);
            if (btn) btn.addEventListener('click', act.onClick);
        }
    });

    return section;
}
/**
 * أزرار نجاة افتراضية استناداً إلى حالة تسجيل المعلم أو الزائر
 * @returns {FeedbackAction[]}
 */
export function getDefaultActions(user = null) {
    if (user) {
        return [
            { label: 'العودة إلى لوحاتي', href: '/dashboard', primary: true },
            { label: 'مكتبة الأوسمة', href: '/badges' },
        ];
    }
    return [
        { label: 'العودة للرئيسية', href: '/', primary: true },
        { label: 'مكتبة الأوسمة', href: '/badges' },
        { label: 'تسجيل الدخول', href: '/login' },
    ];
}
