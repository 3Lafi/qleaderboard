// صفحة الطالب من داخل أي لوحة يجب أن تُظهر برامجه الأخرى وحفظه المشترك
import { chromium } from 'playwright';
const BASE = process.env.WISAM_URL || 'http://localhost:8080';
const EMAIL='demo.teacher@wisam.test', PASSWORD='WisamPassword123!';
const browser = await chromium.launch({ channel:'chrome', args:['--no-sandbox'] });
const log=[]; const R=(l,ok,x='')=>{ const line=`${ok?'PASS':'FAIL'} ${l}${x?' — '+x:''}`; log.push(line); console.log(line); };
const ctx=await browser.newContext({viewport:{width:1400,height:950}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));

await page.goto(`${BASE}/login`,{waitUntil:'domcontentloaded'});
await page.waitForSelector('#appShell'); await page.waitForTimeout(1500);
await page.fill('#emailInput', EMAIL); await page.fill('#passwordInput', PASSWORD);
await page.click('#submitBtn'); await page.waitForTimeout(6000);

// افتح برنامج «جزء تبارك» ثم ملف طالب مشترك من جدول المتابعة
await page.goto(`${BASE}/edit/juztabarak29/students`,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(5000);
const opened = await page.evaluate(()=>{
  const link=[...document.querySelectorAll('.sheet-student-top a')].find(a=>/صالح العمر/.test(a.textContent));
  return link ? link.getAttribute('href') : null;
});
R('فتح ملف طالب من جدول برنامج جزء تبارك', Boolean(opened), String(opened));
await page.goto(`${BASE}${opened}`,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(6000);

const profile = await page.evaluate(()=>({
  path: location.pathname,
  facts: [...document.querySelectorAll('.profile-facts span, .profile-facts a')].map(s=>s.textContent.replace(/\s+/g,' ').trim()),
  cards: [...document.querySelectorAll('.passed-programs .student-program-card h3')].map(h=>h.textContent.trim()),
  currentTag: [...document.querySelectorAll('.passed-programs .program-badge-current')].map(el=>el.textContent.trim()),
  doneTags: document.querySelectorAll('.passed-programs .program-badge-done').length,
  sectionTitle: document.querySelector('.passed-programs h2')?.textContent?.trim(),
  badges: document.querySelectorAll('.profile-badge-grid .achievement-card').length,
  unifiedLink: document.querySelector('.profile-fact-link')?.getAttribute('href') || '',
  unifiedAbsent: !document.querySelector('.profile-fact-link') && !document.querySelector('a[href^="/students/"]'),
}));
R('العنوان أصبح «البرامج المجتازة»', profile.sectionTitle==='البرامج المجتازة', String(profile.sectionTitle));
R('القسم يشمل البرنامج الحالي لأنه مجتاز', profile.currentTag.length===1, JSON.stringify(profile.currentTag));
R('ويعرض بقية البرامج المجتازة', profile.cards.length>=2, JSON.stringify(profile.cards));
R('حُذف عدّاد «سورة من برامج أخرى» من الأعلى', !profile.facts.some(f=>/برامج أخرى/.test(f)), JSON.stringify(profile.facts));
R('حُذف رابط «ملفه في كل البرامج»', profile.unifiedAbsent===true && profile.unifiedLink==='', JSON.stringify({link: profile.unifiedLink}));
R('الأوسمة محسوبة من كل البرامج', profile.badges>10, `badges=${profile.badges}`);
R('لا أخطاء JS', errs.length===0, errs.join(' | ').slice(0,160));
await browser.close();
console.log(log.some(l=>l.startsWith('FAIL'))?'>>> FAILURES':'>>> cross-program profile works');
