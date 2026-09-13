// Two plan choices: a continuous manual range or a school curriculum.
import { SURAHS, orderPlanSurahs } from '../../shared/quran-data.js';
import { CURRICULUM_COUNTRIES, curriculumSystems, curriculumStages, curriculumLevels, curriculumTerms, orderedCurriculumSurahs, curriculumClassLabel } from '../../shared/curriculum-data.js';
import { resolvePlanRange } from '../../domain/usecases/PlanRange.js';
import { escapeHtml } from './ui.js';
import { scopeSummaryText } from './SurahPickerView.js';
import { planIcon } from './PlanIcons.js';
import { mountRangeChooser } from './RangeChooserView.js';

export function mountScopePicker(hostEl, initialScope, onChange = () => {}, { direction:initialDirection = 'reverse', preferCurriculum = false } = {}) {
    let mode = initialScope.type === 'curriculum' || preferCurriculum ? 'curriculum' : 'range';
    let unit = initialScope.unit || (initialScope.type === 'juz' ? 'juz' : 'surah');
    const initialNumbers = unit==='juz' ? initialScope.juzNumbers || [] : initialScope.surahNumbers || [];
    const sorted = [...new Set(initialNumbers)].sort((a,b)=>a-b);
    let from = initialScope.from ?? (sorted.length ? (initialDirection==='reverse' ? sorted.at(-1) : sorted[0]) : 114);
    let to = initialScope.to ?? (sorted.length ? (initialDirection==='reverse' ? sorted[0] : sorted.at(-1)) : 1);
    let retainedScope = null;
    // ترتيب مخصص يختاره المعلم بالسحب والإفلات (يُحفظ داخل إعدادات اللوحة)
    let customOrder = Array.isArray(initialScope.customOrder) && initialScope.customOrder.length ? [...initialScope.customOrder] : null;
    let orderEditing = false;
    if (initialScope.type!=='curriculum') {
        const range = resolvePlanRange(unit,from,to);
        const expected = range?.scope.surahNumbers || [];
        const actual = [...new Set(initialScope.surahNumbers || [])].sort((a,b)=>a-b);
        if (actual.length > 0 && (JSON.stringify(expected)!==JSON.stringify(actual) || (sorted.length && sorted.length !== sorted.at(-1)-sorted[0]+1))) retainedScope=structuredClone(initialScope);
    }
    const curriculumSel = {
        countryId: initialScope.curriculum?.countryId ?? CURRICULUM_COUNTRIES[0].id,
        systemId: initialScope.curriculum?.systemId ?? (initialScope.curriculum ? null : 2),
        stageId: initialScope.curriculum?.stageId ?? null,
        levelId: initialScope.curriculum?.levelId ?? null,
        termId: initialScope.curriculum?.termId ?? null,
    };
    const countryChoices = new Map();
    const rangeChoices = new Map();
    hostEl.innerHTML = `
        <div class="scope-choices plan-choices" id="scopeTabs" role="group" aria-label="طريقة تحديد الحفظ">
            <button type="button" class="scope-choice" data-plan="curriculum">${planIcon('grade')}<strong>المنهج الدراسي</strong><span>حسب الدولة ونوع التعليم والصف.</span></button>
            <button type="button" class="scope-choice" data-plan="range">${planIcon('range')}<strong>تحديد نطاق الحفظ</strong><span>اختر البداية والنهاية بالسور أو الأجزاء.</span></button>
        </div>
        <div class="scope-panel" id="scopePanelRange">
            <fieldset class="choice-field"><legend>حدد النطاق باستخدام</legend><div class="choice-pills"><button type="button" data-range-unit="surah">السور</button><button type="button" data-range-unit="juz">الأجزاء</button></div></fieldset>
            <div class="range-selection-card">
                <div class="range-selection-heading">
                    <h3>اختر البداية والنهاية</h3>
                    <p>حدد أول سورة وآخر سورة، وسنضيف ما بينهما تلقائياً.</p>
                </div>
                <div class="plan-range-fields" id="rangeFields"></div>
                <div class="range-selection-footer">
                    <span class="range-total-badge" id="rangeSelectionSummary"></span>
                </div>
            </div>
            <p class="plan-range-note" id="retainedRangeNote" hidden></p>
            <div id="rangeResultContainer"></div>
        </div>
        <div class="scope-panel" id="scopePanelCurriculum"></div>
        <div class="scope-counter setup-scope-count" id="scopeCounter" role="status" aria-live="polite"></div>`;
    let rangeReturnEndpoint='from';
    const rangeChooser=mountRangeChooser(hostEl,(start,end)=>{
        from=start;to=end;retainedScope=null;customOrder=null;renderRange();updateCounter();
        hostEl.querySelector(`[data-range-endpoint="${rangeReturnEndpoint}"]`)?.focus({preventScroll:true});
    });

    function orderedRangeSurahs() {
        if (retainedScope) {
            return orderPlanSurahs(retainedScope.surahNumbers || [], {
                type: retainedScope.type,
                direction: initialDirection,
                customOrder: retainedScope.customOrder
            });
        }
        const range = resolvePlanRange(unit, from, to);
        if (!range) return [];
        return orderPlanSurahs(range.scope.surahNumbers || [], {
            type: range.scope.type,
            direction: range.direction,
            customOrder
        });
    }

    function getRangeTitle() {
        if (retainedScope) return 'النطاق المحفوظ سابقاً';
        if (unit === 'juz') {
            return from === to ? `الجزء ${from}` : `من الجزء ${from} إلى الجزء ${to}`;
        }
        return from === to ? `سورة ${SURAHS[from - 1]?.name || from}` : `من ${SURAHS[from - 1]?.name || from} إلى ${SURAHS[to - 1]?.name || to}`;
    }

    function renderRange() {
        const range = resolvePlanRange(unit, from, to);
        const ordered = orderedRangeSurahs();
        hostEl.querySelector('.range-selection-heading p').textContent = unit === 'surah'
            ? 'حدد أول سورة وآخر سورة، وسنضيف ما بينهما تلقائياً.'
            : 'حدد أول جزء وآخر جزء، وسنضيف السور الواقعة بينهما.';

        hostEl.querySelectorAll('[data-range-unit]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rangeUnit === unit)));

        const canSwap = !retainedScope && Boolean(range) && from !== to;

        const summaryEl = hostEl.querySelector('#rangeSelectionSummary');
        if (summaryEl) {
            summaryEl.textContent = retainedScope ? 'نطاق محفوظ' : range ? `${ordered.length} سورة في خطتك` : 'اختر البداية والنهاية';
        }

        const endpointHtml = (endpoint, label, n) => {
            const hasValue = !retainedScope && n != null;
            const title = hasValue ? (unit === 'juz' ? `الجزء ${n}` : SURAHS[n - 1]?.name) : (unit === 'surah' ? 'اختر سورة' : 'اختر جزءاً');
            return `<button type="button" class="range-endpoint" id="${endpoint === 'from' ? 'rangeFrom' : 'rangeTo'}" data-range-endpoint="${endpoint}" aria-haspopup="dialog" aria-label="${label}: ${escapeHtml(title)}"><span class="range-endpoint-label">${label}</span><span class="range-endpoint-value">${planIcon('book')}<strong>${escapeHtml(title)}</strong>${planIcon('chevron')}</span><small>${hasValue && unit === 'surah' ? `السورة ${n} · ${SURAHS[n - 1].ayahs} آية` : 'اضغط للاختيار'}</small></button>`;
        };

        hostEl.querySelector('#rangeFields').innerHTML = `
            ${endpointHtml('from', 'بداية الحفظ', from)}
            <div class="range-swap-connector">
                <button type="button" class="range-swap-circle-btn" id="swapRangeMiddle" title="عكس ترتيب الحفظ" aria-label="عكس ترتيب الحفظ" ${canSwap ? '' : 'disabled'}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M8 7h12m0 0l-4-4m4 4l-4 4m-4 6H4m0 0l4 4m-4-4l4-4"/>
                    </svg>
                </button>
            </div>
            ${endpointHtml('to', 'نهاية الحفظ', to)}
        `;

        const resultHost = hostEl.querySelector('#rangeResultContainer');
        if (resultHost) {
            resultHost.innerHTML = `
                <div class="curriculum-result">
                    <div class="curriculum-result-header">
                        <span class="curriculum-result-icon">${planIcon('book')}</span>
                        <div class="curriculum-result-info">
                            <small>خطة الحفظ المختارة</small>
                            <strong>${escapeHtml(getRangeTitle())}</strong>
                        </div>
                        <span class="curriculum-result-count">${ordered.length} سورة</span>
                    </div>
                    <div class="curriculum-result-body">
                        ${ordered.length ? `
                            <div class="curriculum-preview">
                                <div class="curriculum-preview-header">
                                    <span class="curriculum-preview-title">السور المقررة مرتبة</span>
                                    ${orderToolsHtml()}
                                </div>
                                ${planSurahListHtml(ordered)}
                                ${orderEditing ? '<p class="plan-order-hint">اسحب البطاقة من المقبض لتغيير ترتيب الحفظ، أو استخدم ▲▼ للتحريك خطوة واحدة.</p>' : ''}
                            </div>
                        ` : `
                            <p class="curriculum-empty-msg">اختر بداية الحفظ ونهايته لعرض السور المقررة.</p>
                        `}
                    </div>
                </div>
            `;
        }

        bindPlanOrdering();
        updateRangeNote();
    }

    // ترتيب المعلم المخصص إن وُجد، وإلا الترتيب المحسوب من النطاق
    function withCustomOrder(baseOrder = []) {
        if (!customOrder) return baseOrder;
        const applied = orderPlanSurahs(baseOrder, { type: 'custom', direction: 'forward', customOrder });
        if (applied.length !== baseOrder.length || !applied.every(n => baseOrder.includes(n))) {
            customOrder = null;
            return baseOrder;
        }
        return applied;
    }

    function orderToolsHtml() {
        return `
            <span class="plan-order-tools">
                <button type="button" class="plan-order-toggle" id="planOrderToggle" aria-pressed="${orderEditing}">
                    ${orderEditing ? 'إنهاء الترتيب' : 'ترتيب مخصص'}
                </button>
                ${customOrder ? '<button type="button" class="plan-order-reset" id="planOrderReset">استعادة الترتيب</button>' : ''}
            </span>
        `;
    }

    function planSurahListHtml(baseOrder = []) {
        const ordered = withCustomOrder(baseOrder);
        return `
            <div class="curriculum-surahs ${orderEditing ? 'is-ordering' : ''}" id="planSurahList">
                ${ordered.map((n, i) => `
                    <div class="curriculum-surah-card" data-surah="${n}">
                        ${orderEditing ? `
                            <button type="button" class="card-drag-handle" data-drag-handle aria-label="اسحب ${escapeHtml(SURAHS[n - 1].name)} لتغيير الترتيب" title="اسحب أو استخدم الأسهم">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"/></svg>
                            </button>
                        ` : ''}
                        <span class="surah-order-badge">${i + 1}</span>
                        <span class="surah-card-name">${escapeHtml(SURAHS[n - 1].name)}</span>
                        <span class="surah-card-ayahs">${SURAHS[n - 1].ayahs} آية</span>
                        ${orderEditing ? `
                            <span class="card-move-group">
                                <button type="button" class="card-move" data-move="-1" aria-label="تقديم ${escapeHtml(SURAHS[n - 1].name)}">▲</button>
                                <button type="button" class="card-move" data-move="1" aria-label="تأخير ${escapeHtml(SURAHS[n - 1].name)}">▼</button>
                            </span>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // الترتيب المرجعي الحالي قبل أي ترتيب مخصص
    function currentOrderBase() {
        if (mode === 'curriculum') { normalizeCurriculum(); return orderedCurriculumSurahs(curriculumSel); }
        if (retainedScope) return retainedScope.surahNumbers || [];
        const range = resolvePlanRange(unit, from, to);
        return range ? range.scope.surahNumbers || [] : [];
    }

    // تحديث أزرار الترتيب في المكان بعد أي تغيير (بدون إعادة رسم القائمة)
    function refreshOrderTools() {
        const tools = hostEl.querySelector('.plan-order-tools');
        if (tools) tools.outerHTML = orderToolsHtml();
    }

    // قراءة الترتيب من DOM بعد السحب/التحريك ثم تحديث الحالة
    function commitOrder(list) {
        const hostList = list || hostEl.querySelector('#planSurahList');
        if (!hostList) return;
        const order = [...hostList.querySelectorAll('.curriculum-surah-card')].map(card => Number(card.dataset.surah));
        const base = currentOrderBase();
        customOrder = order.length && order.length === base.length && order.every(n => base.includes(n)) ? order : null;
        hostList.querySelectorAll('.curriculum-surah-card').forEach((card, index) => {
            const badge = card.querySelector('.surah-order-badge');
            if (badge) badge.textContent = String(index + 1);
        });
        refreshOrderTools();
        updateCounter();
    }

    // سحب البطاقات: يعمل باللمس والفأرة معاً، مع أسهم للتحريك خطوة واحدة
    function bindPlanOrdering() {
        const list = hostEl.querySelector('#planSurahList');
        if (!list || list.dataset.bound === 'true') return;
        list.dataset.bound = 'true';
        let dragging = null;

        list.addEventListener('pointerdown', event => {
            const handle = event.target.closest('[data-drag-handle]');
            if (!handle) return;
            dragging = handle.closest('.curriculum-surah-card');
            if (!dragging) return;
            event.preventDefault();
            dragging.classList.add('is-dragging');
            list.classList.add('is-drag-active');
            handle.setPointerCapture?.(event.pointerId);
        });

        list.addEventListener('pointermove', event => {
            if (!dragging) return;
            event.preventDefault();
            const siblings = [...list.querySelectorAll('.curriculum-surah-card:not(.is-dragging)')];
            const next = siblings.find(card => {
                const box = card.getBoundingClientRect();
                return event.clientY < box.top + box.height / 2;
            });
            if (next) list.insertBefore(dragging, next);
            else list.appendChild(dragging);
        });

        const finish = () => {
            if (!dragging) return;
            dragging.classList.remove('is-dragging');
            list.classList.remove('is-drag-active');
            dragging = null;
            commitOrder(list);
        };
        list.addEventListener('pointerup', finish);
        list.addEventListener('pointercancel', finish);

        const moveCard = (card, step) => {
            const sibling = step < 0 ? card.previousElementSibling : card.nextElementSibling;
            if (!sibling || !sibling.classList.contains('curriculum-surah-card')) return;
            if (step < 0) list.insertBefore(card, sibling);
            else list.insertBefore(sibling, card);
            commitOrder(list);
        };

        list.addEventListener('click', event => {
            const moveBtn = event.target.closest('[data-move]');
            if (!moveBtn) return;
            const card = moveBtn.closest('.curriculum-surah-card');
            moveCard(card, Number(moveBtn.dataset.move));
            card.querySelector(`[data-move="${moveBtn.dataset.move}"]`)?.focus({ preventScroll: true });
        });

        list.addEventListener('keydown', event => {
            const handle = event.target.closest('[data-drag-handle]');
            if (!handle || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault();
            const card = handle.closest('.curriculum-surah-card');
            moveCard(card, event.key === 'ArrowUp' ? -1 : 1);
            card.querySelector('[data-drag-handle]')?.focus({ preventScroll: true });
        });
    }

    function updateRangeNote() {
        hostEl.querySelector('#retainedRangeNote').hidden = !retainedScope;
        hostEl.querySelector('#retainedRangeNote').textContent = retainedScope ? `الخطة الحالية محفوظة: ${scopeSummaryText(retainedScope.surahNumbers || [])}. لتغييرها، حدد بداية النطاق ونهايته.` : '';
    }
    function normalizeCurriculum() {
        if (!CURRICULUM_COUNTRIES.some(c => c.id === curriculumSel.countryId)) curriculumSel.countryId = CURRICULUM_COUNTRIES[0].id;
        const lists = [
            ['systemId', () => curriculumSystems(curriculumSel.countryId)],
            ['stageId', () => curriculumStages(curriculumSel.countryId, curriculumSel.systemId)],
            ['levelId', () => curriculumLevels(curriculumSel.countryId, curriculumSel.systemId, curriculumSel.stageId)],
        ];
        for (const [key, getOptions] of lists) {
            const options = getOptions();
            if (!options.some(option => option[key] === curriculumSel[key])) curriculumSel[key] = options[0]?.[key] ?? null;
        }
        if (!curriculumTerms(curriculumSel.countryId).some(t => t.termId === curriculumSel.termId)) curriculumSel.termId = null;
    }
    function currentSurahs() {
        if (mode==='curriculum') { normalizeCurriculum(); return orderedCurriculumSurahs(curriculumSel); }
        return getScope().surahNumbers || [];
    }
    function getScope() {
        const withOrder = scope => {
            if (customOrder && customOrder.length === (scope.surahNumbers || []).length && customOrder.every(n => scope.surahNumbers.includes(n))) {
                scope.customOrder = [...customOrder];
            } else {
                delete scope.customOrder;
            }
            return scope;
        };
        if (mode==='curriculum') {
            normalizeCurriculum();
            return withOrder({type:'curriculum',juzNumbers:[],curriculum:{...curriculumSel},surahNumbers:orderedCurriculumSurahs(curriculumSel)});
        }
        if (retainedScope) {
            const scope = structuredClone(retainedScope);
            if (!Array.isArray(scope.surahNumbers)) scope.surahNumbers = [];
            return withOrder(scope);
        }
        return withOrder(resolvePlanRange(unit,from,to)?.scope || {type:'custom',juzNumbers:[],curriculum:null,surahNumbers:[]});
    }
    function getDirection() {
        if (mode==='curriculum') return 'forward';
        return retainedScope ? initialDirection : resolvePlanRange(unit,from,to)?.direction || initialDirection;
    }
    function getClassLabel() { return mode==='curriculum' ? curriculumClassLabel(getScope().curriculum) : ''; }
    function updateCounter() {
        const nums=currentSurahs();
        hostEl.querySelector('#scopeCounter').textContent=nums.length ? scopeSummaryText(nums) : mode==='range' ? 'حدد بداية ونهاية صحيحتين للنطاق.' : 'لا توجد سور لهذا الاختيار في بيانات المنهج.';
        onChange();
    }
    function renderCurriculum() {
        normalizeCurriculum();
        const flags={1:'🇸🇦',2:'🇰🇼',3:'🇧🇭',4:'🇴🇲'};
        const systems=curriculumSystems(curriculumSel.countryId);
        const stages=curriculumStages(curriculumSel.countryId,curriculumSel.systemId);
        const levels=curriculumLevels(curriculumSel.countryId,curriculumSel.systemId,curriculumSel.stageId);
        const terms=curriculumTerms(curriculumSel.countryId);
        const radio=(key,value,label,content='')=>`<label class="plan-option"><input type="radio" name="plan-${key}" data-curriculum="${key}" data-value="${value ?? ''}" value="${value ?? ''}" ${curriculumSel[key]===value?'checked':''}><span class="plan-option-content">${content}<strong>${escapeHtml(label)}</strong></span></label>`;
        const nums=currentSurahs();
        const panel = hostEl.querySelector('#scopePanelCurriculum');
        panel.innerHTML = `<div class="curriculum-workspace">
            <fieldset class="choice-field curriculum-country-field"><legend>المنهج</legend><div class="country-options">${CURRICULUM_COUNTRIES.map(c=>radio('countryId',c.id,c.name,`<span class="country-flag" aria-hidden="true">${flags[c.id]}</span>`)).join('')}</div></fieldset>
            <fieldset class="choice-field"><legend>نوع التعليم</legend><div class="education-options">${systems.map(item=>radio('systemId',item.systemId,item.name,planIcon({1:'school',2:'book',3:'institute',4:'college'}[item.systemId] || 'school'))).join('')}</div></fieldset>
            <div class="academic-selection">
                <fieldset class="choice-field"><legend>${curriculumSel.systemId===4?'القسم الدراسي':'المرحلة الدراسية'}</legend><div class="stage-options">${stages.map(s=>radio('stageId',s.stageId,s.name)).join('')}</div></fieldset>
                <fieldset class="choice-field"><legend>الصف أو المستوى</legend><div class="level-options">${levels.map(l=>radio('levelId',l.levelId,l.name)).join('')}</div></fieldset>
                <fieldset class="choice-field"><legend>الفصل الدراسي</legend><div class="term-options">${radio('termId',null,'كل الفصول')}${terms.map(t=>radio('termId',t.termId,t.name)).join('')}</div></fieldset>
            </div>
            </div>
            <div class="curriculum-result">
                <div class="curriculum-result-header">
                    <span class="curriculum-result-icon">${planIcon('book')}</span>
                    <div class="curriculum-result-info">
                        <small>خطة الحفظ المختارة</small>
                        <strong>${escapeHtml(getClassLabel())}</strong>
                    </div>
                    <span class="curriculum-result-count">${nums.length} سورة</span>
                </div>
                <div class="curriculum-result-body">
                    ${nums.length ? `
                        <div class="curriculum-preview">
                            <div class="curriculum-preview-header">
                                <span class="curriculum-preview-title">السور المقررة مرتبة</span>
                                ${orderToolsHtml()}
                            </div>
                            ${planSurahListHtml(nums)}
                            ${orderEditing ? '<p class="plan-order-hint">اسحب البطاقة من المقبض لتغيير ترتيب الحفظ، أو استخدم ▲▼ للتحريك خطوة واحدة.</p>' : ''}
                            <small class="form-hint">إذا شمل المنهج جزءاً من سورة، تُحتسب السورة كاملة في وسام.</small>
                        </div>
                    ` : `
                        <p class="curriculum-empty-msg">لا تتوفر سور لهذا الاختيار. اختر صفاً أو نظاماً آخر.</p>
                    `}
                </div>
            </div>`;
        bindPlanOrdering();
    }

    function showMode() {
        hostEl.querySelector('#scopePanelRange').hidden=mode!=='range';
        hostEl.querySelector('#scopePanelCurriculum').hidden=mode!=='curriculum';
        hostEl.querySelectorAll('[data-plan]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plan===mode)));
        if (mode==='curriculum') renderCurriculum();
        else renderRange();
        updateCounter();
    }
    hostEl.addEventListener('click',e=>{
        const button=e.target.closest('button'); if (!button || button.disabled) return;
        if (button.dataset.plan) { mode=button.dataset.plan; orderEditing=false; showMode(); }
        if (button.dataset.rangeEndpoint) {
            const endpoint=button.dataset.rangeEndpoint;
            rangeReturnEndpoint=endpoint;
            rangeChooser.open({unit,endpoint,from:retainedScope?null:from,to:retainedScope?null:to});
        }
        if (button.id==='planOrderToggle') {
            orderEditing = !orderEditing;
            mode === 'curriculum' ? renderCurriculum() : renderRange();
            hostEl.querySelector('#planOrderToggle')?.focus({ preventScroll: true });
            return;
        }
        if (button.id==='planOrderReset') {
            customOrder = null;
            mode === 'curriculum' ? renderCurriculum() : renderRange();
            updateCounter();
            return;
        }
        if (button.id==='swapRangeMiddle') {
            [from,to]=[to,from]; renderRange(); updateCounter();
            hostEl.querySelector('#swapRangeMiddle')?.focus({preventScroll:true});
        }
        if (button.dataset.rangeUnit && unit!==button.dataset.rangeUnit) {
            rangeChoices.set(unit,{from,to,retainedScope});
            customOrder = null;
            unit=button.dataset.rangeUnit;
            const previous=rangeChoices.get(unit);
            from=previous ? previous.from : unit==='juz'?30:114;
            to=previous ? previous.to : unit==='juz'?30:1;
            retainedScope=previous?.retainedScope || null;
            renderRange(); updateCounter();
        }
    });
    hostEl.addEventListener('change',e=>{
        const input=e.target.closest('[data-curriculum]');if(!input)return;
        const key=input.dataset.curriculum,raw=input.dataset.value,value=raw===''?null:Number(raw);
        if(curriculumSel[key]===value)return;
        if(key==='countryId') {
            countryChoices.set(curriculumSel.countryId,{...curriculumSel});
            Object.assign(curriculumSel,countryChoices.get(value) || {countryId:value,systemId:value===1?2:null,stageId:null,levelId:null,termId:null});
        } else {
            curriculumSel[key]=value;
            if(key==='systemId') {curriculumSel.stageId=null;curriculumSel.levelId=null;}
            if(key==='stageId')curriculumSel.levelId=null;
        }
        renderCurriculum();updateCounter();
        hostEl.querySelector(`[data-curriculum="${key}"][data-value="${raw}"]`)?.focus({preventScroll:true});
    });
    function getSummary() {
        if (mode==='curriculum') {
            normalizeCurriculum();
            return [CURRICULUM_COUNTRIES.find(c=>c.id===curriculumSel.countryId)?.manhagName,curriculumSystems(curriculumSel.countryId).find(s=>s.systemId===curriculumSel.systemId)?.name,getClassLabel()].filter(Boolean).join(' · ');
        }
        if (retainedScope) return `النطاق المحفوظ · ${scopeSummaryText(retainedScope.surahNumbers || [])}`;
        if (!resolvePlanRange(unit,from,to)) return 'حدد بداية النطاق ونهايته';
        return unit==='juz' ? `من الجزء ${from} إلى الجزء ${to}` : `من ${SURAHS[from-1].name} إلى ${SURAHS[to-1].name}`;
    }
    renderRange(); showMode();
    return {getScope,getSummary,getDirection,getClassLabel,destroy:()=>rangeChooser.destroy()};
}
