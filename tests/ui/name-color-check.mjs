// اسم الطالب يأخذ لون اللوحة المختار
import { chromium } from 'playwright';
const B='http://127.0.0.1:8080/tests/ui/preview.html?page=board&studentCount=6';
const browser = await chromium.launch({ channel:'chrome', args:['--no-sandbox'] });
const log=[]; const R=(l,ok,x='')=>{ const line=`${ok?'PASS':'FAIL'} ${l}${x?' — '+x:''}`; log.push(line); console.log(line); };
const ctx=await browser.newContext({viewport:{width:1280,height:950}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto(B,{waitUntil:'networkidle'}); await page.waitForTimeout(1300);
await page.evaluate(()=>{ document.querySelector('.qa-nav')?.remove();
  const r=document.querySelector('#pageRoot');
  r.style.setProperty('--board-accent','#a63d52'); r.style.setProperty('--board-accent-soft','#f8e8eb'); r.style.setProperty('--board-accent-ink','#5e1a28');
});
await page.waitForTimeout(400);
const colors = await page.evaluate(()=>{
  const name=document.querySelector('#studentsGrid .card:not(.gold-card) .student-name');
  const gold=document.querySelector('#studentsGrid .gold-card .student-name');
  return {
    name: name?getComputedStyle(name).color:null,
    gold: gold?getComputedStyle(gold).color:null,
  };
});
R('اسم الطالب يأخذ لون اللوحة المختار (العنابي)', colors.name==='rgb(94, 26, 40)', JSON.stringify(colors));
R('اسم الطالب المتمّ يبقى ذهبياً', colors.gold===null || colors.gold!=='rgb(94, 26, 40)', String(colors.gold));
R('لا أخطاء JS', errs.length===0, errs.join(' | ').slice(0,120));
await browser.close();
console.log(log.some(l=>l.startsWith('FAIL'))?'>>> FAILURES':'>>> student name follows the board colour');
