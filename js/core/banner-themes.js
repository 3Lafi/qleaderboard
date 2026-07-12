// سمات البانر: تُختار مرة واحدة عند إنشاء اللوحة ولا تتغيّر بعدها (تُثبّتها قواعد Firestore).
// تُستخدم في ثلاثة أماكن يجب أن تبقى متطابقة بصرياً: معاينة المصمّم عند الإنشاء،
// هيدر اللوحة العامة، وصورة معاينة الرابط (WhatsApp/OG) المولّدة في CI —
// لذلك تعيش هنا كوحدة بيانات خالصة صالحة للمتصفح ولـ Node معاً.
export const BANNER_THEMES = [
    { id: 'emerald', name: 'الزمردي', gradient: 'linear-gradient(145deg, #168a5c 0%, #0a4d36 100%)', shadow: 'rgba(7, 64, 46, 0.2)' },
    { id: 'sapphire', name: 'الياقوتي', gradient: 'linear-gradient(145deg, #2a6f97 0%, #123a56 100%)', shadow: 'rgba(18, 58, 86, 0.25)' },
    { id: 'amethyst', name: 'الأرجواني', gradient: 'linear-gradient(145deg, #7d5ba6 0%, #43265e 100%)', shadow: 'rgba(67, 38, 94, 0.25)' },
    { id: 'burgundy', name: 'العنابي', gradient: 'linear-gradient(145deg, #a63d52 0%, #5e1a28 100%)', shadow: 'rgba(94, 26, 40, 0.25)' },
    { id: 'amber', name: 'الذهبي', gradient: 'linear-gradient(145deg, #b5822e 0%, #6e4a14 100%)', shadow: 'rgba(110, 74, 20, 0.25)' },
    { id: 'midnight', name: 'الليلي', gradient: 'linear-gradient(145deg, #3b5268 0%, #14202e 100%)', shadow: 'rgba(20, 32, 46, 0.3)' },
];

export const DEFAULT_THEME_ID = 'emerald';

export function isBannerThemeId(id) {
    return BANNER_THEMES.some(t => t.id === id);
}

// يعيد السمة المطلوبة، أو الافتراضية لأي معرّف مجهول/مفقود (لوحات قديمة بلا banner)
export function bannerTheme(id) {
    return BANNER_THEMES.find(t => t.id === id) || BANNER_THEMES[0];
}
