import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const assets = path.join(root, 'functions/og/assets');
mkdirSync(assets, { recursive: true });
for (const file of ['index.html', 'js/shared/banner-themes.js', 'css/main.css', 'css/wisam.css', 'css/tokens.css']) {
    copyFileSync(path.join(root, file), path.join(assets, path.basename(file)));
}
// Seed already published cards so migration preserves existing WhatsApp previews.
const seeds = path.join(assets, 'legacy');
mkdirSync(seeds, { recursive: true });
for (const name of readdirSync(path.join(root, 'images/og'))) {
    if (/^[a-zA-Z0-9_-]+\.[a-f0-9]+\.jpg$/.test(name)) copyFileSync(path.join(root, 'images/og', name), path.join(seeds, name));
}
