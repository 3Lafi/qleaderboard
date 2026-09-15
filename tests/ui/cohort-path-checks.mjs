// ربط الدفعة باللوحة وتدفّق المجتازين تلقائياً (بلا زر ترقية)
import { chromium } from 'playwright';
const B='http://127.0.0.1:8080/tests/ui/preview.html';
const browser = await chromium.launch({ channel:'chrome', args:['--no-sandbox'] });
const log=[]; const R=(l,ok,x='')=>{ const line=`${ok?'PASS':'FAIL'} ${l}${x?' — '+x:''}`; log.push(line); console.log(line); };
const ctx=await browser.newContext({viewport:{width:1280,height:950}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));

// 1) لا يوجد زر «ترقية المتمين» بعد الآن
await page.goto(`${B}?page=students&studentCount=5`,{waitUntil:'networkidle'});
await page.waitForTimeout(900);
await page.evaluate(()=>document.querySelector('.qa-nav')?.remove());
const promoteGone = await page.evaluate(()=>({ button: !!document.querySelector('#promoteStudents'), dialog: !!document.querySelector('.promote-dialog') }));
R('حُذف زر ترقية المتمين', promoteGone.button===false, JSON.stringify(promoteGone));

// 2) ربط الدفعة من إعدادات اللوحة
await page.goto(`${B}?page=settings`,{waitUntil:'networkidle'});
await page.waitForTimeout(900);
await page.evaluate(()=>document.querySelector('.qa-nav')?.remove());
await page.click('[data-setup-step="1"]'); await page.waitForTimeout(500);
const link = await page.evaluate(()=>({
  card: !!document.querySelector('#cohortLinkCard'),
  options: [...document.querySelectorAll('#fCohort option')].map(o=>o.textContent.trim()),
  hint: document.querySelector('#cohortLinkHint')?.textContent?.trim() || '',
}));
R('بطاقة «ربط الدفعة باللوحة» موجودة مع قائمة الدفعات', link.card===true && link.options.length>=2, JSON.stringify(link.options));
await page.selectOption('#fCohort', { index: 1 }); await page.waitForTimeout(400);
const hint = await page.evaluate(()=>document.querySelector('#cohortLinkHint')?.textContent?.trim() || '');
R('الشرح يوضح الانتقال التلقائي', /ينتقل للبرنامج التالي|ينتقل تلقائياً/.test(hint), hint.slice(0,80));

// 3) مسار الدفعة في صفحة الدفعة + المزامنة التلقائية
await page.goto(`${B}?page=cohort`,{waitUntil:'networkidle'});
await page.waitForTimeout(1500);
const path = await page.evaluate(()=>({
  title: document.querySelector('.cohort-path h2')?.textContent?.trim(),
  items: [...document.querySelectorAll('.cohort-path-item a')].map(a=>a.textContent.trim()),
  syncControls: !!document.querySelector('#syncProgression, #syncStatus'),
}));
R('مسار الدفعة يعرض البرامج المرتبطة بالترتيب', path.title==='مسار الدفعة' && path.items.length>=1, JSON.stringify(path.items));
R('المزامنة تلقائية بلا عناصر تحكم يدوية', path.syncControls===false, JSON.stringify(path));
R('لا أخطاء JS', errs.length===0, errs.join(' | ').slice(0,160));
await browser.close();
console.log(log.some(l=>l.startsWith('FAIL'))?'>>> FAILURES':'>>> cohort linking + progression work');
