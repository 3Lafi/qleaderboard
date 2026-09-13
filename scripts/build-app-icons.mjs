import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = `${root}images/badges-assets/wisam badge.jpg`;
const badgeBase = `${root}images/badges-assets/frames/quran-ornate-v6`;
const appIconsDir = `${root}images/app-icons`;
mkdirSync(appIconsDir, { recursive: true });

// Package the reference with a silhouette clip, preserving its calligraphy and
// ornament. Inspect the white-background boundary without keying the interior:
// bright gold highlights must remain opaque.
const side = 1600;
const rgb = execFileSync('magick', [source, '-resize', `${side}x${side}`, '-depth', '8', 'rgb:-'], { maxBuffer: side * side * 3 + 1024 });
const rows = [];
for (let y = 0; y < side; y++) {
    let left = -1, right = -1;
    for (let x = 0; x < side; x++) {
        const i = (y * side + x) * 3;
        const max = Math.max(rgb[i], rgb[i + 1], rgb[i + 2]);
        const min = Math.min(rgb[i], rgb[i + 1], rgb[i + 2]);
        if (max - min > 25 && min < 225) {
            if (left === -1) left = x;
            right = x;
        }
    }
    if (right - left > 20) rows.push([y, left + 1, right - 1]);
}
if (rows.length < side * .9) throw new Error('Reference silhouette was not detected.');
const points = [...rows.map(([y, left]) => `${left},${y}`), ...rows.slice().reverse().map(([y, , right]) => `${right},${y}`)];
const jpeg = execFileSync('magick', [source, '-resize', `${side}x${side}`, '-strip', '-quality', '94', 'jpeg:-'], { maxBuffer: 8 * 1024 * 1024 }).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${side} ${side}"><defs><clipPath id="badge"><polygon points="${points.join(' ')}"/></clipPath></defs><image width="${side}" height="${side}" clip-path="url(#badge)" xlink:href="data:image/jpeg;base64,${jpeg}"/></svg>`;
writeFileSync(`${badgeBase}.svg`, svg);
execFileSync('rsvg-convert', ['-w', '1024', '-h', '1024', '-o', `${badgeBase}.png`, `${badgeBase}.svg`]);
execFileSync('magick', [`${badgeBase}.png`, '-quality', '92', `${badgeBase}.webp`]);

for (const size of [512, 192, 180, 32]) {
    const target = `${appIconsDir}/badge-v6-${size}.png`;
    execFileSync('magick', [`${badgeBase}.png`, '-filter', 'Lanczos', '-resize', `${size}x${size}`, '-strip', target]);
    console.log(`Generated: ${target}`);
}
const png = readFileSync(`${appIconsDir}/badge-v6-512.png`).toString('base64');
writeFileSync(`${appIconsDir}/badge-v6.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${png}"/></svg>`);
console.log(`Generated: ${badgeBase}.{svg,png,webp}`);
