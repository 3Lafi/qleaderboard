import { SURAHS } from '../../shared/quran-data.js';
import { JUZ_BOUNDARIES } from '../../shared/juz-boundaries.js';
import { normalizeArabic, normalizeSearchQuery, matchesQueryNameOrNumber } from '../../shared/text-utils.js';

export function parseRangeEndpoint(value, unit) {
    const text = normalizeSearchQuery(value);
    const numbered = /^(\d+)(?:\s*[—–-].*)?$/.exec(text);
    const number = numbered ? Number(numbered[1]) : unit === 'surah' ? SURAHS.find(s => normalizeArabic(s.name) === text)?.n : null;
    return Number.isInteger(number) && number >= 1 && number <= (unit === 'juz' ? 30 : 114) ? number : null;
}

export function resolvePlanRange(unit, from, to) {
    const max = unit === 'juz' ? 30 : 114;
    if (![from, to].every(n => Number.isInteger(n) && n >= 1 && n <= max)) return null;
    const numbers = Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => Math.min(from, to) + i);
    const surahNumbers = unit === 'juz'
        ? [...new Set(numbers.flatMap(j => Object.keys(JUZ_BOUNDARIES[j]).map(Number)))].sort((a, b) => a - b)
        : numbers;
    return {
        scope: {
            type: unit === 'juz' ? 'juz' : surahNumbers.length === 114 ? 'quran' : 'custom',
            juzNumbers: unit === 'juz' ? numbers : [],
            curriculum: null,
            surahNumbers
        },
        direction: from > to ? 'reverse' : 'forward',
    };
}

// Keep search in canonical Quran order; a number always means an exact endpoint.
export function rangeOptionsForQuery(query, unit) {
    let text = normalizeSearchQuery(query);
    if (unit === 'juz') text = text.replace(/^(?:الجزء|جزء)\s*/, '').trim();
    const options = unit === 'surah' ? SURAHS : Array.from({ length: 30 }, (_, i) => ({ n: i + 1, name: `الجزء ${i + 1}` }));
    return options.filter(s => matchesQueryNameOrNumber(s, text));
}
