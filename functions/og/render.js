import { readFile } from 'node:fs/promises';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { bannerTheme } from './assets/banner-themes.js';
import { escapeHtml } from './model.js';

export async function renderBanner(snapshot) {
    const styles = await Promise.all(['tokens.css', 'main.css', 'wisam.css'].map(name => readFile(new URL(`assets/${name}`, import.meta.url), 'utf8')));
    const browser = await puppeteer.launch({ args: chromium.args, executablePath: process.env.OG_CHROMIUM_PATH || await chromium.executablePath(), headless: true });
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
        // No live board lookup: rendering always uses the immutable first banner.
        await page.setContent(`<html lang="ar" dir="rtl"><head><style>${styles.join('\n')}</style><style>
            *,*::before,*::after{animation:none!important;transition:none!important}
            html,body{margin:0!important;padding:0!important;width:1200px;height:630px;background:#f5f7f4}
            .public-board .board-banner{width:1200px!important;height:630px!important;margin:0!important;box-sizing:border-box}
            .public-board .banner-title{max-width:1000px!important;font-size:84px!important;line-height:1.28!important}
            .public-board .banner-subtitle{max-width:950px!important;font-size:36px!important;line-height:1.6!important}
        </style></head><body><div class="public-board"><header class="board-banner" style="--banner-gradient:${bannerTheme(snapshot.themeId).gradient}"><h1 class="banner-title">${escapeHtml(snapshot.name)}</h1><div class="banner-subtitle">${escapeHtml([snapshot.schoolName, snapshot.classLabel].filter(Boolean).join(' — '))}</div></header></div></body></html>`, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        if (!await page.evaluate(() => document.fonts.check('800 84px Tajawal'))) throw new Error('Banner font did not load');
        return Buffer.from(await page.screenshot({ type: 'jpeg', quality: 88 }));
    } finally { await browser.close(); }
}
