import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { imageBrowser } from './lib/board-image-browser.mjs';
import { BANNER_THEMES } from '../js/shared/banner-themes.js';
const renderer = await imageBrowser();
const destination = '/tmp/wisam-board-image-samples';
await mkdir(destination, { recursive: true });
try {
    for (const theme of BANNER_THEMES) {
        const result = await renderer.render({
            name: 'حلقة النور لحفظ القرآن الكريم', schoolName: 'مدرسة البيان', classLabel: 'الصف الثاني · المرحلة الابتدائية', banner: { themeId: theme.id },
        });
        const bytes = Buffer.from(result.jpeg, 'base64');
        assert.equal(bytes[0], 255); assert.equal(bytes[1], 216);
        assert.ok(result.jpeg.length < 250000);
        await writeFile(`${destination}/${theme.id}.jpg`, bytes);
        console.log(`${theme.id}: ${bytes.length} bytes`);
    }
    const long = await renderer.render({ name: 'اسم طويل لاختبار وضوح عنوان اللوحة '.repeat(3).slice(0, 100), schoolName: 'مدرسة البيان '.repeat(8).slice(0,100), classLabel: 'الصف الثاني · المرحلة الابتدائية' });
    await writeFile(`${destination}/long.jpg`, Buffer.from(long.jpeg, 'base64'));
    const unbroken = await renderer.render({ name: 'س'.repeat(100) });
    assert.ok(unbroken.jpeg.length < 250000);
    console.log('Arabic wrapping, all six themes, and JPEG size checks passed.');
} finally { await renderer.close(); }
