// يمثّل لوحة حفظ واحدة: إعداداتها ونطاق السور المحسوب منها
import { expandScope, ayahsInScope } from '../../core/quran-data.js';

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
