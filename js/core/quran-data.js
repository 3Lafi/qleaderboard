// البيانات الثابتة لسور القرآن الكريم — عدّ الآيات على رواية حفص (العدّ الكوفي، المجموع 6236)
// juz = الجزء الذي تبدأ فيه السورة (الجزءان 2 و5 لا تبدأ فيهما أي سورة)

import { resolveCurriculumSurahs } from './curriculum-data.js';

export const SURAHS = [
    { n: 1, name: "الفاتحة", ayahs: 7, juz: 1 },
    { n: 2, name: "البقرة", ayahs: 286, juz: 1 },
    { n: 3, name: "آل عمران", ayahs: 200, juz: 3 },
    { n: 4, name: "النساء", ayahs: 176, juz: 4 },
    { n: 5, name: "المائدة", ayahs: 120, juz: 6 },
    { n: 6, name: "الأنعام", ayahs: 165, juz: 7 },
    { n: 7, name: "الأعراف", ayahs: 206, juz: 8 },
    { n: 8, name: "الأنفال", ayahs: 75, juz: 9 },
    { n: 9, name: "التوبة", ayahs: 129, juz: 10 },
    { n: 10, name: "يونس", ayahs: 109, juz: 11 },
    { n: 11, name: "هود", ayahs: 123, juz: 11 },
    { n: 12, name: "يوسف", ayahs: 111, juz: 12 },
    { n: 13, name: "الرعد", ayahs: 43, juz: 13 },
    { n: 14, name: "إبراهيم", ayahs: 52, juz: 13 },
    { n: 15, name: "الحجر", ayahs: 99, juz: 14 },
    { n: 16, name: "النحل", ayahs: 128, juz: 14 },
    { n: 17, name: "الإسراء", ayahs: 111, juz: 15 },
    { n: 18, name: "الكهف", ayahs: 110, juz: 15 },
    { n: 19, name: "مريم", ayahs: 98, juz: 16 },
    { n: 20, name: "طه", ayahs: 135, juz: 16 },
    { n: 21, name: "الأنبياء", ayahs: 112, juz: 17 },
    { n: 22, name: "الحج", ayahs: 78, juz: 17 },
    { n: 23, name: "المؤمنون", ayahs: 118, juz: 18 },
    { n: 24, name: "النور", ayahs: 64, juz: 18 },
    { n: 25, name: "الفرقان", ayahs: 77, juz: 18 },
    { n: 26, name: "الشعراء", ayahs: 227, juz: 19 },
    { n: 27, name: "النمل", ayahs: 93, juz: 19 },
    { n: 28, name: "القصص", ayahs: 88, juz: 20 },
    { n: 29, name: "العنكبوت", ayahs: 69, juz: 20 },
    { n: 30, name: "الروم", ayahs: 60, juz: 21 },
    { n: 31, name: "لقمان", ayahs: 34, juz: 21 },
    { n: 32, name: "السجدة", ayahs: 30, juz: 21 },
    { n: 33, name: "الأحزاب", ayahs: 73, juz: 21 },
    { n: 34, name: "سبأ", ayahs: 54, juz: 22 },
    { n: 35, name: "فاطر", ayahs: 45, juz: 22 },
    { n: 36, name: "يس", ayahs: 83, juz: 22 },
    { n: 37, name: "الصافات", ayahs: 182, juz: 23 },
    { n: 38, name: "ص", ayahs: 88, juz: 23 },
    { n: 39, name: "الزمر", ayahs: 75, juz: 23 },
    { n: 40, name: "غافر", ayahs: 85, juz: 24 },
    { n: 41, name: "فصلت", ayahs: 54, juz: 24 },
    { n: 42, name: "الشورى", ayahs: 53, juz: 25 },
    { n: 43, name: "الزخرف", ayahs: 89, juz: 25 },
    { n: 44, name: "الدخان", ayahs: 59, juz: 25 },
    { n: 45, name: "الجاثية", ayahs: 37, juz: 25 },
    { n: 46, name: "الأحقاف", ayahs: 35, juz: 26 },
    { n: 47, name: "محمد", ayahs: 38, juz: 26 },
    { n: 48, name: "الفتح", ayahs: 29, juz: 26 },
    { n: 49, name: "الحجرات", ayahs: 18, juz: 26 },
    { n: 50, name: "ق", ayahs: 45, juz: 26 },
    { n: 51, name: "الذاريات", ayahs: 60, juz: 26 },
    { n: 52, name: "الطور", ayahs: 49, juz: 27 },
    { n: 53, name: "النجم", ayahs: 62, juz: 27 },
    { n: 54, name: "القمر", ayahs: 55, juz: 27 },
    { n: 55, name: "الرحمن", ayahs: 78, juz: 27 },
    { n: 56, name: "الواقعة", ayahs: 96, juz: 27 },
    { n: 57, name: "الحديد", ayahs: 29, juz: 27 },
    { n: 58, name: "المجادلة", ayahs: 22, juz: 28 },
    { n: 59, name: "الحشر", ayahs: 24, juz: 28 },
    { n: 60, name: "الممتحنة", ayahs: 13, juz: 28 },
    { n: 61, name: "الصف", ayahs: 14, juz: 28 },
    { n: 62, name: "الجمعة", ayahs: 11, juz: 28 },
    { n: 63, name: "المنافقون", ayahs: 11, juz: 28 },
    { n: 64, name: "التغابن", ayahs: 18, juz: 28 },
    { n: 65, name: "الطلاق", ayahs: 12, juz: 28 },
    { n: 66, name: "التحريم", ayahs: 12, juz: 28 },
    { n: 67, name: "الملك", ayahs: 30, juz: 29 },
    { n: 68, name: "القلم", ayahs: 52, juz: 29 },
    { n: 69, name: "الحاقة", ayahs: 52, juz: 29 },
    { n: 70, name: "المعارج", ayahs: 44, juz: 29 },
    { n: 71, name: "نوح", ayahs: 28, juz: 29 },
    { n: 72, name: "الجن", ayahs: 28, juz: 29 },
    { n: 73, name: "المزمل", ayahs: 20, juz: 29 },
    { n: 74, name: "المدثر", ayahs: 56, juz: 29 },
    { n: 75, name: "القيامة", ayahs: 40, juz: 29 },
    { n: 76, name: "الإنسان", ayahs: 31, juz: 29 },
    { n: 77, name: "المرسلات", ayahs: 50, juz: 29 },
    { n: 78, name: "النبأ", ayahs: 40, juz: 30 },
    { n: 79, name: "النازعات", ayahs: 46, juz: 30 },
    { n: 80, name: "عبس", ayahs: 42, juz: 30 },
    { n: 81, name: "التكوير", ayahs: 29, juz: 30 },
    { n: 82, name: "الانفطار", ayahs: 19, juz: 30 },
    { n: 83, name: "المطففين", ayahs: 36, juz: 30 },
    { n: 84, name: "الانشقاق", ayahs: 25, juz: 30 },
    { n: 85, name: "البروج", ayahs: 22, juz: 30 },
    { n: 86, name: "الطارق", ayahs: 17, juz: 30 },
    { n: 87, name: "الأعلى", ayahs: 19, juz: 30 },
    { n: 88, name: "الغاشية", ayahs: 26, juz: 30 },
    { n: 89, name: "الفجر", ayahs: 30, juz: 30 },
    { n: 90, name: "البلد", ayahs: 20, juz: 30 },
    { n: 91, name: "الشمس", ayahs: 15, juz: 30 },
    { n: 92, name: "الليل", ayahs: 21, juz: 30 },
    { n: 93, name: "الضحى", ayahs: 11, juz: 30 },
    { n: 94, name: "الشرح", ayahs: 8, juz: 30 },
    { n: 95, name: "التين", ayahs: 8, juz: 30 },
    { n: 96, name: "العلق", ayahs: 19, juz: 30 },
    { n: 97, name: "القدر", ayahs: 5, juz: 30 },
    { n: 98, name: "البينة", ayahs: 8, juz: 30 },
    { n: 99, name: "الزلزلة", ayahs: 8, juz: 30 },
    { n: 100, name: "العاديات", ayahs: 11, juz: 30 },
    { n: 101, name: "القارعة", ayahs: 11, juz: 30 },
    { n: 102, name: "التكاثر", ayahs: 8, juz: 30 },
    { n: 103, name: "العصر", ayahs: 3, juz: 30 },
    { n: 104, name: "الهمزة", ayahs: 9, juz: 30 },
    { n: 105, name: "الفيل", ayahs: 5, juz: 30 },
    { n: 106, name: "قريش", ayahs: 4, juz: 30 },
    { n: 107, name: "الماعون", ayahs: 7, juz: 30 },
    { n: 108, name: "الكوثر", ayahs: 3, juz: 30 },
    { n: 109, name: "الكافرون", ayahs: 6, juz: 30 },
    { n: 110, name: "النصر", ayahs: 3, juz: 30 },
    { n: 111, name: "المسد", ayahs: 5, juz: 30 },
    { n: 112, name: "الإخلاص", ayahs: 4, juz: 30 },
    { n: 113, name: "الفلق", ayahs: 5, juz: 30 },
    { n: 114, name: "الناس", ayahs: 6, juz: 30 },
];

