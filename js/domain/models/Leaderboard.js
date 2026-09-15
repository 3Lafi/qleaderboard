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
import { expandScope, ayahsInScope, orderPlanSurahs } from '../../shared/quran-data.js';
import { DEFAULT_THEME_ID } from '../../shared/banner-themes.js';
import { curriculumClassLabel, orderedCurriculumSurahs } from '../../shared/curriculum-data.js';

const DEFAULT_PROGRAM_JUZ = 30;
const defaultProgramScope = () => ({
    type: 'juz',
    juzNumbers: [DEFAULT_PROGRAM_JUZ],
    surahNumbers: expandScope({ type: 'juz', juzNumbers: [DEFAULT_PROGRAM_JUZ] }),
});

export class Leaderboard {
    constructor(id, data) {
        this.id = id;
        this.ownerUid = data.ownerUid;
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
        this.previewRevision = data.previewRevision || '';
        this.settings = {
            name: data.settings?.name || '',
            schoolName: data.settings?.schoolName || '',
            classLabel: data.settings?.classLabel || '',
            banner: { themeId: data.settings?.banner?.themeId || DEFAULT_THEME_ID },
            scope: data.settings?.scope || defaultProgramScope(),
            direction: data.settings?.direction || 'reverse',
            isPublic: data.settings?.isPublic !== false,
            showClassProgress: data.settings?.showClassProgress !== false,
            classCurrentSurah: data.settings?.classCurrentSurah ?? null,
            cohortId: data.settings?.cohortId || '',
            priorMode: data.settings?.priorMode === 'none' ? 'none' : 'auto',
            priorSurahs: Array.isArray(data.settings?.priorSurahs)
                ? [...new Set(data.settings.priorSurahs.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 114))].sort((a, b) => a - b)
                : [],
        };
        this.students = data.students || {};
        if (this.settings.scope.type === 'curriculum') this.settings.classLabel = curriculumClassLabel(this.settings.scope.curriculum);
    }

    // قائمة أرقام السور ضمن نطاق اللوحة، مرتّبة حسب اتجاه الحفظ المختار
    orderedSurahs() {
        const scope = this.settings.scope;
        const nums = scope.surahNumbers && scope.surahNumbers.length
            ? [...scope.surahNumbers].sort((a, b) => a - b)
            : expandScope(scope);
        if (scope.type === 'curriculum') {
            // ترتيب المنهج الدراسي ترتيبٌ رسمي لا يُعكس باتجاه الحفظ، ويقبل الترتيب المخصص فقط
            const ordered = orderedCurriculumSurahs(scope.curriculum).filter(n=>nums.includes(n));
            const curriculumOrder = [...ordered,...nums.filter(n=>!ordered.includes(n))];
            return orderPlanSurahs(curriculumOrder, {
                type: 'custom',
                direction: 'forward',
                customOrder: scope.customOrder
            });
        }
        return orderPlanSurahs(nums, {
            type: scope.type,
            direction: this.settings.direction,
            customOrder: scope.customOrder
        });
    }

    totalAyahsInScope() {
        return ayahsInScope(this.settings.scope.surahNumbers || []);
    }

    studentsCount() {
        return Object.keys(this.students).length;
    }
}
