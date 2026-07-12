// يمثّل لوحة حفظ واحدة: إعداداتها ونطاق السور المحسوب منها
//
// قرار تصميم متعمّد: كل لوحة مستند واحد في Firestore (بما فيه كل طلابها) — قراءة واحدة
// لكل زائر، ومزامنة لحظية رخيصة عبر onSnapshot. عند حد 150 طالباً يبقى المستند بحدود
// 200KB وهو أقل بكثير من حد 1MB لكل مستند. أبقِ هذا التصميم كما هو.
// مخرج الطوارئ (إن احتجنا تاريخاً تفصيلياً لكل طالب أو تجاوزنا حد حجم المستند مستقبلاً):
// انقل students إلى subcollection مستقلة (leaderboards/{boardId}/students/{studentId})
// — هذا يتيح أيضاً التحقق من شكل كل طالب في قواعد Firestore بشكل مستقل (غير ممكن حالياً
// على خريطة بمفاتيح غير معروفة مسبقاً، انظر firestore.rules) لكنه يرفع تكلفة القراءة
// إلى N+1 لكل لوحة بدل قراءة واحدة.
import { expandScope, ayahsInScope } from '../../core/quran-data.js';
import { DEFAULT_THEME_ID } from '../../core/banner-themes.js';

export class Leaderboard {
    constructor(id, data) {
        this.id = id;
        this.ownerUid = data.ownerUid;
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
        this.settings = {
            name: data.settings?.name || '',
            schoolName: data.settings?.schoolName || '',
            classLabel: data.settings?.classLabel || '',
            banner: { themeId: data.settings?.banner?.themeId || DEFAULT_THEME_ID },
            scope: data.settings?.scope || { type: 'quran', surahNumbers: expandScope({ type: 'quran' }) },
            direction: data.settings?.direction || 'reverse',
            isPublic: data.settings?.isPublic !== false,
            showClassProgress: data.settings?.showClassProgress !== false,
            classCurrentSurah: data.settings?.classCurrentSurah ?? null,
        };
        this.students = data.students || {};
    }

    // قائمة أرقام السور ضمن نطاق اللوحة، مرتّبة حسب اتجاه الحفظ المختار
    orderedSurahs() {
        const nums = this.settings.scope.surahNumbers && this.settings.scope.surahNumbers.length
            ? [...this.settings.scope.surahNumbers].sort((a, b) => a - b)
            : expandScope(this.settings.scope);
        return this.settings.direction === 'reverse' ? nums.slice().reverse() : nums;
    }

    totalAyahsInScope() {
        return ayahsInScope(this.settings.scope.surahNumbers || []);
    }

    studentsCount() {
        return Object.keys(this.students).length;
    }
}
