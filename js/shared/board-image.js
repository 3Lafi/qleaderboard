import { bannerTheme } from './banner-themes.js';

export function boardImageSource(settings) {
    return {
        layout: 'banner-v1',
        name: String(settings?.name || '').trim() || 'لوحة حفظ القرآن',
        schoolName: String(settings?.schoolName || '').trim(),
        classLabel: String(settings?.classLabel || '').trim(),
        themeId: bannerTheme(settings?.banner?.themeId).id,
    };
}

export async function boardImageVersion(settings) {
    const bytes = new TextEncoder().encode(JSON.stringify(boardImageSource(settings)));
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
