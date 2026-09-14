// إعدادات التطبيق العامة
export const LIMITS = {
    MAX_STUDENTS_PER_BOARD: 150,
    MAX_NAME_LENGTH: 100,
    MAX_BOARD_NAME_LENGTH: 100,
};

// خدمة خلفية داخلية فقط: تطلب بناء صورة المشاركة عند إنشاء لوحة عامة.
// لا تُعرض Cloudflare داخل التطبيق ولا يحمل المتصفح أي مفتاح نشر.
export const OG_PREVIEW_TRIGGER_URL = 'https://wisam-og-trigger.wisam-3lafi.workers.dev';
