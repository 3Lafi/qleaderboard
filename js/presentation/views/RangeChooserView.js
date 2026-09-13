import { uiIcon } from './InterfaceIcons.js';
import { SURAHS } from '../../shared/quran-data.js';
import { resolvePlanRange, rangeOptionsForQuery } from '../../domain/usecases/PlanRange.js';
import { escapeHtml } from './ui.js';
import { planIcon } from './PlanIcons.js';

// Exact named endpoints, edited as a draft. Cancel never changes the board's plan.
export function mountRangeChooser(host, onSelect) {
    const dialog=document.createElement('dialog');
    dialog.className='range-chooser range-composer';
    dialog.setAttribute('aria-labelledby','rangeChooserTitle');
    dialog.innerHTML=`<div class="range-chooser-heading"><div><span>خطة تناسب طلابك</span><h2 id="rangeChooserTitle">تحديد نطاق الحفظ</h2></div><button type="button" class="sheet-icon-button" id="closeRangeChooser" aria-label="إغلاق الاختيار">${uiIcon('x')}</button></div>
        <div class="composer-endpoints" role="group" aria-label="الطرف الذي تعدّله"><button type="button" data-compose-endpoint="from"><small>تبدأ من</small><strong id="composerFrom"></strong><span>البداية</span></button><button type="button" data-compose-endpoint="to"><small>وتنتهي عند</small><strong id="composerTo"></strong><span>النهاية</span></button></div>
        <p class="composer-instruction" id="rangeChooserContext" role="status"></p>
        <label class="setup-search">${planIcon('search')}<input type="search" id="rangePickerSearch" aria-label="ابحث في السور أو الأجزاء" autocomplete="off" autofocus></label>
        <div class="range-chooser-meta"><span id="rangePickerCount" role="status"></span></div>
        <div class="range-chooser-options" id="rangePickerOptions" role="group" aria-label="الخيارات المتاحة"></div>
        <div class="composer-footer"><div id="composerSummary" role="status"></div><div><button type="button" class="btn btn-secondary" id="cancelRange">إلغاء</button><button type="button" class="btn btn-primary" id="applyRange">اعتماد النطاق</button></div></div>`;
    host.appendChild(dialog);
    const search=dialog.querySelector('input'), options=dialog.querySelector('#rangePickerOptions');
    let unit='surah', endpoint='from', from=null, to=null, visible=[], returnFocus=null;
    const name=n=>n==null?'اختر '+(unit==='surah'?'سورة':'جزءاً'):unit==='juz'?`الجزء ${n}`:SURAHS[n-1].name;
    function paintEndpoints() {
        dialog.querySelector('#composerFrom').textContent=name(from);
        dialog.querySelector('#composerTo').textContent=name(to);
        dialog.querySelectorAll('[data-compose-endpoint]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.composeEndpoint===endpoint)));
        dialog.querySelector('#rangeChooserContext').textContent=endpoint==='from'?'اختر البداية، ثم اختر النهاية.':'اختر النهاية، ثم راجع النطاق واعتمده.';
        const range=resolvePlanRange(unit,from,to);
        dialog.querySelector('#applyRange').disabled=!range;
        dialog.querySelector('#composerSummary').innerHTML=range?`<strong>${escapeHtml(name(from))} ← ${escapeHtml(name(to))}</strong><small>${range.scope.surahNumbers.length} سورة${unit==='juz'?` · ${Math.abs(from-to)+1} جزء`:''} ضمن الخطة</small>`:'<small>حدد البداية والنهاية لإكمال الخطة.</small>';
    }
    function choose(n) {
        const choosingFrom=endpoint==='from';
        if(choosingFrom) {from=n;endpoint='to';} else to=n;
        search.value='';paintEndpoints();render();
        if(choosingFrom) search.focus();
        else dialog.querySelector('#applyRange').focus();
    }
    function render() {
        visible=rangeOptionsForQuery(search.value,unit);
        dialog.querySelector('#rangePickerCount').textContent=`${visible.length} ${unit==='surah'?'سورة':'جزء'}`;
        const selected=endpoint==='from'?from:to;
        options.innerHTML=visible.length?visible.map(s=>{
            const boundary=s.n===from || s.n===to;
            const inside=from!=null && to!=null && s.n>=Math.min(from,to) && s.n<=Math.max(from,to);
            const marker=s.n===from && s.n===to?'البداية والنهاية':s.n===from?'البداية':s.n===to?'النهاية':'';
            return `<button type="button" data-range-value="${s.n}" class="${boundary?'range-boundary':inside?'range-included':''}" aria-pressed="${s.n===selected}" tabindex="-1"><span class="range-option-number">${s.n}</span><span><strong>${escapeHtml(s.name)}</strong><small>${marker || (unit==='surah'?`${s.ayahs} آية`:'جزء من القرآن')}</small></span></button>`;
        }).join(''):'<div class="range-no-results"><strong>لا توجد نتائج مطابقة</strong><p>ابحث بالاسم أو الرقم.</p><button type="button" id="resetRangeQuery">مسح البحث</button></div>';
        (options.querySelector('[aria-pressed="true"]') || options.querySelector('[data-range-value]'))?.setAttribute('tabindex','0');
        options.querySelector('#resetRangeQuery')?.addEventListener('click',()=>{search.value='';render();search.focus();});
        options.scrollTop=0;
    }
    dialog.querySelector('#closeRangeChooser').onclick=()=>dialog.close();
    dialog.querySelector('#cancelRange').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>returnFocus?.isConnected && returnFocus.focus({preventScroll:true}));
    dialog.querySelector('#applyRange').onclick=()=>{
        if(!resolvePlanRange(unit,from,to))return;
        dialog.close();onSelect(from,to);
    };
    dialog.querySelectorAll('[data-compose-endpoint]').forEach(button=>button.addEventListener('click',()=>{
        endpoint=button.dataset.composeEndpoint;search.value='';paintEndpoints();render();search.focus();
    }));
    options.addEventListener('click',e=>{
        const button=e.target.closest('[data-range-value]');if(button)choose(Number(button.dataset.rangeValue));
    });
    options.addEventListener('focusin',e=>{
        const button=e.target.closest('[data-range-value]');if(!button)return;
        options.querySelector('[tabindex="0"]')?.setAttribute('tabindex','-1');button.tabIndex=0;
    });
    options.addEventListener('keydown',e=>{
        const buttons=[...options.querySelectorAll('[data-range-value]')];
        let index=buttons.indexOf(e.target);if(index<0)return;
        const columns=getComputedStyle(options).gridTemplateColumns.split(' ').length;
        const move={ArrowLeft:1,ArrowRight:-1,ArrowDown:columns,ArrowUp:-columns};
        if(e.key in move)index+=move[e.key];else if(e.key==='Home')index=0;else if(e.key==='End')index=buttons.length-1;else return;
        e.preventDefault();buttons[Math.max(0,Math.min(buttons.length-1,index))]?.focus();
    });
    search.addEventListener('input',render);
    search.addEventListener('keydown',e=>{
        if(e.key==='ArrowDown' || e.key==='Enter') {
            e.preventDefault();
            if(e.key==='Enter' && visible.length===1)choose(visible[0].n);
            else options.querySelector('[data-range-value]')?.focus();
        }
    });
    return {
        open(values) {
            ({unit,endpoint,from,to}=values);returnFocus=document.activeElement;
            search.placeholder=unit==='surah'?'اسم السورة أو رقمها، مثل: الناس':'رقم الجزء، مثل: 30';
            search.value='';paintEndpoints();render();dialog.showModal();search.focus();
        },
        destroy() {if(dialog.open)dialog.close();dialog.remove();},
    };
}
