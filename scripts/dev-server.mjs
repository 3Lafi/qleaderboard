import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    const rawUrl = req.url || '/';
    const cleanUrl = rawUrl.split('?')[0].split('#')[0];
    if (/^\/(almanhaj|juz_amma|juz_tabarak)(?:\.html)?\/?$/.test(cleanUrl)) { res.writeHead(301, { Location: '/' }); res.end(); return; }
    let decoded;
    try { decoded = decodeURIComponent(cleanUrl); } catch { res.writeHead(400); res.end('Invalid URL'); return; }
    let filePath = path.resolve(root, '.' + decoded);
    if (decoded.startsWith('/tests/ui/app/')) filePath = path.join(root, 'tests/ui/preview.html');

    // Prevent directory traversal
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    // Check if direct file exists
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        fs.createReadStream(filePath).pipe(res);
        return;
    }

    // If path is a directory with index.html
    const indexInDir = path.join(filePath, 'index.html');
    if (fs.existsSync(indexInDir) && fs.statSync(indexInDir).isFile()) {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        fs.createReadStream(indexInDir).pipe(res);
        return;
    }

    // SPA fallback: for paths without an extension, serve root index.html
    if (!path.extname(cleanUrl)) {
        const rootIndex = path.join(root, 'index.html');
        if (fs.existsSync(rootIndex)) {
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            fs.createReadStream(rootIndex).pipe(res);
            return;
        }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
});

server.listen(PORT, HOST, () => {
    console.log(`Wisam dev server running at http://${HOST}:${PORT}/`);
});
