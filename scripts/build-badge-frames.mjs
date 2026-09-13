// Package the shared arch silhouette in an SVG clipping path, then rasterize.
// The generated source artwork is preserved; the SVG defines the UI boundary.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
// Landmarks follow the inside of the common outer contour; the inset avoids halos.
const rows = [[30,567,684],[44,497,753],[74,421,828],[114,357,892],[174,291,957],[244,241,1007],[314,211,1038],[394,192,1056],[434,156,1094],[484,149,1100],[580,149,1100],[700,149,1100],[800,149,1100],[880,149,1100],[920,153,1096],[960,165,1084],[1000,189,1060],[1040,227,1023],[1080,274,975],[1120,331,918],[1160,398,851],[1200,481,769],[1220,535,714],[1228,575,674]];
const points = [[626,30], ...rows.map(([y,,x])=>[x,y]), [626,1230], ...rows.slice().reverse().map(([y,x])=>[x,y])];
let outline = `M${points[0].join(' ')}`;
for (let i=0; i<points.length; i++) {
    const prev=points[(i-1+points.length)%points.length], current=points[i], next=points[(i+1)%points.length], after=points[(i+2)%points.length];
    const c1=current.map((v,k)=>v+(next[k]-prev[k])/6), c2=next.map((v,k)=>v-(after[k]-current[k])/6);
    outline += ` C${c1.join(' ')} ${c2.join(' ')} ${next.join(' ')}`;
}
outline += ' Z';
for (const type of ['juz', 'surah']) {
    const source = `${root}images/badges-assets/sources/${type}-soft-v5.png`;
    if (!existsSync(source)) continue;
    const data = readFileSync(source).toString('base64');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1254 1254"><defs><clipPath id="outline"><path d="${outline}"/></clipPath></defs><image width="1254" height="1254" clip-path="url(#outline)" xlink:href="data:image/png;base64,${data}"/></svg>`;
    const base = `${root}images/badges-assets/frames/${type}-soft-v5`;
    writeFileSync(`${base}.svg`, svg);
    execFileSync('rsvg-convert', ['-o', `${base}.png`, `${base}.svg`]);
}
const crownSource = `${root}images/badges-assets/completion/program-crown-book-v6-source.png`;
if (existsSync(crownSource)) {
    const data = readFileSync(crownSource).toString('base64');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1254 1254"><defs><clipPath id="outline"><path d="${outline}"/></clipPath></defs><image width="1254" height="1254" clip-path="url(#outline)" xlink:href="data:image/png;base64,${data}"/></svg>`;
    const base = `${root}images/badges-assets/completion/program-crown-book-v6`;
    writeFileSync(`${base}.svg`, svg);
    execFileSync('rsvg-convert', ['-o', `${base}.png`, `${base}.svg`]);
    execFileSync('magick', [`${base}.png`, '-quality', '92', `${base}.webp`]);
}
