import { createFeedbackState } from '../layout/FeedbackStateView.js';

export function renderNotFound(container, { layout, user, setTitle } = {}) {
    setTitle('الصفحة غير موجودة — وسام');
    layout?.announcePage?.();
    const signedIn = Boolean(user);
    container.replaceChildren(createFeedbackState({
        type: 'unavailable',
        icon: '🧭',
        eyebrow: '404 · لنعد إلى الطريق',
        title: 'لم نجد هذه الصفحة',
        message: 'قد يكون الرابط غير صحيح أو تغير عنوان الصفحة.',
        actions: [
            signedIn ? { label: 'لوحاتي', href: '/dashboard', primary: true } : { label: 'العودة للرئيسية', href: '/', primary: true },
            { label: 'استكشاف الأوسمة', href: '/badges' },
            ...(signedIn ? [{ label: 'الرئيسية', href: '/' }] : [])
        ]
    }));
}

export default renderNotFound;
