// Compatibility for already-open app versions: clear their old retry queues
// without generating files, reading Firestore or dispatching a deployment.
export default {
    async fetch(request) {
        const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            Vary: 'Origin',
        };
        if (request.headers.get('Origin') === 'https://wisam.web.app') {
            Object.assign(headers, {
                'Access-Control-Allow-Origin': 'https://wisam.web.app',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            });
        }
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
        if (request.method !== 'POST') return new Response('{"error":"Method not allowed"}', { status: 405, headers });
        return new Response('{"queued":false,"mode":"live"}', { status: 200, headers });
    },
};
