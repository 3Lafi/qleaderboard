// طالب داخل لوحة: يحسب نسبة الحفظ موزونة بعدد الآيات والخط الزمني للسور
import { surahName, surahAyahs } from '../../core/quran-data.js';

export class Student {
    constructor(id, data, orderedScopeSurahs) {
        this.id = id;
        this.name = data.name || '';
        this.memorized = data.memorized || [];
        this.completedDate = data.completedDate || null;
        this.createdAt = data.createdAt || null;
        // ترتيب السور ضمن النطاق باتجاه الحفظ المعتمد في إعدادات اللوحة
        this.scope = orderedScopeSurahs || [];
    }

    get memorizedInScope() {
        const scopeSet = new Set(this.scope);
        return this.memorized.filter(n => scopeSet.has(n));
    }

    get surahsCount() {
        return this.memorizedInScope.length;
    }

    get totalSurahsInScope() {
        return this.scope.length;
    }

    get progress() {
        const scopeAyahs = this.scope.reduce((sum, n) => sum + surahAyahs(n), 0);
        if (scopeAyahs === 0) return 0;
        const memorizedAyahs = this.memorizedInScope.reduce((sum, n) => sum + surahAyahs(n), 0);
        return (memorizedAyahs / scopeAyahs) * 100;
    }

    get progressPercentage() {
        return Math.round(this.progress);
    }

    get isCompleted() {
        const scopeSet = new Set(this.scope);
        return scopeSet.size > 0 && [...scopeSet].every(n => this.memorized.includes(n));
    }

    get formattedSurahsCount() {
        return `${this.surahsCount} من ${this.totalSurahsInScope} سورة`;
    }

    // يحسب حالة كل سورة في النطاق: محفوظة / متبقية / متخطاة (بين أول وآخر سورة محفوظة، باستثناء الفاتحة)
    get surahsTimeline() {
        if (this.scope.length === 0) return [];

        const memorizedSet = new Set(this.memorizedInScope);
        if (memorizedSet.size === 0) {
            return this.scope.map(n => ({ n, name: surahName(n), state: 'pending' }));
        }

        const positions = this.scope
            .map((n, idx) => ({ n, idx }))
            .filter(({ n }) => memorizedSet.has(n) && n !== 1);

        let minIdx = Infinity;
        let maxIdx = -Infinity;
        if (positions.length > 0) {
            minIdx = Math.min(...positions.map(p => p.idx));
            maxIdx = Math.max(...positions.map(p => p.idx));
        }

        return this.scope.map((n, idx) => {
            let state = 'pending';
            if (memorizedSet.has(n)) {
                state = 'memorized';
            } else if (idx > minIdx && idx < maxIdx && n !== 1) {
                state = 'skipped';
            }
            return { n, name: surahName(n), state };
        });
    }
}
