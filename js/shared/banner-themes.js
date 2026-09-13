// سمات البانر: تُختار مرة واحدة عند إنشاء اللوحة ولا تتغيّر بعدها (تُثبّتها قواعد Firestore).
// تُستخدم في ثلاثة أماكن يجب أن تبقى متطابقة بصرياً: معاينة المصمّم عند الإنشاء،
// هيدر اللوحة العامة، وصورة معاينة الرابط (WhatsApp/OG) المولّدة في CI —
// لذلك تعيش هنا كوحدة بيانات خالصة صالحة للمتصفح ولـ Node معاً.
export const BANNER_THEMES = [
    {
        id: 'emerald', name: 'الزمردي',
        gradient: 'linear-gradient(145deg, #168a5c 0%, #0a4d36 100%)', shadow: 'rgba(7, 64, 46, 0.2)',
        accent: '#14795a', accentSoft: '#e6f2ec', accentInk: '#0b4a37'
    },
    {
        id: 'sapphire', name: 'الياقوتي الأزرق',
        gradient: 'linear-gradient(145deg, #2a6f97 0%, #123a56 100%)', shadow: 'rgba(18, 58, 86, 0.25)',
        accent: '#2a6f97', accentSoft: '#e5eff6', accentInk: '#123a56'
    },
    {
        id: 'turquoise', name: 'الفيروزي',
        gradient: 'linear-gradient(145deg, #1f9c96 0%, #0b5751 100%)', shadow: 'rgba(11, 87, 81, 0.25)',
        accent: '#17867f', accentSoft: '#e2f3f2', accentInk: '#0b5751'
    },
    {
        id: 'amethyst', name: 'الأرجواني',
        gradient: 'linear-gradient(145deg, #7d5ba6 0%, #43265e 100%)', shadow: 'rgba(67, 38, 94, 0.25)',
        accent: '#7d5ba6', accentSoft: '#efe9f6', accentInk: '#43265e'
    },
    {
        id: 'burgundy', name: 'العنابي',
        gradient: 'linear-gradient(145deg, #a63d52 0%, #5e1a28 100%)', shadow: 'rgba(94, 26, 40, 0.25)',
        accent: '#a63d52', accentSoft: '#f8e8eb', accentInk: '#5e1a28'
    },
    {
        id: 'midnight', name: 'الليلي',
        gradient: 'linear-gradient(145deg, #3b5268 0%, #14202e 100%)', shadow: 'rgba(20, 32, 46, 0.3)',
        accent: '#3b5268', accentSoft: '#e8edf2', accentInk: '#14202e'
    },
];

// معرّفات قديمة: «الذهبي» أُزيل لأن الذهبي محجوز للطالب المتم، فلوحات قديمة تظهر بالفيروزي
const LEGACY_THEME_IDS = { amber: 'turquoise', gold: 'turquoise' };

export const DEFAULT_THEME_ID = 'emerald';

export function isBannerThemeId(id) {
    const key = LEGACY_THEME_IDS[id] || id;
    return BANNER_THEMES.some(t => t.id === key);
}

// يعيد السمة المطلوبة، أو الافتراضية لأي معرّف مجهول/مفقود (لوحات قديمة بلا banner)
export function bannerTheme(id) {
    const key = LEGACY_THEME_IDS[id] || id;
    return BANNER_THEMES.find(t => t.id === key) || BANNER_THEMES[0];
}