export const TOTAL_AYAHS = 6236;

export const byNumber = new Map(SURAHS.map(s => [s.n, s]));

export function surahName(n) {
    const s = byNumber.get(n);
    return s ? s.name : `سورة ${n}`;
}

export function surahAyahs(n) {
    const s = byNumber.get(n);
    return s ? s.ayahs : 0;
}

// الأجزاء التي تبدأ فيها سورة واحدة على الأقل
export function surahsInJuz(juz) {
    return SURAHS.filter(s => s.juz === juz).map(s => s.n);
}

export const JUZ_WITH_SURAHS = (() => {
    const set = new Set(SURAHS.map(s => s.juz));
    return Array.from({ length: 30 }, (_, i) => i + 1).filter(j => set.has(j));
})();

// يحوّل نطاق اللوحة إلى قائمة أرقام سور مرتبة بترتيب المصحف
export function expandScope(scope) {
    if (!scope || scope.type === 'quran') {
        return SURAHS.map(s => s.n);
    }
    if (scope.type === 'juz') {
        const juzSet = new Set(scope.juzNumbers || []);
        return SURAHS.filter(s => juzSet.has(s.juz)).map(s => s.n);
    }
    if (scope.type === 'curriculum') {
        return scope.curriculum ? resolveCurriculumSurahs(scope.curriculum) : [];
    }
    // custom
    const nums = (scope.surahNumbers || []).filter(n => byNumber.has(n));
    return [...new Set(nums)].sort((a, b) => a - b);
}

export function ayahsInScope(surahNumbers) {
    return surahNumbers.reduce((sum, n) => sum + surahAyahs(n), 0);
}

// تُستخدم لمطابقة أسماء السور القادمة من مصادر خارجية (الاستيراد فقط)
export function normalizeArabic(text) {
    return String(text || '')
        .replace(/[ً-ٰٟ]/g, '') // التشكيل
        .replace(/ـ/g, '')                 // التطويل
        .replace(/^سورة\s+/, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ')
        .trim();
}

const normalizedIndex = new Map(SURAHS.map(s => [normalizeArabic(s.name), s.n]));

// يعيد رقم السورة من اسمها أو null إن لم يُتعرف عليه
export function surahNumberFromName(name) {
    const norm = normalizeArabic(name);
    if (normalizedIndex.has(norm)) return normalizedIndex.get(norm);
    return null;
}
