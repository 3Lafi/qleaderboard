// إعدادات التطبيق العامة
export const LIMITS = {
    MAX_STUDENTS_PER_BOARD: 150,
    MAX_NAME_LENGTH: 100,
    MAX_BOARD_NAME_LENGTH: 100,
};

// رابط Cloudflare Worker الموثوق الذي يطلب بناء بطاقة المشاركة بعد حفظ البنر.
// لا يحتوي الرابط على سر؛ المصادقة تتم برمز Firebase ID Token للمعلّم.
export const OG_PREVIEW_TRIGGER_URL = 'https://wisam-og-trigger.REPLACE_WITH_YOUR_SUBDOMAIN.workers.dev';
