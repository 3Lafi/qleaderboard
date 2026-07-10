// عميل قراءة فقط لواجهة Google Apps Script القديمة — يُستخدم في صفحة الاستيراد فقط
import { LEGACY_API_URL } from '../../core/config.js';

export async function fetchLegacyCurricula() {
    let url = LEGACY_API_URL;
    url += url.includes('?') ? '&' : '?';
    url += `t=${Date.now()}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const json = await response.json();
    if (json.status !== 'success') throw new Error('فشل جلب البيانات من Google Sheets');

    return json.data; // { "المنهج": [...], "جزء عم": [...], "جزء تبارك": [...] }
}

// يفصل صف "إنجاز الفصل" (إن وُجد) عن بقية الطلاب، ويستخرج اسم السورة اليدوي إن كُتب
export function splitClassProgressRow(rows) {
    let classCurrentSurahName = null;
    const students = rows.filter(row => {
        const name = row.name || '';
        if (name.includes('إنجاز الفصل') || name.includes('تقدم الفصل') || name === 'المنهج' || name.includes('المنهج -')) {
            if (name.includes('-')) {
                classCurrentSurahName = name.split('-')[1].trim();
            }
            return false;
        }
        return true;
    });
    return { students, classCurrentSurahName };
}
