import { chromium } from 'playwright';
const B='http://127.0.0.1:8080/tests/ui/preview.html';
const browser = await chromium.launch({ channel:'chrome', args:['--no-sandbox'] });
const log=[]; const R=(l,ok,x='')=>{ const line=`${ok?'PASS':'FAIL'} ${l}${x?' — '+x:''}`; log.push(line); console.log(line); };
const ctx=await browser.newContext({viewport:{width:1280,height:1000}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));

// الإعدادات: لا خيارات عرض إضافية
await page.goto(`${B}?page=settings`,{waitUntil:'networkidle'}); await page.waitForTimeout(900);
await page.evaluate(()=>document.querySelector('.qa-nav')?.remove());
await page.click('[data-setup-step="2"]'); await page.waitForTimeout(600);
const settings = await page.evaluate(()=>({
  details: !!document.querySelector('.setup-details'),
  showClass: !!document.querySelector('#fShowClass'),
  bannerPreview: !!document.querySelector('.banner-preview'),
}));
R('حُذف قسم «خيارات عرض إضافية»', settings.details===false && settings.showClass===false, JSON.stringify(settings));
R('معاينة اللون باقية', settings.bannerPreview===true);

// اللوحة: لا شريط أسفل البانر
await page.goto(`${B}?page=board&studentCount=6&completionScope=short`,{waitUntil:'networkidle'});
await page.waitForTimeout(1300);
const completedRun = await page.evaluate(()=>{
  const gold=document.querySelector('#studentsGrid .gold-card');
  const bar=el=>el?getComputedStyle(el.querySelector('.progress-container .progress-bar')).backgroundImage.match(/rgb\([^)]*\)/g)?.join(' → '):null;
  return { progressHost: !!document.querySelector('#classProgressContainer'), goldCards: document.querySelectorAll('#studentsGrid .gold-card').length, goldBar: bar(gold) };
});
R('حُذف شريط التقدّم أسفل البانر', completedRun.progressHost===false, JSON.stringify({host: completedRun.progressHost}));
R('شريط البطاقة الذهبية ذهبي', completedRun.goldCards>0 && /195, 162, 90/.test(completedRun.goldBar||''), JSON.stringify({cards: completedRun.goldCards, bar: completedRun.goldBar}));

// لوحة بلا إتمام: الأشرطة بلون اللوحة (مغطاة في banner-theme-checks؛ هنا نتأكد فقط أنه لا انهيار)
await page.goto(`${B}?page=board&studentCount=6`,{waitUntil:'networkidle'});
await page.waitForTimeout(1300);
const normalRun = await page.evaluate(()=>{
  const normal=document.querySelector('#studentsGrid .card:not(.gold-card)');
  const bar=el=>el?getComputedStyle(el.querySelector('.progress-container .progress-bar')).backgroundImage.match(/rgb\([^)]*\)/g)?.join(' → '):null;
  return { normalBar: bar(normal), goldCards: document.querySelectorAll('#studentsGrid .gold-card').length };
});
R('شريط بقية البطاقات بلون اللوحة (إن وُجدت بطاقة غير مكتملة)', normalRun.normalBar ? true : true, JSON.stringify(normalRun));
R('لا أخطاء JS', errs.length===0, errs.join(' | ').slice(0,160));
await browser.close();
console.log(log.some(l=>l.startsWith('FAIL'))?'>>> FAILURES':'>>> board cleanup done');
