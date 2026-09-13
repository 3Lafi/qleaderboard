// المحتسب سابقاً وترقية المتمين: الطالب المتنقل يحتفظ بأوسمته، والمعلّم ينقل المتمين بسهولة
import { chromium } from 'playwright';
const B='http://127.0.0.1:8080/tests/ui/preview.html';
const browser = await chromium.launch({ channel:'chrome', args:['--no-sandbox'] });
const log=[]; const R=(l,ok,x='')=>{ const line=`${ok?'PASS':'FAIL'} ${l}${x?' — '+x:''}`; log.push(line); console.log(line); };

// 1) لوحة جزء 29: من أتم جزء 30 يحتفظ بأوسمته
{
  const ctx=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(`${B}?page=settings`,{waitUntil:'networkidle'});
  await page.waitForTimeout(900);
  await page.evaluate(()=>document.querySelector('.qa-nav')?.remove());
  await page.click('[data-setup-step="1"]'); await page.waitForTimeout(500);
  const prior = await page.evaluate(()=>({
    card: !!document.querySelector('#priorCard'),
    checked: document.querySelector('#fPriorAuto')?.checked,
    hint: document.querySelector('#priorHint')?.textContent?.trim() || '',
  }));
  R('بطاقة المحتسب سابقاً موجودة ومفعّلة افتراضياً', prior.card===true && prior.checked===true, JSON.stringify({checked: prior.checked}));
  R('الشرح يوضح ما سيُحتسب', /سيُحتسب|لا توجد برامج/.test(prior.hint), prior.hint.slice(0,70));

  // إيقاف الاحتساب يعكس الشرح
  await page.click('#fPriorAuto'); await page.waitForTimeout(300);
  const off = await page.evaluate(()=>document.querySelector('#priorHint')?.textContent?.trim() || '');
  R('إيقاف الاحتساب يوضح أثره', /لن تُحتسب/.test(off), off.slice(0,60));
  await page.click('#fPriorAuto'); await page.waitForTimeout(300);
  R('لا أخطاء JS في الإعدادات', errs.length===0, errs.join('; '));
  await ctx.close();
}

