// أدوات معالجة النصوص والبحث الموحدة
// تجمع دوال توحيد النصوص العربية، وتحويل الأرقام المشرقية، والبحث بالاسم أو الرقم دون تكرار

const EASTERN_ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/**
 * تحويل الأرقام العربية المشرقية والفارسية إلى أرقام قياسية غربية (0-9)
 * @param {string|number} text
 * @returns {string}
 */
export function toWesternDigits(text) {
    return String(text ?? '')
        .replace(/[٠-٩]/g, c => EASTERN_ARABIC_DIGITS.indexOf(c))
        .replace(/[۰-۹]/g, c => PERSIAN_DIGITS.indexOf(c));
}

/**
 * توحيد النص العربي: إزالة التشكيل والتطويل، وتوحيد الألف والياء والتاء المربوطة
 * @param {string} text
 * @returns {string}
 */
export function normalizeArabic(text) {
    return String(text ?? '')
        .trim()
        .replace(/[ً-ٰٟ]/g, '') // التشكيل
        .replace(/ـ/g, '')     // التطويل
        .replace(/^سورة\s+/, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * تجهيز نص البحث: توحيد الحروف وتحويل الأرقام وتقليم المسافات
 * @param {string} text
 * @returns {string}
 */
export function normalizeSearchQuery(text) {
    return toWesternDigits(normalizeArabic(text)).trim();
}

/**
 * مطابقة عنصر يحتوي على اسم ورقم مقابل استعلام بحث (رقم أو اسم)
 * @param {{ name?: string, number?: number, n?: number }} item
 * @param {string} rawQuery الاستعلام الخام
 * @returns {boolean}
 */
export function matchesQueryNameOrNumber(item, rawQuery) {
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return true;

    if (/^\d+$/.test(query)) {
        const num = Number(query);
        const itemNum = item.number ?? item.n;
        return itemNum === num;
    }

    const name = normalizeArabic(item.name ?? '');
    return name.includes(query);
}

/**
 * مطابقة اسم طالب مقابل استعلام بحث
 * @param {string} studentName
 * @param {string} rawQuery
 * @returns {boolean}
 */
export function matchesStudentName(studentName, rawQuery) {
    const query = normalizeArabic(rawQuery).trim();
    if (!query) return true;
    return normalizeArabic(studentName).includes(query);
}
