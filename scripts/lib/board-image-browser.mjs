import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
export async function imageBrowser() {
    const server = createServer(async (request, response) => {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        if (pathname === '/') { response.end('<!doctype html><html lang="ar"><body></body></html>'); return; }
        if (!/^\/(js|assets\/fonts)\//.test(pathname)) { response.writeHead(404).end(); return; }
        const filename = path.resolve(root, '.' + pathname);
        if (!filename.startsWith(root)) { response.writeHead(403).end(); return; }
        try {
            response.setHeader('Content-Type', filename.endsWith('.js') ? 'text/javascript' : 'font/ttf');
            response.end(await readFile(filename));
        } catch { response.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    return {
        render: settings => page.evaluate(async settings => {
            const { renderBoardImage } = await import('/js/data/services/BoardImageRenderer.js');
            return renderBoardImage(settings);
        }, settings),
        close: async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); },
    };
}
