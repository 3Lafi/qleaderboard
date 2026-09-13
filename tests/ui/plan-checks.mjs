// فحوص خطة الحفظ: إزالة النصوص المكرّرة، قاعدة ترتيب الأجزاء، ومحرّر الترتيب (سحب/أسهم)
import { chromium } from 'playwright';
const B='http://127.0.0.1:8080/tests/ui/preview.html?page=settings';
const browser = await chromium.launch({ channel:'chrome', args:['--no-sandbox'] });
const log=[]; const R=(l,ok,x='')=>log.push(`${ok?'PASS':'FAIL'} ${l}${x?' — '+x:''}`);
const ctx = await browser.newContext({ viewport:{width:1280,height:1000} });
const page = await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto(B,{waitUntil:'networkidle'});
await page.waitForTimeout(900);
await page.evaluate(()=>document.querySelector('.qa-nav')?.remove());
await page.click('[data-setup-step="1"]');
await page.waitForTimeout(500);

async function setRange(unit, fromN, toN) {
    await page.click(`[data-range-unit="${unit}"]`).catch(()=>{});
    await page.waitForTimeout(250);
    await page.click('#rangeFrom'); await page.waitForTimeout(350);
    await page.fill('#rangePickerSearch', String(fromN)); await page.waitForTimeout(250);
    await page.click(`[data-range-value="${fromN}"]`); await page.waitForTimeout(300);
    await page.fill('#rangePickerSearch', String(toN)); await page.waitForTimeout(250);
    await page.click(`[data-range-value="${toN}"]`); await page.waitForTimeout(300);
    await page.click('#applyRange'); await page.waitForTimeout(450);
}
const names = () => page.evaluate(()=>[...document.querySelectorAll('.curriculum-surah-card .surah-card-name')].map(n=>n.textContent.trim()));

// 1) النصوص المطلوب حذفها
const removed = await page.evaluate(()=>({
    directionBadge: !!document.querySelector('#rangeDirectionBadge'),
    bottomSwap: !!document.querySelector('#swapRange'),
    mushafHint: [...document.querySelectorAll('.form-hint, .range-chooser-meta')].some(el=>/المصحف|تنازلياً|تصاعدياً/.test(el.textContent)),
    middleSwap: !!document.querySelector('#swapRangeMiddle'),
}));
R('حُذفت شارة تصاعدي/تنازلي', removed.directionBadge===false);
R('حُذف زر «عكس ترتيب الحفظ» السفلي', removed.bottomSwap===false);
R('حُذف شرح ترتيب المصحف', removed.mushafHint===false);
R('بقي زر العكس في الوسط', removed.middleSwap===true);

// 2) من الجزء 29 إلى 30 ثم عكس => النبأ..الناس ثم الملك..المرسلات
await setRange('juz', 29, 30);
const forward = await names();
R('نطاق الأجزاء تصاعدياً يبدأ بالملك', forward[0]==='الملك' && forward.length===48, JSON.stringify({first:forward[0], total:forward.length}));
await page.click('#swapRangeMiddle'); await page.waitForTimeout(500);
const reversed = await names();
// الجزء 30 يقع في المواضع 0..36 (النبأ..الناس)، ثم يبدأ الجزء 29 بالملك
R('العكس يبدأ بالنبأ وينتهي بالمرسلات', reversed[0]==='النبأ' && reversed[36]==='الناس' && reversed[37]==='الملك' && reversed.at(-1)==='المرسلات', JSON.stringify({first:reversed[0], lastOfJuz30:reversed[36], firstOfJuz29:reversed[37], last:reversed.at(-1), total:reversed.length}));

// 3) نطاق السور المعكوس يعكس السور نفسها
await setRange('surah', 100, 105);
await page.click('#swapRangeMiddle'); await page.waitForTimeout(500);
const surahsReversed = await names();
R('عكس نطاق السور يعكس السور', surahsReversed[0]==='الفيل' && surahsReversed.at(-1)==='العاديات', JSON.stringify(surahsReversed));

// 4) محرّر الترتيب داخل الخطة
await page.click('#planOrderToggle'); await page.waitForTimeout(500);
const editor = await page.evaluate(()=>({
    handles: document.querySelectorAll('[data-drag-handle]').length,
    moves: document.querySelectorAll('[data-move]').length,
    pressed: document.querySelector('#planOrderToggle')?.getAttribute('aria-pressed'),
}));
R('محرّر الترتيب يُفعّل داخل الخطة', editor.handles===6 && editor.moves===12 && editor.pressed==='true', JSON.stringify(editor));

const before = await page.evaluate(()=>[...document.querySelectorAll('.curriculum-surah-card')].map(c=>c.dataset.surah));
await page.click('.curriculum-surah-card:first-child [data-move="1"]'); await page.waitForTimeout(300);
const afterMove = await page.evaluate(()=>({
    order: [...document.querySelectorAll('.curriculum-surah-card')].map(c=>c.dataset.surah),
    badges: [...document.querySelectorAll('.surah-order-badge')].map(b=>b.textContent),
}));
R('زر التحريك يغيّر الترتيب ويعيد الترقيم', afterMove.order[0]===before[1] && afterMove.order[1]===before[0] && afterMove.badges[0]==='1', JSON.stringify({before:before.slice(0,2), after:afterMove.order.slice(0,2)}));

// السحب بالفأرة عبر أحداث المؤشر
const beforeDrag = await page.evaluate(()=>[...document.querySelectorAll('.curriculum-surah-card')].map(c=>c.dataset.surah));
const dragged = await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('.curriculum-surah-card')];
    const handle=cards[0].querySelector('[data-drag-handle]');
    const target=cards[2];
    const hb=handle.getBoundingClientRect(), tb=target.getBoundingClientRect();
    const fire=(type,y)=>handle.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,clientX:hb.x+5,clientY:y,pointerId:1}));
    fire('pointerdown',hb.y+5);
    fire('pointermove',tb.bottom+6);
    fire('pointerup',tb.bottom+6);
    return [...document.querySelectorAll('.curriculum-surah-card')].map(c=>c.dataset.surah);
});
R('السحب والإفلات يعيد الترتيب', dragged.indexOf(beforeDrag[0])===2 && dragged.length===beforeDrag.length, JSON.stringify({beforeDrag, after:dragged}));

const saved = await page.evaluate(()=>({ summary: document.querySelector('#scopeCounter')?.textContent || '' }));
R('ملخّص الخطة يتحدث بعد الترتيب', saved.summary.length>0, saved.summary.slice(0,50));

// استعادة الترتيب الافتراضي
await page.click('#planOrderReset'); await page.waitForTimeout(500);
const restored = await names();
R('استعادة الترتيب تعيد الترتيب المحسوب', restored[0]===surahsReversed[0], JSON.stringify({restored:restored[0], expected:surahsReversed[0]}));
R('لا أخطاء JS في محرّر الخطة', errs.length===0, errs.join('; '));
await browser.close();
console.log(log.join('\n'));
console.log(log.some(l=>l.startsWith('FAIL'))?'>>> FAILURES':'>>> plan ordering works');
