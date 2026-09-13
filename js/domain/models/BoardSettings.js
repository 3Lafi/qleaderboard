// نموذج إعدادات اللوحة: القيم الافتراضية والتحقق من الصحة قبل الحفظ
import { LIMITS } from '../../shared/config.js';
import { expandScope } from '../../shared/quran-data.js';
import { DEFAULT_THEME_ID, isBannerThemeId } from '../../shared/banner-themes.js';
import { curriculumClassLabel } from '../../shared/curriculum-data.js';

export function defaultSettings() {
    const defaultJuz = 30;
    return {
        name: '',
        schoolName: '',
        classLabel: '',
        banner: { themeId: DEFAULT_THEME_ID },
        scope: { type: 'juz', juzNumbers: [defaultJuz], curriculum: null, surahNumbers: expandScope({ type: 'juz', juzNumbers: [defaultJuz] }) },
        direction: 'reverse',
        isPublic: true,
        showClassProgress: true,
        classCurrentSurah: null,
        // المحتسب سابقاً: البرامج السابقة تُحتسب تلقائياً لأوسمة الطالب
        priorMode: 'auto',
        priorSurahs: [],
        // الدفعة المرتبطة: أساس تدرّج الطلاب بين البرامج
        cohortId: '',
    };
}

// يتحقق من صحة إعدادات اللوحة ويقصّها لحدودها المسموحة قبل حفظها في Firestore
// يُستخدم من نموذج الإعدادات (رسائل خطأ فورية) ومن BoardRepository (ضمان أخير قبل الكتابة)
// هل القائمة تبديل كامل لنفس العناصر؟
function isFullPermutation(candidate, reference) {
    if (!Array.isArray(candidate) || candidate.length !== reference.length || candidate.length === 0) return false;
    const target = new Set(reference);
    return candidate.every(n => Number.isInteger(Number(n)) && target.has(Number(n))) && new Set(candidate.map(Number)).size === reference.length;
}

export function sanitizeSettings(input) {
    const name = String(input?.name || '').trim().slice(0, LIMITS.MAX_BOARD_NAME_LENGTH);
    if (!name) throw new Error('اكتب اسم اللوحة');

    const surahNumbers = Array.isArray(input?.scope?.surahNumbers) ? input.scope.surahNumbers : [];
    if (surahNumbers.length === 0) throw new Error('اختر نطاقاً يحتوي على سورة واحدة على الأقل');

    return {
        name,
        schoolName: String(input?.schoolName || '').trim().slice(0, 150),
        classLabel: (input?.scope?.type === 'curriculum' ? curriculumClassLabel(input.scope.curriculum) : String(input?.classLabel || '').trim()).slice(0, 100),
        banner: { themeId: isBannerThemeId(input?.banner?.themeId) ? input.banner.themeId : DEFAULT_THEME_ID },
        scope: {
            type: input?.scope?.type || 'quran',
            juzNumbers: Array.isArray(input?.scope?.juzNumbers) ? input.scope.juzNumbers : [],
            curriculum: input?.scope?.curriculum || null,
            surahNumbers,
            // ترتيب مخصص يبقى فقط إذا كان تبديلاً كاملاً لسور النطاق
            ...(isFullPermutation(input?.scope?.customOrder, surahNumbers)
                ? { customOrder: input.scope.customOrder.map(Number) }
                : {}),
        },
        direction: input?.direction === 'forward' ? 'forward' : 'reverse',
        isPublic: Boolean(input?.isPublic),
        showClassProgress: Boolean(input?.showClassProgress),
        classCurrentSurah: Number.isInteger(input?.classCurrentSurah) ? input.classCurrentSurah : null,
        priorMode: input?.priorMode === 'none' ? 'none' : 'auto',
        cohortId: String(input?.cohortId || ''),
        priorSurahs: Array.isArray(input?.priorSurahs)
            ? [...new Set(input.priorSurahs.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 114))].sort((a, b) => a - b)
            : [],
    };
}
