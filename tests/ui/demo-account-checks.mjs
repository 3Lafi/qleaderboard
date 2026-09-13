// فحص حساب المعلم التجريبي: الدفعة الواحدة وملف الطالب عبر البرامج (بيانات حقيقية)
import { chromium } from 'playwright';
const BASE = process.env.WISAM_URL || 'http://localhost:8080';
const EMAIL = 'demo.teacher@wisam.test';
const PASSWORD = 'WisamPassword123!';

const browser = await chromium.launch({ channel:'chrome', args:['--no-sandbox'] });
const log=[]; const R=(l,ok,x='')=>{ const line=`${ok?'PASS':'FAIL'} ${l}${x?' — '+x:''}`; log.push(line); console.log(line); };
const ctx = await browser.newContext({ viewport:{width:1400,height:950} });
const page = await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));

await page.goto(`${BASE}/login`, { waitUntil:'domcontentloaded', timeout: 40000 });
await page.waitForSelector('#appShell', { timeout: 20000 });
await page.waitForTimeout(1500);
await page.fill('#emailInput', EMAIL);
await page.fill('#passwordInput', PASSWORD);
await page.click('#submitBtn');
await page.waitForTimeout(6000);

const signedIn = await page.evaluate(()=>({ path: location.pathname, title: document.title }));
R('تسجيل الدخول بالحساب التجريبي', signedIn.path.startsWith('/dashboard') || /لوحاتي/.test(signedIn.title), JSON.stringify(signedIn));

// الدفعات
await page.goto(`${BASE}/cohorts`, { waitUntil:'domcontentloaded' });
await page.waitForTimeout(4000);
const cohorts = await page.evaluate(()=>({
  cards: [...document.querySelectorAll('.cohort-card-name')].map(el=>el.textContent.trim()),
  withStudents: document.querySelector('.cohort-card-meta')?.textContent?.trim() || '',
}));
R('الدفعة المجمّعة تظهر في صفحة الدفعات', cohorts.cards.length>=1, JSON.stringify(cohorts));

await page.click('.cohort-card');
await page.waitForTimeout(4000);
const cohortPage = await page.evaluate(()=>({
  name: document.querySelector('.page-title')?.textContent?.trim(),
  students: document.querySelectorAll('.cohort-student').length,
  hasAcrossLink: !!document.querySelector('.cohort-student-btn[href^="/students/"]'),
}));
R('الدفعة تضم كل أسماء البرامج الثلاثة', cohortPage.students===33, JSON.stringify(cohortPage));

// صفحة الطالب من داخل برنامجه: تعرض البرامج المجتازة والحفظ المشترك
await page.goto(`${BASE}/b/juztabarak29`, { waitUntil:'domcontentloaded' });
await page.waitForTimeout(5000);
const target = await page.evaluate(() => {
    const wanted = ['صالح العمر', 'عزام العمر', 'عبد الرحمن المزيد'];
    const card = [...document.querySelectorAll('#studentsGrid .card')]
        .find(el => wanted.includes(el.querySelector('.student-name')?.textContent.trim()));
    const link = card?.querySelector('.student-profile-link');
    return link ? { href: link.getAttribute('href'), name: card.querySelector('.student-name').textContent.trim() } : null;
});
R('فتح ملف طالب من اللوحة العامة', Boolean(target?.href), JSON.stringify(target));
await page.goto(`${BASE}${target.href}`, { waitUntil:'domcontentloaded' });
await page.waitForTimeout(5000);
const profile = await page.evaluate(()=>({
  path: location.pathname,
  facts: [...document.querySelectorAll('.profile-facts span')].map(s=>s.textContent.replace(/\s+/g,' ').trim()),
  passed: [...document.querySelectorAll('.passed-programs .student-program-card h3')].map(h=>h.textContent.trim()),
  title: document.querySelector('.passed-programs h2')?.textContent?.trim(),
  badges: document.querySelectorAll('.profile-badge-grid .achievement-card').length,
}));
R('صفحة الطالب من اللوحة تعرض البرامج المجتازة', profile.title==='البرامج المجتازة' && profile.passed.length>=2, JSON.stringify({passed: profile.passed}));
R('الأوسمة محسوبة من كل البرامج', profile.badges>10, `badges=${profile.badges}`);
R('لا أخطاء JS مع بيانات حقيقية', errs.length===0, errs.join(' | ').slice(0,200));
await browser.close();
console.log(log.some(l=>l.startsWith('FAIL'))?'>>> FAILURES':'>>> demo account flows work');