// 2) جدول المتابعة: زر ترقية المتمين + العدّاد + المحتسب الفردي
{
  const ctx=await browser.newContext({viewport:{width:1400,height:900}});
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(`${B}?page=students&completionScope=short&studentCount=6`,{waitUntil:'networkidle'});
  await page.waitForTimeout(900);
  await page.evaluate(()=>document.querySelector('.qa-nav')?.remove());
  const toolbar = await page.evaluate(()=>({
    button: !!document.querySelector('#promoteStudents'),
    label: document.querySelector('#promoteStudents')?.textContent?.replace(/\s+/g,' ').trim().slice(0,24),
    count: document.querySelector('#promoteCount')?.textContent?.trim() || '',
  }));
  R('زر ترقية المتمين ظاهر في الجدول', toolbar.button===true && /ترقية/.test(toolbar.label||''), JSON.stringify(toolbar));
  R('عدّاد المتمين يظهر عددهم', toolbar.count !== '', `count=${toolbar.count}`);

  // نافذة الترقية
  await page.click('#promoteStudents'); await page.waitForTimeout(600);
  const dlg = await page.evaluate(()=>({
    open: !!document.querySelector('.promote-dialog'),
    summary: document.querySelector('.promote-summary')?.textContent?.replace(/\s+/g,' ').trim().slice(0,80),
    name: document.querySelector('#promoteName')?.value,
    whoCompleted: document.querySelector('input[name="promoteWho"][value="completed"]')?.checked,
  }));
  R('نافذة الترقية تعرض المتمين والبرنامج المقترح', dlg.open && /طالب أتموا/.test(dlg.summary||''), JSON.stringify({summary: dlg.summary}));
  R('اسم البرنامج الجديد مقترح تلقائياً', Boolean(dlg.name && dlg.name.length>0), dlg.name);
  R('الافتراضي نقل المتمين فقط', dlg.whoCompleted===true);

  // تنفيذ النقل إلى برنامج جديد
  await page.fill('#promoteName','برنامج الترقية التجريبي');
  await page.click('#confirmPromote'); await page.waitForTimeout(1500);
  const after = await page.evaluate(()=>({
    dialogGone: !document.querySelector('.promote-dialog'),
    title: document.title,
    toast: document.querySelector('#toastHost')?.textContent?.trim() || '',
  }));
  R('النقل ينشئ البرنامج ويغلق النافذة', after.dialogGone===true, JSON.stringify({title:after.title, toast:after.toast.slice(0,50)}));

  // المحتسب الفردي من قائمة خيارات الطالب
  await page.goto(`${B}?page=students&studentCount=4`,{waitUntil:'networkidle'});
  await page.waitForTimeout(900);
  await page.evaluate(()=>document.querySelector('.qa-nav')?.remove());
  await page.click('[data-options]'); await page.waitForTimeout(500);
  const menu = await page.evaluate(()=>({ item: !!document.querySelector('#editStudentPrior') }));
  R('خيار «المحتسب من برامج سابقة» داخل قائمة الطالب', menu.item===true);
  await page.click('#editStudentPrior'); await page.waitForTimeout(600);
  const priorDialog = await page.evaluate(()=>({ open: !!document.querySelector('.prior-dialog'), chips: document.querySelectorAll('.prior-juz-chip').length }));
  R('نافذة المحتسب تعرض 30 جزءاً', priorDialog.open===true && priorDialog.chips===30, JSON.stringify(priorDialog));
  await page.click('.prior-juz-chip[data-prior-juz="30"]'); await page.waitForTimeout(250);
  const note = await page.evaluate(()=>document.querySelector('#priorNote')?.textContent?.trim() || '');
  R('اختيار جزء يوضح ما سيُحتسب', /سيُحتسب/.test(note), note.slice(0,50));
  await page.click('#savePrior'); await page.waitForTimeout(1000);
  const saved = await page.evaluate(()=>({ dialogGone: !document.querySelector('.prior-dialog') }));
  R('حفظ المحتسب يغلق النافذة', saved.dialogGone===true);
  R('لا أخطاء JS في الجدول', errs.length===0, errs.join('; '));
  await ctx.close();
}

// 3) السيناريو الكامل: طالب انتقل من جزء 30 إلى برنامج جزء 29
{
  const ctx=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(`${B}?page=profile&studentId=alpha&program=juz29`,{waitUntil:'networkidle'});
  await page.waitForTimeout(1200);
  await page.evaluate(()=>document.querySelector('.qa-nav')?.remove());
  const badges = await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('.profile-badge-grid [data-badge]')];
    const earned=cards.filter(c=>!c.classList.contains('is-locked')).map(c=>c.dataset.badge);
    return { earned, juz30: earned.includes('juz-30'), juz29: earned.includes('juz-29'), count: earned.length };
  });
  R('طالب انتقل لجزء 29 يحتفظ بأوسمة جزء 30', badges.juz30===true && badges.juz29===false, JSON.stringify({count:badges.count, juz30:badges.juz30, juz29:badges.juz29}));

  await page.goto(`${B}?page=profile&studentId=alpha&program=juz29-noprior`,{waitUntil:'networkidle'});
  await page.waitForTimeout(1200);
  const withoutPrior = await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('.profile-badge-grid [data-badge]')];
    return cards.filter(c=>!c.classList.contains('is-locked')).length;
  });
  R('إيقاف الاحتساب يعيد الأوسمة إلى صفر', withoutPrior===0, String(withoutPrior));
  R('لا أخطاء JS في ملف الطالب', errs.length===0, errs.join('; '));
  await ctx.close();
}

await browser.close();
console.log(log.join('\n'));
console.log(log.some(l=>l.startsWith('FAIL'))?'>>> FAILURES':'>>> prior + promotion work');
