// الدفعات: تسجيل دفعة بالاسم، إضافة الطلاب، وإنشاء برنامج منها
import { chromium } from 'playwright';
const B='http://127.0.0.1:8080/tests/ui/preview.html';
const browser = await chromium.launch({ channel:'chrome', args:['--no-sandbox'] });
const log=[]; const R=(l,ok,x='')=>{ const line=`${ok?'PASS':'FAIL'} ${l}${x?' — '+x:''}`; log.push(line); console.log(line); };
const ctx=await browser.newContext({viewport:{width:1280,height:950}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.evaluate(()=>0).catch(()=>{});

// 1) قائمة الدفعات: التسجيل بالاسم
await page.goto(`${B}?page=cohorts`,{waitUntil:'networkidle'});
await page.waitForTimeout(900);
await page.evaluate(()=>document.querySelector('.qa-nav')?.remove());
const list = await page.evaluate(()=>({
  title: document.querySelector('.page-title')?.textContent,
  form: !!document.querySelector('#cohortCreateForm'),
  cards: document.querySelectorAll('.cohort-card').length,
}));
R('صفحة الدفعات فيها تسجيل بالاسم فقط', list.form===true && !document.querySelector('#cohortDate'), JSON.stringify({cards:list.cards}));
R('الدفعة التجريبية تظهر في القائمة', list.cards>=1, String(list.cards));

// إنشاء دفعة جديدة
await page.fill('#cohortName','دفعة اختبار 1448');
await page.click('#createCohortBtn');
await page.waitForTimeout(1200);
const afterCreate = await page.evaluate(()=>({ path: location.pathname+location.search, heading: document.querySelector('.page-title')?.textContent }));
R('تسجيل الدفعة ينقل إلى صفحتها', /cohorts/.test(afterCreate.path) || /دفعة/.test(afterCreate.heading||''), JSON.stringify(afterCreate));

// 2) صفحة الدفعة: إضافة طلاب متتابعة + قائمة أسماء
await page.goto(`${B}?page=cohort`,{waitUntil:'networkidle'});
await page.waitForTimeout(900);
await page.evaluate(()=>document.querySelector('.qa-nav')?.remove());
const before = await page.evaluate(()=>document.querySelectorAll('.cohort-student').length);
await page.fill('#cohortStudentName','طالب جديد ١');
await page.keyboard.press('Enter');
await page.waitForTimeout(900);
const afterAdd = await page.evaluate(()=>({
  count: document.querySelectorAll('.cohort-student').length,
  value: document.querySelector('#cohortStudentName')?.value,
  focused: document.activeElement?.id,
}));
R('إضافة طالب للدفعة تعمل ويبقى الحقل جاهزاً', afterAdd.count===before+1 && afterAdd.value==='' && afterAdd.focused==='cohortStudentName', JSON.stringify(afterAdd));

await page.click('#bulkToggle'); await page.waitForTimeout(300);
await page.fill('#cohortBulkNames','طالب قائمة ١\nطالب قائمة ٢\nطالب قائمة ٣');
await page.click('#saveBulk'); await page.waitForTimeout(1200);
const afterBulk = await page.evaluate(()=>document.querySelectorAll('.cohort-student').length);
R('إضافة قائمة أسماء دفعة واحدة', afterBulk===afterAdd.count+3, JSON.stringify({before: afterAdd.count, after: afterBulk}));

// 3) إنشاء برنامج من الدفعة
await page.click('#createProgram'); await page.waitForTimeout(700);
const dialog = await page.evaluate(()=>({
  open: !!document.querySelector('.cohort-program-dialog'),
  name: document.querySelector('#programName')?.value,
  summary: document.querySelector('.promote-summary')?.textContent?.replace(/\s+/g,' ').trim().slice(0,60),
  scopes: document.querySelectorAll('input[name="programScope"]').length,
}));
R('نافذة إنشاء البرنامج من الدفعة تفتح', dialog.open===true && dialog.scopes===2, JSON.stringify({name:dialog.name, scopes:dialog.scopes}));
R('البرنامج يرث اسم الدفعة وعدد طلابها', /دفعة/.test(dialog.name||'') && /طالباً/.test(dialog.summary||''), JSON.stringify(dialog));
await page.click('#confirmProgram'); await page.waitForTimeout(1800);
const created = await page.evaluate(()=>({
  dialogGone: !document.querySelector('.cohort-program-dialog'),
  toast: document.querySelector('#toastHost')?.textContent?.trim() || '',
  title: document.title,
}));
R('إنشاء البرنامج يضيف طلاب الدفعة', created.dialogGone===true && /طالباً|أنشئ/.test(created.toast), JSON.stringify({toast: created.toast.slice(0,60)}));
R('لا أخطاء JS في صفحات الدفعات', errs.length===0, errs.join('; '));

// 4) الدفعات في الشريط الجانبي
const nav = await page.evaluate(()=>!!document.querySelector('#sidebarGlobalNav a[data-nav-key="cohorts"]'));
R('«الدفعات» ظاهرة في الشريط الجانبي', nav===true);
await browser.close();
console.log(log.some(l=>l.startsWith('FAIL'))?'>>> FAILURES':'>>> cohorts work');
