// كل عناصر اللوحة تأخذ لون اللوحة المختار بدل الأخضر
import { chromium } from 'playwright';
const B='http://127.0.0.1:8080/tests/ui/preview.html?page=board&studentCount=6';
const GREEN = /^(rgb\(33, 102, 83\)|rgb\(18, 63, 53\)|rgb\(55, 133, 110\)|rgb\(20, 121, 90\)|rgb\(14, 77, 58\))$/;
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
// تفعيل فلتر «أتموا الحفظ» لإظهار الحالة النشطة
await page.click('.board-student-filters [data-student-filter="completed"]').catch(()=>{});
await page.waitForTimeout(500);
const audit = await page.evaluate((greenSrc)=>{
  const GREEN=new RegExp(greenSrc);
  const root=document.querySelector('#pageRoot');
  const pick=(sel,prop)=>{ const el=document.querySelector(sel); if(!el) return {missing:true}; const cs=getComputedStyle(el); return { value: cs[prop] || cs.getPropertyValue(prop), bg: cs.backgroundColor, border: cs.borderColor, color: cs.color }; };
  const active=document.querySelector('.board-student-filters button[aria-pressed="true"]');
  const cs=active?getComputedStyle(active):null;
  const search=document.querySelector('.board-tools .badge-search');
  const h2=document.querySelector('.board-tools h2');
  const monogram=document.querySelector('#studentsGrid .card:not(.gold-card) .student-monogram');
  const greens=[];
  const check=(label,el,props)=>{ if(!el) return; const s=getComputedStyle(el); props.forEach(pr=>{ const v=s[pr]; if(typeof v==='string' && GREEN.test(v)) greens.push(`${label}.${pr}=${v}`); }); };
  check('filter-active', active, ['backgroundColor','borderTopColor','color']);
  check('filter-idle', document.querySelector('.board-student-filters button:not([aria-pressed="true"])'), ['borderTopColor','color']);
  check('search', search, ['borderTopColor']);
  check('tools-h2', h2, ['color']);
  check('monogram', monogram, ['backgroundColor','color','borderTopColor']);
  const pill = document.querySelector('.board-student-filters button > span');
  const pillActive = document.querySelector('.board-student-filters button[aria-pressed="true"] > span');
  return { greens, activeBg: cs?.backgroundColor, searchBorder: search?getComputedStyle(search).borderTopColor:null, h2: h2?getComputedStyle(h2).color:null, monogram: monogram?getComputedStyle(monogram).color:null,
    pill: pill?getComputedStyle(pill).backgroundColor:null, pillColor: pill?getComputedStyle(pill).color:null,
    pillActive: pillActive?getComputedStyle(pillActive).backgroundColor:null, pillActiveColor: pillActive?getComputedStyle(pillActive).color:null };
}, GREEN.source);
R('لا لون أخضر متبقٍ في عناصر اللوحة', audit.greens.length===0, JSON.stringify(audit.greens));
R('زر التصفية النشط بلا خلفية ملوّنة', audit.activeBg==='rgb(255, 255, 255)', String(audit.activeBg));
R('عنوان القسم بلون اللوحة', audit.h2==='rgb(94, 26, 40)', String(audit.h2));
const neutral = v => { const m=/rgb\((\d+), (\d+), (\d+)\)/.exec(v||''); if(!m) return false; const [r,g,b]=[+m[1],+m[2],+m[3]]; return Math.max(r,g,b)-Math.min(r,g,b)<=5; };
R('خلفية رقم الفلتر محايدة (لا مسحة زمردية)', neutral(audit.pill) && neutral(audit.pillActive), JSON.stringify({idle: audit.pill, active: audit.pillActive}));
R('نص رقم الفلتر بلون اللوحة', audit.pillColor==='rgb(94, 26, 40)' && audit.pillActiveColor==='rgb(94, 26, 40)', JSON.stringify({idle: audit.pillColor, active: audit.pillActiveColor}));
R('لا أخطاء JS', errs.length===0, errs.join(' | ').slice(0,120));
await browser.close();
console.log(log.some(l=>l.startsWith('FAIL'))?'>>> FAILURES':'>>> whole board follows the chosen colour');
