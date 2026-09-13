// Preserve the approved source frame and calligraphy while refining the inlay.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const original = readFileSync(`${root}images/badges-assets/frames/quran-ornate-v6.svg`, 'utf8');
const artwork = readFileSync(`${root}images/badges-assets/sources/quran-botanical-v10.png`).toString('base64');
const band = 'M800 161 C1040 161 1234 344 1234 596 L1234 1104 C1234 1260 1041 1372 902 1425 Q800 1474 698 1425 C554 1371 362 1260 362 1104 L362 596 C362 344 559 161 800 161 Z M800 407 A395 393 0 1 0 800 1193 A395 393 0 1 0 800 407 Z';
const svg = original.replace('</svg>', `<defs><clipPath id="botanical"><path clip-rule="evenodd" d="${band}"/></clipPath></defs><image width="1600" height="1600" clip-path="url(#botanical)" xlink:href="data:image/png;base64,${artwork}"/></svg>`);
const out = `${root}images/badges-assets/frames/quran-botanical-v10`;
writeFileSync(`${out}.svg`, svg);
execFileSync('rsvg-convert', ['-w', '1024', '-h', '1024', '-o', `${out}.png`, `${out}.svg`]);
execFileSync('magick', [`${out}.png`, '-quality', '94', `${out}.webp`]);
for (const size of [32, 180, 192, 512]) {
    execFileSync('magick', [`${out}.png`, '-filter', 'Lanczos', '-resize', `${size}x${size}`, '-strip', `${root}images/app-icons/badge-v10-${size}.png`]);
}
const icon = readFileSync(`${root}images/app-icons/badge-v10-512.png`).toString('base64');
writeFileSync(`${root}images/app-icons/badge-v10.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${icon}"/></svg>`);
console.log('Built botanical badge and 32, 180, 192, 512px app icons.');
