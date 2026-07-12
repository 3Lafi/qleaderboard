// نموذج إعدادات اللوحة: القيم الافتراضية والتحقق من الصحة قبل الحفظ
import { LIMITS } from '../../core/config.js';
import { expandScope } from '../../core/quran-data.js';

export function defaultSettings() {
    return {
        name: '',
        schoolName: '',
        classLabel: '',
        scope: { type: 'quran', juzNumbers: [], curriculum: null, surahNumbers: expandScope({ type: 'quran' }) },
        direction: 'reverse',
        isPublic: true,
        showClassProgress: true,
        classCurrentSurah: null,
    };
}

// يتحقق من صحة إعدادات اللوحة ويقصّها لحدودها المسموحة قبل حفظها في Firestore
// يُستخدم من نموذج الإعدادات (رسائل خطأ فورية) ومن BoardRepository (ضمان أخير قبل الكتابة)
export function sanitizeSettings(input) {
    const name = String(input?.name || '').trim().slice(0, LIMITS.MAX_BOARD_NAME_LENGTH);
    if (!name) throw new Error('اكتب اسم اللوحة');

    const surahNumbers = Array.isArray(input?.scope?.surahNumbers) ? input.scope.surahNumbers : [];
    if (surahNumbers.length === 0) throw new Error('اختر نطاقاً يحتوي على سورة واحدة على الأقل');

    return {
        name,
        schoolName: String(input?.schoolName || '').trim().slice(0, 150),
        classLabel: String(input?.classLabel || '').trim().slice(0, 100),
        scope: {
            type: input?.scope?.type || 'quran',
            juzNumbers: Array.isArray(input?.scope?.juzNumbers) ? input.scope.juzNumbers : [],
            curriculum: input?.scope?.curriculum || null,
            surahNumbers,
        },
        direction: input?.direction === 'forward' ? 'forward' : 'reverse',
        isPublic: Boolean(input?.isPublic),
        showClassProgress: Boolean(input?.showClassProgress),
        classCurrentSurah: Number.isInteger(input?.classCurrentSurah) ? input.classCurrentSurah : null,
    };
}
