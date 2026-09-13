const FIREBASE_CERTIFICATES_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const FIRESTORE_API_URL = 'https://firestore.googleapis.com/v1/projects';
let certificates = null;
let certificatesExpiresAt = 0;

function base64UrlDecode(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}

function jsonPart(value) {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(value)));
}

function corsHeaders(request) {
    const origin = request.headers.get('Origin');
    return origin === 'https://wisam.web.app'
        ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
        : {};
}

async function firebaseCertificates() {
    if (certificates && Date.now() < certificatesExpiresAt) return certificates;
    const response = await fetch(FIREBASE_CERTIFICATES_URL);
    if (!response.ok) throw new Error('Could not load Firebase signing certificates');
    const cacheSeconds = Number(response.headers.get('Cache-Control')?.match(/max-age=(\d+)/)?.[1] || 3600);
    certificates = await response.json();
    certificatesExpiresAt = Date.now() + cacheSeconds * 1000;
    return certificates;
}

async function verifyFirebaseToken(token, projectId) {
    const [encodedHeader, encodedPayload, encodedSignature, ...extra] = token.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature || extra.length) throw new Error('Malformed token');
    const header = jsonPart(encodedHeader);
    const payload = jsonPart(encodedPayload);
    if (header.alg !== 'RS256' || !header.kid || payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}` || !payload.sub || payload.exp * 1000 <= Date.now()) throw new Error('Invalid token claims');
    const pem = (await firebaseCertificates())[header.kid];
    if (!pem) throw new Error('Unknown token signing key');
    const der = Uint8Array.from(atob(pem.replace(/-----(BEGIN|END) CERTIFICATE-----|\s/g, '')), (character) => character.charCodeAt(0));
    const key = await crypto.subtle.importKey('spki', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlDecode(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
    if (!valid) throw new Error('Invalid token signature');
    return payload;
}

async function isPublicBoardOwnedBy(boardId, uid, projectId, apiKey) {
    const url = `${FIRESTORE_API_URL}/${projectId}/databases/(default)/documents/leaderboards/${encodeURIComponent(boardId)}?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    if (!response.ok) return false;
    const fields = (await response.json()).fields || {};
    return fields.ownerUid?.stringValue === uid && fields.settings?.mapValue?.fields?.isPublic?.booleanValue === true;
}

function response(body, status, request) {
    return new Response(body, { status, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } });
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(request) });
        if (request.method !== 'POST') return response(JSON.stringify({ error: 'Method not allowed' }), 405, request);
        try {
            const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
            const { boardId } = await request.json();
            if (!token || typeof boardId !== 'string' || !/^[a-z0-9]{8}$/.test(boardId)) return response(JSON.stringify({ error: 'Invalid request' }), 400, request);
            const user = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
            if (!await isPublicBoardOwnedBy(boardId, user.user_id || user.sub, env.FIREBASE_PROJECT_ID, env.FIREBASE_API_KEY)) return response(JSON.stringify({ error: 'Board unavailable' }), 404, request);
            const github = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}/dispatches`, {
                method: 'POST',
                headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`, 'User-Agent': 'Wisam-OG-trigger', 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_type: 'board-banner-saved', client_payload: { boardId } }),
            });
            if (!github.ok) throw new Error(`GitHub dispatch failed (${github.status})`);
            return response(JSON.stringify({ queued: true }), 202, request);
        } catch (error) {
            console.error(error.message);
            return response(JSON.stringify({ error: 'Could not request an OG refresh' }), 500, request);
        }
    },
};
