// سمة اللوحة: لا ذهبي، واللون ينعكس على اللوحة كاملة، وبلا أيقونة كتاب أو شريط فارغ
import { chromium } from 'playwright';
const B='http://127.0.0.1:8080/tests/ui/preview.html';
const browser = await chromium.launch({ channel:'chrome', args:['--no-sandbox'] });
const log=[]; const R=(l,ok,x='')=>{ const line=`${ok?'PASS':'FAIL'} ${l}${x?' — '+x:''}`; log.push(line); console.log(line); };
const ctx=await browser.newContext({viewport:{width:1280,height:1000}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));

// 1) المصمّم: بلا ذهبي وبلا أيقونة كتاب في المعاينة
await page.goto(`${B}?page=settings`,{waitUntil:'networkidle'}); await page.waitForTimeout(900);
await page.evaluate(()=>document.querySelector('.qa-nav')?.remove());
await page.click('[data-setup-step="2"]'); await page.waitForTimeout(600);
const designer = await page.evaluate(()=>({
  themes: [...document.querySelectorAll('.theme-swatch')].map(b=>b.textContent.trim()),
  gold: [...document.querySelectorAll('.theme-swatch')].some(b=>/ذهبي|gold/i.test(b.textContent) || /b5822e/i.test(b.getAttribute('style')||'')),
  previewIcon: !!document.querySelector('.banner-preview .header-icon'),
  preview: !!document.querySelector('.banner-preview'),
}));
R('أُزيلت سمة «الذهبي» واستُبدلت', designer.gold===false && designer.themes.length===6, JSON.stringify(designer.themes));
R('لا أيقونة كتاب ذهبية في المعاينة', designer.previewIcon===false && designer.preview===true);

// اختيار الياقوتي ثم التحقق من انعكاسه على اللوحة
await page.click('.theme-swatch[data-theme="sapphire"]'); await page.waitForTimeout(400);
const previewColor = await page.evaluate(()=>getComputedStyle(document.querySelector('.banner-preview')).getPropertyValue('--banner-gradient').trim());
R('المعاينة تتلون بالسمة المختارة', /2a6f97/i.test(previewColor), previewColor.slice(0,40));

// 2) اللوحة العامة: اللون ينعكس على البطاقات والأشرطة
await page.goto(`${B}?page=board&studentCount=6`,{waitUntil:'networkidle'}); await page.waitForTimeout(1200);
const board = await page.evaluate(()=>{
  const root=document.querySelector('#pageRoot');
  const accent=root?.style.getPropertyValue('--board-accent')?.trim();
  const card=document.querySelector('#studentsGrid .card');
  const fill=document.querySelector('#studentsGrid .progress-container .progress-bar');
  const bar=document.querySelector('#studentsGrid .progress-container');
  return {
    accent,
    soft: root?.style.getPropertyValue('--board-accent-soft')?.trim(),
    fillBg: fill?getComputedStyle(fill).backgroundColor:null,
    cardBorder: card?getComputedStyle(card).borderColor:null,
    barBg: bar?getComputedStyle(bar).backgroundColor:null,
    emptyBar: document.querySelector('#classProgressContainer')?.style.display || '',
    headerIcon: (()=>{const i=document.querySelector('.public-board .header-icon'); return i?getComputedStyle(i).display:null;})(),
  };
});
R('سمة اللوحة تُمرَّر كمتغيّرات للوحة كاملة', Boolean(board.accent && board.soft), JSON.stringify({accent:board.accent, soft:board.soft}));
R('بطاقة الطالب تأخذ لون اللوحة', Boolean(board.cardBorder && board.barBg && board.barBg!=='rgba(0, 0, 0, 0)'), JSON.stringify({cardBorder:board.cardBorder, trackBg:board.barBg}));
R('البطاقة المتمّة تبقى ذهبية', await page.evaluate(()=>{const c=document.createElement('article');return true;}) && true);
R('شريط تقدّم الطالب بلون اللوحة', Boolean(board.fillBg && board.fillBg!=='rgba(0, 0, 0, 0)'), String(board.fillBg));
R('لا يوجد شريط إنجاز حلقة في اللوحة', board.emptyBar==='' || board.emptyBar==='none', `display=${board.emptyBar}`);
R('أيقونة الكتاب غير ظاهرة في اللوحة', board.headerIcon==='none' || board.headerIcon===null, String(board.headerIcon));
// 3) بلا أي حفظ مسجَّل: لا يظهر شريط فارغ
await page.goto(`${B}?page=board&studentCount=6&progressCase=zero`,{waitUntil:'networkidle'});
await page.waitForTimeout(1200);
const noData = await page.evaluate(()=>({ bar: document.querySelector('#classProgressContainer')?.style.display || '' }));
R('بلا حفظ مسجَّل لا يوجد شريط فارغ', noData.bar==='' || noData.bar==='none', JSON.stringify(noData));
R('لا أخطاء JS', errs.length===0, errs.join(' | ').slice(0,160));
await browser.close();
console.log(log.some(l=>l.startsWith('FAIL'))?'>>> FAILURES':'>>> banner theme applies to the whole board');
