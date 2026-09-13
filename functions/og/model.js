export function firstBanner(settings = {}) {
    return {
        name: String(settings.name || 'لوحة حفظ القرآن').slice(0, 100),
        schoolName: String(settings.schoolName || '').slice(0, 150),
        classLabel: String(settings.classLabel || '').slice(0, 150),
        themeId: String(settings.banner?.themeId || 'emerald'),
    };
}

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function withMetadata(template, snapshot, boardId) {
    const title = `${snapshot.name} — لوحة حفظ القرآن`;
    const description = [snapshot.schoolName, snapshot.classLabel].filter(Boolean).join(' — ');
    const image = `https://wisam.web.app/og/${encodeURIComponent(boardId)}.jpg`;
    const tags = { 'og:title': title, 'og:description': description, 'og:url': `https://wisam.web.app/b/${encodeURIComponent(boardId)}`, 'og:type': 'website', 'og:image': image, 'og:image:type': 'image/jpeg', 'og:image:width': '1200', 'og:image:height': '630' };
    return template.replace(/<meta\s+(?:property|name)="(?:og:|twitter:)[^>]*>/g, '')
        .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
        .replace('</head>', Object.entries(tags).map(([key, value]) => `<meta property="${key}" content="${escapeHtml(value)}">`).join('\n') + '\n<meta name="twitter:card" content="summary_large_image">\n</head>');
}
