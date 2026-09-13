// الأوسمة مشتقة من الحفظ المسجل؛ لا تحتاج حقولاً إضافية أو كتابة إلى قاعدة البيانات.
import { SURAHS } from '../../shared/quran-data.js';
import { JUZ_BOUNDARIES } from '../../shared/juz-boundaries.js';

export const BADGE_LEVELS = Object.freeze({
    quran: { label: 'القرآن الكريم', tier: 'المستوى الأول', count: 1 },
    juz: { label: 'أوسمة الأجزاء', tier: 'المستوى الثاني', count: 30 },
    surah: { label: 'أوسمة السور', tier: 'المستوى الثالث', count: 114 },
});

const makeBadge = (type, number, name, requiredSurahs, art) => Object.freeze({
    id: `${type}-${number}`, type, number, name,
    requiredSurahs: Object.freeze(requiredSurahs), art,
    labelArt: type === 'quran' ? null : `/images/badges-assets/${type}/0.png`,
});

export const BADGES = Object.freeze([
    makeBadge('quran', 1, 'حافظ القرآن الكريم', SURAHS.map(s => s.n), '/images/badges-assets/quran-name.png'),
    ...Array.from({ length: 30 }, (_, i) => makeBadge('juz', i + 1, `الجزء ${i + 1}`,
        Object.keys(JUZ_BOUNDARIES[i + 1]).map(Number), `/images/badges-assets/juz/${i + 1}.png`)),
    ...SURAHS.map(s => makeBadge('surah', s.n, `سورة ${s.name}`, [s.n], `/images/badges-assets/surah/${s.n}.png`)),
]);

// السور التي تعبر حدود الأجزاء مطلوبة أيضاً، بما أن التسجيل الحالي يكون بالسورة الكاملة.
export function evaluateBadges(memorized = []) {
    const known = new Set(Array.isArray(memorized) ? memorized.filter(n => Number.isInteger(n) && n >= 1 && n <= 114) : []);
    return BADGES.map(badge => {
        const completed = badge.requiredSurahs.filter(n => known.has(n)).length;
        return { ...badge, completed, total: badge.requiredSurahs.length,
            earned: completed === badge.requiredSurahs.length,
            progress: Math.round(completed / badge.requiredSurahs.length * 100) };
    });
}

export function earnedBadges(memorized = []) {
    return evaluateBadges(memorized).filter(badge => badge.earned);
}
