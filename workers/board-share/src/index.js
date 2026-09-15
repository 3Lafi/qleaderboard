import { boardImageVersion } from '../../../js/shared/board-image.js';

const APP_ORIGIN = 'https://wisam.web.app';
const BOARD_PATH = /^\/b\/([a-zA-Z0-9_-]{1,80})(\/image\.jpg)?\/?$/;

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function headers(contentType = 'text/html; charset=utf-8') {
    return {
        'Content-Type': contentType,
        // Do not persist public details after an edit, deletion, or privacy change.
        'Cache-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex',
        'Content-Security-Policy': `default-src 'none'; img-src 'self' ${APP_ORIGIN}; style-src 'unsafe-inline'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
    };
}

function page({ title, description, boardId, shareUrl, imageUrl }) {
    // Enter through the app shell. Its existing hash migration replaces this
    // with /b/{id} client-side, avoiding another HTTP redirect to this Worker.
    const appUrl = boardId ? `${APP_ORIGIN}/#/b/${boardId}` : APP_ORIGIN;
    return `<!doctype html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
${boardId ? `<link rel="canonical" href="${escape(shareUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="وسام">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(shareUrl)}">
<meta property="og:image" content="${escape(imageUrl)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escape(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${escape(imageUrl)}">
<script src="/open-board.js" defer></script>` : ''}
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f8f5;color:#153e34;font-family:system-ui,sans-serif}main{max-width:640px;margin:24px;text-align:center}img{width:100%;border-radius:20px}h1{font-size:1.5rem}p{line-height:1.8;color:#51635d}a{display:inline-block;background:#075c45;color:white;text-decoration:none;padding:12px 24px;border-radius:12px}</style>
</head><body><main>${boardId ? `<img src="${escape(imageUrl)}" alt="${escape(title)}" width="1200" height="630" style="height:auto">` : ''}
<h1>${escape(title)}</h1><p>${escape(description)}</p>
<a id="open-board" href="${appUrl}">${boardId ? 'فتح اللوحة' : 'العودة إلى وسام'}</a>
</main></body></html>`;
}

// Both crawlers and browsers receive the same HTML. Browsers then open the app;
// a regular link remains available when JavaScript is disabled.
const OPEN_SCRIPT = `const link = document.getElementById('open-board');
if (link) window.location.replace(link.href);`;

export async function handleRequest(request, env, fetchBoard = fetch) {
    const url = new URL(request.url);
    const respond = (body, status = 200, extra = {}) => new Response(request.method === 'HEAD' ? null : body, {
        status, headers: { ...headers(), ...extra },
    });
    if (!['GET', 'HEAD'].includes(request.method)) return respond('Method not allowed', 405, { Allow: 'GET, HEAD' });
    if (url.pathname === '/open-board.js') return respond(OPEN_SCRIPT, 200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    if (url.pathname === '/') return respond(null, 302, { Location: APP_ORIGIN });
    const match = url.pathname.match(BOARD_PATH);
    const unavailable = () => respond(page({ title: 'اللوحة غير متاحة', description: 'قد تكون اللوحة خاصة أو لم تعد موجودة.' }), 404);
    if (!match) return unavailable();
    const boardId = match[1];
    try {
        const endpoint = new URL(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/leaderboards/${boardId}`);
        endpoint.searchParams.set('key', env.FIREBASE_API_KEY);
        // Anonymous reads enforce the app's existing public/private Firestore rules.
        // A new read on every request avoids invalidation queues and stale metadata.
        const upstream = await fetchBoard(endpoint.toString(), {
            signal: AbortSignal.timeout(8000),
            cache: 'no-store',
        });
        if ([403, 404].includes(upstream.status)) return unavailable();
        if (!upstream.ok) throw new Error(`Firestore status ${upstream.status}`);
        const settings = (await upstream.json()).fields?.settings?.mapValue?.fields;
        if (settings?.isPublic?.booleanValue !== true) return unavailable();
        const field = name => (settings[name]?.stringValue || '').trim();
        const version = await boardImageVersion({
            name: field('name'), schoolName: field('schoolName'), classLabel: field('classLabel'),
            banner: { themeId: settings.banner?.mapValue?.fields?.themeId?.stringValue },
        });
        if (match[2]) {
            // Check visibility first, even for versioned URLs. Never serve a stale
            // stored image after a privacy change, deletion or banner edit.
            if (url.searchParams.has('v') && url.searchParams.get('v') !== version) return unavailable();
            endpoint.pathname = endpoint.pathname.replace('/leaderboards/', '/boardPreviews/');
            const imageResponse = await fetchBoard(endpoint.toString(), { signal: AbortSignal.timeout(8000), cache: 'no-store' });
            if (!imageResponse.ok) throw new Error(`Preview image status ${imageResponse.status}`);
            const image = (await imageResponse.json()).fields;
            if (image?.version?.stringValue !== version || !image.jpeg?.stringValue) throw new Error('Preview image is not current');
            const bytes = Uint8Array.from(atob(image.jpeg.stringValue), character => character.charCodeAt(0));
            if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.length > 187500) throw new Error('Invalid preview JPEG');
            return respond(bytes, 200, { 'Content-Type': 'image/jpeg' });
        }
        return respond(page({
            title: `${field('name') || 'لوحة حفظ القرآن'} — لوحة حفظ القرآن`,
            description: [field('schoolName'), field('classLabel')].filter(Boolean).join(' — ') || 'تابع تقدّم حفظ القرآن الكريم مباشرة على لوحة وسام',
            boardId,
            shareUrl: `${url.origin}/b/${boardId}`,
            imageUrl: `${url.origin}/b/${boardId}/image.jpg?v=${version}`,
        }));
    } catch (error) {
        console.error('Board preview read failed:', error.message);
        return respond(page({ title: 'تعذر تحميل اللوحة مؤقتاً', description: 'يرجى المحاولة مرة أخرى بعد قليل.' }), 503, { 'Retry-After': '5' });
    }
}

export default { fetch: (request, env) => handleRequest(request, env) };
