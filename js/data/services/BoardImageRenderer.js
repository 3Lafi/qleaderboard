import { boardImageSource, boardImageVersion } from '../../shared/board-image.js';
import { bannerTheme } from '../../shared/banner-themes.js';

let fontsReady;
async function loadFonts() {
    if (!fontsReady) fontsReady = Promise.all([
        ['500', 'tajawal-medium.ttf'], ['800', 'tajawal-extrabold.ttf'],
    ].map(async ([weight, file]) => {
        const url = new URL(`../../../assets/fonts/${file}`, import.meta.url);
        const font = new FontFace('WisamPreview', `url("${url.href}")`, { weight });
        document.fonts.add(await font.load());
    })).catch(error => { fontsReady = null; throw error; });
    await fontsReady;
}

function linesFor(context, text, width) {
    const lines = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width <= width) { line = candidate; continue; }
        if (line) lines.push(line);
        line = '';
        // Handle unusually long names without spaces without clipping Arabic.
        for (const character of word) {
            if (line && context.measureText(line + character).width > width) {
                lines.push(line); line = '';
            }
            line += character;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function fit(context, text, weight, initialSize, maxLines) {
    for (let size = initialSize; size >= 22; size -= 2) {
        context.font = `${weight} ${size}px WisamPreview`;
        const lines = linesFor(context, text, 1032);
        if (lines.length <= maxLines) return { lines, size, weight };
    }
    throw new Error('تعذر تنسيق صورة المشاركة. اختصر اسم اللوحة أو تفاصيلها.');
}

export async function renderBoardImage(settings) {
    await loadFonts();
    const source = boardImageSource(settings);
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 630;
    const context = canvas.getContext('2d', { alpha: false });
    const colors = bannerTheme(source.themeId).gradient.match(/#[0-9a-f]{6}/gi);
    // Same 145° gradient as the live banner, with larger, legible preview text.
    const angle = 145 * Math.PI / 180;
    const dx = Math.sin(angle), dy = -Math.cos(angle);
    const length = Math.abs(1200 * dx) + Math.abs(630 * dy);
    const gradient = context.createLinearGradient(600 - dx * length / 2, 315 - dy * length / 2, 600 + dx * length / 2, 315 + dy * length / 2);
    gradient.addColorStop(0, colors[0]); gradient.addColorStop(1, colors[1]);
    context.fillStyle = gradient; context.fillRect(0, 0, 1200, 630);
    context.direction = 'rtl'; context.textAlign = 'center'; context.textBaseline = 'middle';
    const title = fit(context, source.name, 800, 86, 3);
    const subtitleText = [source.schoolName, source.classLabel].filter(Boolean).join(' — ');
    const subtitle = fit(context, subtitleText, 500, 40, 3);
    const titleHeight = title.lines.length * title.size * 1.35;
    const subtitleHeight = subtitle.lines.length * subtitle.size * 1.55;
    const gap = subtitle.lines.length ? 28 : 0;
    let top = (630 - titleHeight - subtitleHeight - gap) / 2;
    for (const block of [title, subtitle]) {
        const lineHeight = block.size * (block === title ? 1.35 : 1.55);
        context.font = `${block.weight} ${block.size}px WisamPreview`;
        context.fillStyle = block === title ? '#ffffff' : 'rgba(255,255,255,.92)';
        for (const line of block.lines) {
            context.fillText(line, 600, top + lineHeight / 2);
            top += lineHeight;
        }
        if (block === title) top += gap;
    }
    const jpeg = canvas.toDataURL('image/jpeg', .86).split(',')[1];
    if (!jpeg || jpeg.length > 250000) throw new Error('صورة المشاركة أكبر من الحجم المسموح.');
    return { version: await boardImageVersion(settings), jpeg };
}
