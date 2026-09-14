// Board setup: three focused steps, shared by creation and editing.
import { defaultSettings, sanitizeSettings } from '../../domain/models/BoardSettings.js';
import { SURAHS } from '../../shared/quran-data.js';
import { boardShareUrl, copyToClipboard, confirmDialog, escapeHtml } from '../views/ui.js';
import { mountScopePicker } from '../views/ScopePickerView.js';
import { mountBannerDesigner } from '../views/BannerDesignerView.js';
import { scopeSummaryText } from '../views/SurahPickerView.js';
import { matchesQueryNameOrNumber } from '../../shared/text-utils.js';
import { createFeedbackState } from '../layout/FeedbackStateView.js';
import { autoPriorSurahs, priorSummaryText } from '../../domain/usecases/PriorMemorization.js';

export default async function BoardSettingsPage(container, { toast, params = {}, navigate, layout, user, services, setTitle, signal, refresh }) {
    const BoardRepository = services.boards;
    const CohortRepository = services.cohorts;
    const OgPreviewTrigger = services.ogPreview;
    const isEdit = Boolean(params.boardId);
    let board = null;
    setTitle(`${isEdit ? 'إعدادات اللوحة' : 'لوحة جديدة'} — وسام`);
    if (isEdit) {
        try { board = await BoardRepository.get(params.boardId); }
        catch {
            layout?.setActiveBoard(null);
            container.replaceChildren(createFeedbackState({
                type: 'error',
                icon: '⚠️',
                eyebrow: 'إعدادات اللوحة',
                title: 'تعذر تحميل إعدادات اللوحة',
                message: 'حدث خطأ أثناء تحميل بيانات اللوحة. يمكنك إعادة المحاولة أو الرجوع لقائمة لوحاتك.',
                actions: [
                    { label: 'إعادة المحاولة', onClick: refresh, primary: true },
                    { label: 'العودة إلى لوحاتي', href: '/dashboard' }
                ]
            }));
            return;
        }
        if (!board || board.ownerUid !== user.uid) {
            layout?.setActiveBoard(null);
            container.replaceChildren(createFeedbackState({
                type: 'unavailable',
                icon: '🔒',
                eyebrow: 'إعدادات اللوحة',
                title: 'اللوحة غير متاحة',
                message: 'هذه اللوحة مسجلة لمعلم آخر أو لم تعد متوفرة.',
                actions: [
                    { label: 'العودة إلى لوحاتي', href: '/dashboard', primary: true }
                ]
            }));
            return;
        }
    }
    const settings = isEdit ? JSON.parse(JSON.stringify(board.settings)) : defaultSettings();
    layout?.setActiveBoard(isEdit ? board : null);

    const oldSurahs = new Set(settings.scope.surahNumbers || []);
    if (signal.aborted) return;
    let step = 0, saving = false, scopePicker, bannerDesigner;
    let savedSnapshot = null, saveFailed = false;
    let direction = settings.direction === 'forward' ? 'forward' : 'reverse';
    const steps = ['بيانات اللوحة','خطة الحفظ','المظهر والمشاركة'];
    container.innerHTML = `
        <section class="board-setup ${isEdit ? 'board-settings' : ''}">
            <div class="setup-heading"><div>${isEdit ? `<p class="settings-board-name" id="settingsBoardName">${escapeHtml(settings.name)}</p>` : ''}<h1>${isEdit ? 'إعدادات اللوحة' : 'لننشئ لوحة جديدة'}</h1><p>${isEdit ? 'راجع بيانات اللوحة وخطة الحفظ وخيارات المشاركة.' : 'ثلاث خطوات بسيطة، ثم تبدأ رحلة طلابك.'}</p></div><span class="setup-step-count" id="setupStepCount" ${isEdit ? 'hidden' : ''}>الخطوة 1 من 3</span></div>
            ${isEdit ? `<section class="settings-share" aria-labelledby="shareHeading"><div><h2 id="shareHeading">مشاركة اللوحة</h2><p id="shareHint"></p></div><div class="settings-share-controls" id="shareControls"><input id="shareUrl" type="url" aria-label="رابط اللوحة" readonly dir="ltr" value="${escapeHtml(boardShareUrl(board.id))}"><button type="button" class="btn btn-primary" id="copyBoardLink">نسخ الرابط</button></div><button type="button" class="btn btn-secondary" id="openVisibility">خيارات الظهور</button></section>` : ''}
            <nav class="setup-stepper" aria-label="خطوات إعداد اللوحة">${steps.map((label,i)=>`<button type="button" data-setup-step="${i}" ${i===0 ? 'aria-current="step"' : ''}>${isEdit ? '' : `<span>${i+1}</span>`}<strong>${label}</strong></button>`).join('')}</nav>
            <div class="setup-layout">
                <form id="boardForm" class="setup-form" novalidate>
                    <fieldset class="setup-fields" id="setupFields">
                        <section class="setup-step" data-step-panel="0" aria-labelledby="setupTitle0">
                            <div class="setup-section-heading"><span class="eyebrow">البداية</span><h2 id="setupTitle0" tabindex="-1">ما اسم لوحتك؟</h2><p>اسم واضح يجعل لوحتك مألوفة لطلابك وأولياء الأمور.</p></div>
                            <div class="form-group"><label class="form-label" for="fName">اسم اللوحة <span class="required-label">مطلوب</span></label><input type="text" class="form-input setup-name-input" id="fName" required maxlength="100" aria-describedby="boardNameHint" value="${escapeHtml(settings.name)}" placeholder="مثال: حلقة النور"><p class="form-hint" id="boardNameHint">يمكنك تعديل الاسم لاحقاً.</p></div>
                            <div class="form-group"><label class="form-label" for="fSchool">المدرسة أو المركز <span class="optional-label">اختياري</span></label><input type="text" class="form-input" id="fSchool" maxlength="150" value="${escapeHtml(settings.schoolName)}" placeholder="مثال: مدرسة البيان"></div>
                            <div class="plan-derived-grade"><span>الصف والفصل الدراسي</span><strong id="derivedClassLabel"></strong><small>يُحددان تلقائياً من خطة الحفظ، دون إدخال يدوي.</small></div>
                            ${isEdit ? '' : `<div class="setup-reassurance"><strong>ابدأ باللوحة، ثم أضف طلابك</strong><p>بعد الإنشاء ستنتقل مباشرة إلى تسجيل الطلاب والحفظ. تُحتسب نسب التقدم والأوسمة تلقائياً.</p></div>`}
                        </section>
                        <section class="setup-step" data-step-panel="1" aria-labelledby="setupTitle1" hidden>
                            <div class="setup-section-heading"><span class="eyebrow">الخطة</span><h2 id="setupTitle1" tabindex="-1">ماذا سيحفظ طلابك؟</h2><p>اختر المنهج الدراسي أو حدّد مسار الحفظ المناسب لطلابك.</p></div>
                            <div id="scopeCardHost"></div>
                            <div class="prior-card" id="priorCard">
                                <label class="prior-toggle">
                                    <input type="checkbox" id="fPriorAuto" ${settings.priorMode === 'none' ? '' : 'checked'}>
                                    <span>
                                        <strong>احتساب البرامج السابقة في الأوسمة</strong>
                                        <small>الطالب الذي أنهى صفاً أو جزءاً سابقاً يحتفظ بأوسمته عند انتقاله لهذه الخطة.</small>
                                    </span>
                                </label>
                                <p class="prior-hint" id="priorHint" role="status" aria-live="polite"></p>
                            </div>
                            <div class="prior-card cohort-link-card" id="cohortLinkCard">
                                <label class="prior-toggle" for="fCohort">
                                    <span>
                                        <strong>ربط الدفعة باللوحة</strong>
                                        <small>عند الربط تُنسخ أسماء الدفعة إلى اللوحة، والطالب الذي يُتمّ هذه الخطة ينتقل تلقائياً إلى البرنامج التالي المرتبط بالدفعة نفسها — بلا نقل يدوي.</small>
                                    </span>
                                </label>
                                <select id="fCohort" aria-label="الدفعة المرتبطة باللوحة">
                                    <option value="">بدون دفعة</option>
                                </select>
                                <p class="prior-hint" id="cohortLinkHint" role="status" aria-live="polite"></p>
                            </div>
                        </section>
                        <section class="setup-step" data-step-panel="2" aria-labelledby="setupTitle2" hidden>
                            <div class="setup-section-heading"><span class="eyebrow">اللمسة الأخيرة</span><h2 id="setupTitle2" tabindex="-1">${isEdit ? 'المظهر وخيارات المشاركة' : 'لوحتك، بطابعك'}</h2><p>${isEdit ? 'حدد من يمكنه مشاهدة تقدم الطلاب وخيارات عرض اللوحة.' : 'اختر اللون وحدد من يمكنه مشاهدة تقدم الطلاب.'}</p></div>
                            <div id="bannerCardHost"></div>
                            <fieldset class="choice-field setup-sharing"><legend>من يمكنه مشاهدة اللوحة؟</legend><div class="sharing-choices"><label><input type="radio" name="visibility" id="fPublic" value="public" ${settings.isPublic?'checked':''}><span><strong>كل من لديه الرابط</strong><small>شارك تقدم الطلاب مع أولياء الأمور.</small></span></label><label><input type="radio" name="visibility" id="fPrivate" value="private" ${settings.isPublic?'':'checked'}><span><strong>أنا فقط</strong><small>تابع الحفظ بشكل خاص من حسابك.</small></span></label></div></fieldset>
                            <div class="setup-inline-review"><strong>ملخص اللوحة</strong><p id="mobileReviewName"></p><p id="mobileReviewScope"></p><p id="mobileReviewVisibility"></p><button type="button" id="reviewPlanBtn">تعديل خطة الحفظ</button></div>
                            <p class="setup-final-note">${isEdit ? 'تظل سجلات حفظ الطلاب محفوظة عند تغيير نطاق الخطة.' : 'كل شيء جاهز؟ راجع ملخص اللوحة، ثم انتقل لإضافة الطلاب.'}</p>
                        </section>
                    </fieldset>
                    <div class="setup-form-error" id="setupError" role="alert" tabindex="-1" hidden></div>
                    <div class="setup-actions"><button type="button" class="btn btn-secondary" id="previousStep" hidden>السابق</button><a href="/dashboard" class="setup-cancel" id="cancelSetup">إلغاء</a>${isEdit ? '<span class="settings-save-status" id="settingsSaveStatus" role="status" aria-live="polite"></span>' : ''}<button type="submit" class="btn btn-primary" id="submitBtn">التالي: خطة الحفظ</button></div>
                </form>
                <aside class="setup-preview" aria-label="ملخص اللوحة"><div class="preview-label"><strong>لوحتك كما ستظهر</strong><span>معاينة</span></div><div id="boardPreviewHost"></div><dl class="setup-summary"><div><dt>خطة الحفظ</dt><dd id="summaryScope"></dd><span id="summaryCount"></span></div><div><dt>ترتيب السور</dt><dd id="summaryDirection"></dd></div><div><dt>ظهور اللوحة</dt><dd id="summaryVisibility"></dd></div></dl>${isEdit ? '' : `<div class="setup-next-note"><span>بعد الإنشاء</span><strong>أضف الطلاب وسجّل أول إنجاز</strong><p>أوسمة تتجدد مع كل سورة محفوظة.</p></div>`}</aside>
            </div>
            ${isEdit ? '<details class="setup-danger"><summary>حذف اللوحة</summary><p>حذف اللوحة يزيل بيانات الطلاب نهائياً ولا يمكن التراجع عنه.</p><button type="button" class="btn btn-danger" id="deleteBoardBtn">حذف اللوحة</button></details>' : ''}
        </section>`;
    const form = container.querySelector('#boardForm');
    const nameInput = container.querySelector('#fName');
    const error = container.querySelector('#setupError');

    function refreshShare() {
        if (!isEdit) return;
        const pendingVisibility = container.querySelector('#fPublic').checked !== settings.isPublic;
        container.querySelector('#shareControls').hidden = !settings.isPublic || pendingVisibility;
        container.querySelector('#shareHint').textContent = pendingVisibility
            ? 'احفظ تغيير الظهور أولاً لتحديث خيارات المشاركة.'
            : settings.isPublic ? 'انسخ الرابط وأرسله لأولياء الأمور لمتابعة الحفظ والأوسمة.' : 'اللوحة خاصة. اختر «كل من لديه الرابط» واحفظ التغيير لتفعيل المشاركة.';
    }
    if (isEdit) {
        container.querySelector('#copyBoardLink').onclick=()=>copyToClipboard(boardShareUrl(board.id));
        container.querySelector('#shareUrl').onclick=event=>event.target.select();
        container.querySelector('#openVisibility').onclick=()=>{
            if (saving) return;
            showStep(2,false); container.querySelector('#fPublic').focus();
        };
        refreshShare();
    }


    function formSnapshot() {
        return JSON.stringify({
            name:nameInput.value.trim(), school:container.querySelector('#fSchool').value.trim(),
            group:scopePicker.getClassLabel(), scope:scopePicker.getScope(), direction:scopePicker.getDirection(),
            public:container.querySelector('#fPublic').checked,
            themeId:bannerDesigner ? bannerDesigner.getThemeId() : settings.banner?.themeId,
        });
    }
    function refreshSaveState() {
        if (!isEdit || savedSnapshot === null || !form.isConnected) return;
        const dirty = formSnapshot() !== savedSnapshot;
        if (!dirty) saveFailed = false;
        const status = container.querySelector('#settingsSaveStatus');
        status.dataset.state = saving ? 'saving' : saveFailed ? 'error' : dirty ? 'unsaved' : 'saved';
        status.textContent = saving ? 'جارٍ حفظ التغييرات…' : saveFailed ? 'لم تُحفظ التغييرات. حاول مجدداً.' : dirty ? 'تغييرات غير محفوظة' : '✓ جميع التغييرات محفوظة';
        container.querySelector('#submitBtn').disabled = saving || !dirty;
    }

    function clearError() { error.hidden=true; nameInput.removeAttribute('aria-invalid'); nameInput.setAttribute('aria-describedby','boardNameHint'); }
    function reportError(message, target) {
        error.textContent=message; error.hidden=false;
        if (target === nameInput) { nameInput.setAttribute('aria-invalid','true'); nameInput.setAttribute('aria-describedby','boardNameHint setupError'); }
        (target || error).focus();
    }
    function refreshSummary() {
        if (!scopePicker) return;
        container.querySelector('#summaryScope').textContent=scopePicker.getSummary();
        container.querySelector('#summaryCount').textContent=scopeSummaryText(scopePicker.getScope().surahNumbers);
        direction=scopePicker.getDirection();
        const curriculum=scopePicker.getScope().type==='curriculum';
        const orderText=curriculum ? 'تلقائياً بحسب المنهج الدراسي' : scopePicker.getSummary();
        container.querySelector('#summaryDirection').textContent=orderText;
        container.querySelector('#derivedClassLabel').textContent=scopePicker.getClassLabel() || 'يظهر عند اختيار المنهج الدراسي';
        container.querySelector('#summaryVisibility').textContent=container.querySelector('#fPublic').checked?'كل من لديه الرابط':'أنا فقط';
        container.querySelector('#mobileReviewName').textContent=nameInput.value.trim() || 'اسم اللوحة';
        container.querySelector('#mobileReviewScope').textContent=scopePicker.getSummary()+' · '+scopeSummaryText(scopePicker.getScope().surahNumbers);
        container.querySelector('#mobileReviewVisibility').textContent='ظهور اللوحة: '+container.querySelector('#summaryVisibility').textContent;
        bannerDesigner?.refreshPreview();
        refreshSaveState();
    }
    // المحتسب سابقاً: يُشتق من النطاق، ويعرض للمعلم ما سيُحتسب فعلاً.
    // يُعرَّف قبل تركيب مُختار الخطة لأن التركيب يستدعي refreshPriorHint فوراً.
    const priorToggle = container.querySelector('#fPriorAuto');
    function priorEnabled() { return Boolean(priorToggle?.checked); }
    function refreshPriorHint() {
        const hint = container.querySelector('#priorHint');
        if (!hint) return;
        if (!priorEnabled()) {
            hint.textContent = 'لن تُحتسب أي سور من برامج سابقة — تبدأ أوسمة الطلاب من هذه الخطة.';
            hint.dataset.state = 'off';
            return;
        }
        const summary = scopePicker ? priorSummaryText(autoPriorSurahs(scopePicker.getScope())) : '';
        hint.textContent = summary
            ? `سيُحتسب تلقائياً: ${summary} (تُضاف لأوسمة الطالب ولا تُحتسب في تقدم الخطة الحالية).`
            : 'لا توجد برامج سابقة معروفة لهذا النوع من الخطط؛ يمكن للمعلم إضافة محتسب لطالب بعينه من جدول المتابعة.';
        hint.dataset.state = summary ? 'on' : 'none';
    }
    priorToggle.addEventListener('change', () => { refreshPriorHint(); refreshSummary(); });

    scopePicker = mountScopePicker(container.querySelector('#scopeCardHost'),settings.scope,()=>{ clearError(); refreshSummary(); refreshPriorHint(); },{direction:settings.direction,preferCurriculum:!isEdit});
    bannerDesigner = mountBannerDesigner(container.querySelector('#bannerCardHost'),()=>({name:nameInput.value,schoolName:container.querySelector('#fSchool').value,classLabel:scopePicker.getClassLabel()}),{initialThemeId:settings.banner.themeId,locked:false,previewHost:container.querySelector('#boardPreviewHost'),onChange:()=>{refreshSummary();refreshSaveState();}});
    function showStep(next, focus = true) {
        step=next; clearError();
        container.querySelectorAll('[data-step-panel]').forEach(panel=>{panel.hidden=Number(panel.dataset.stepPanel)!==step;});
        container.querySelectorAll('[data-setup-step]').forEach(button=>{
            if(Number(button.dataset.setupStep)===step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
            button.classList.toggle('is-complete',Number(button.dataset.setupStep)<step);
        });
        container.querySelector('#setupStepCount').textContent=`الخطوة ${step+1} من 3`;
        container.querySelector('#previousStep').hidden=isEdit || step===0;
        container.querySelector('#cancelSetup').hidden=!isEdit && step!==0;
        container.querySelector('#submitBtn').textContent=isEdit?'حفظ التغييرات':step===2?'إنشاء اللوحة وإضافة الطلاب':`التالي: ${steps[step+1]}`;
        refreshSummary();
        if(focus) container.querySelector(`#setupTitle${step}`).focus();
    }
    function validateThrough(last) {
        if(!nameInput.value.trim()) { showStep(0,false); reportError('اكتب اسم اللوحة للمتابعة.',nameInput); return false; }
        if(last>=1 && !scopePicker.getScope().surahNumbers.length) {
            showStep(1,false); reportError('حدد نطاقاً صحيحاً أو اختر منهجاً يحتوي على سور للحفظ.'); return false;
        }
        return true;
    }
    container.querySelectorAll('[data-setup-step]').forEach(button=>button.addEventListener('click',()=>{
        if(saving) return;
        const next=Number(button.dataset.setupStep);
        if(isEdit || next<=step || validateThrough(next-1)) showStep(next);
    }));
    container.querySelector('#previousStep').onclick=()=>{if(!saving) showStep(step-1);};
    container.querySelector('#reviewPlanBtn').onclick=()=>{if(!saving) showStep(1);};
    for(const id of ['fName','fSchool']) container.querySelector('#'+id).addEventListener('input',()=>{clearError();refreshSummary();});
    container.querySelectorAll('[name="visibility"]').forEach(input=>input.addEventListener('change',()=>{refreshSummary();refreshShare();}));

    refreshPriorHint();
    showStep(0,false);

    // ربط الدفعة: تُحمّل دفعات المعلم ويُختار منها، وتُنسخ أسماؤها للوحة عند الحفظ
    const cohortSelect = container.querySelector('#fCohort');
    let myCohorts = [];
    const cohortHint = container.querySelector('#cohortLinkHint');
    async function loadCohorts() {
        try {
            myCohorts = await CohortRepository.listMine(user.uid);
        } catch (error) { console.error(error); }
        const current = settings.cohortId || '';
        cohortSelect.innerHTML = '<option value="">بدون دفعة</option>' + myCohorts
            .map(cohort => `<option value="${escapeHtml(cohort.id)}" ${String(cohort.id) === String(current) ? 'selected' : ''}>${escapeHtml(cohort.name)} — ${cohort.studentsCount()} طالب</option>`)
            .join('');
        refreshCohortHint();
    }
    function refreshCohortHint() {
        const cohort = myCohorts.find(c => String(c.id) === String(cohortSelect.value));
        if (!cohort) { cohortHint.textContent = 'بلا دفعة: تضيف الطلاب يدوياً، ولا انتقال تلقائي بين البرامج.'; cohortHint.dataset.state = 'off'; return; }
        cohortHint.textContent = `«${cohort.name}»: ${cohort.studentsCount()} طالب. سيُضاف من ليس له سجل في هذه اللوحة، ومن يُتمّ الخطة ينتقل للبرنامج التالي المرتبط بها.`;
        cohortHint.dataset.state = 'on';
    }
    cohortSelect.addEventListener('change', refreshCohortHint);
    loadCohorts();

    // نسخ أسماء الدفعة إلى اللوحة (مع ربط كل طالب بعضوه)
    async function syncCohortStudents(cohortId) {
        const cohort = myCohorts.find(c => String(c.id) === String(cohortId));
        if (!cohort) return 0;
        const existingByName = new Set(Object.values(board?.students || {}).map(s => String(s?.name || '').trim()));
        const linked = new Set(Object.values(board?.students || {}).map(s => String(s?.cohortStudentId || '')).filter(Boolean));
        let count = Object.keys(board?.students || {}).length;
        let added = 0;
        for (const member of cohort.listStudents()) {
            if (linked.has(String(member.id)) || existingByName.has(member.name)) continue;
            try {
                await BoardRepository.addStudent(board.id, member.name, count, { cohortStudentId: member.id });
                count += 1; added += 1;
            } catch (error) { console.error('cohort import failed', member.name, error); }
        }
        return added;
    }
    if (isEdit) {
        savedSnapshot = formSnapshot(); refreshSaveState();
        form.addEventListener('input', refreshSaveState);
        form.addEventListener('change', refreshSaveState);
        form.addEventListener('click', () => queueMicrotask(refreshSaveState));
    }
    // Search Enter stays in the search field, rather than advancing or saving the form.
    form.addEventListener('keydown',e=>{if(e.key==='Enter' && e.target.type==='search') e.preventDefault();});
    form.addEventListener('submit',async e=>{
        e.preventDefault();
        if(saving || (isEdit && formSnapshot() === savedSnapshot) || !validateThrough(isEdit ? 2 : step)) return;
        clearError();
        if(!isEdit && step<2) {showStep(step+1);return;}
        let newSettings;
        try {
            newSettings=sanitizeSettings({name:nameInput.value,schoolName:container.querySelector('#fSchool').value,classLabel:scopePicker.getClassLabel(),banner:{themeId:bannerDesigner.getThemeId()},scope:scopePicker.getScope(),direction,isPublic:container.querySelector('#fPublic').checked,showClassProgress:false,classCurrentSurah:null,priorMode:priorEnabled()?'auto':'none',priorSurahs:settings.priorSurahs||[],cohortId:cohortSelect.value||''});
        } catch(err) {reportError(err.message);return;}
        saving=true; refreshSaveState();
        form.setAttribute('aria-busy','true');
        const fields=container.querySelector('#setupFields');
        const controls=[...container.querySelectorAll('.setup-stepper button, .setup-actions button')];
        fields.disabled=true;
        controls.forEach(b=>{b.disabled=true;});
        const submit=container.querySelector('#submitBtn'), label=submit.textContent;
        submit.textContent=isEdit?'جارِ الحفظ…':'جارِ إنشاء اللوحة…';
        try {
            if(isEdit) {
                await BoardRepository.updateSettings(board.id,newSettings);
                if (!form.isConnected) return;
                // لا يجوز أن تحوّل أي خطوة لاحقة (مثل تحديث القائمة أو إرسال طلب
                // OG) نجاح كتابة Firestore إلى رسالة «تعذر الحفظ» للمعلّم.
                try {
                    toast([...oldSurahs].some(n=>!newSettings.scope.surahNumbers.includes(n))?'تم الحفظ — سجلات الحفظ خارج الخطة الجديدة محفوظة':'تم حفظ التغييرات','success');
                    // ربط/فصل الدفعة ثم نسخ أسماء أعضائها إلى اللوحة
                    const previousCohort = settings.cohortId || '';
                    const nextCohort = newSettings.cohortId || '';
                    Object.assign(settings,newSettings);
                    board.settings=newSettings;
                    if (nextCohort) {
                        try {
                            await CohortRepository.linkProgram(nextCohort, board.id);
                            if (previousCohort && previousCohort !== nextCohort) await CohortRepository.unlinkProgram(previousCohort, board.id);
                            const added = await syncCohortStudents(nextCohort);
                            if (added) toast(`أُضيف ${added} طالباً من الدفعة`, 'success');
                        } catch (error) { console.error(error); }
                    } else if (previousCohort) {
                        try { await CohortRepository.unlinkProgram(previousCohort, board.id); } catch (error) { console.error(error); }
                    }
                    oldSurahs.clear(); newSettings.scope.surahNumbers.forEach(n=>oldSurahs.add(n));
                    layout?.setActiveBoard?.(board);
                    refreshShare();
                    savedSnapshot = formSnapshot(); saveFailed = false;
                    container.querySelector('#settingsBoardName').textContent = newSettings.name;
                } catch (afterSaveError) {
                    console.error('Board saved, but post-save UI work failed', afterSaveError);
                    savedSnapshot = formSnapshot(); saveFailed = false;
                    refreshSaveState();
                }
            } else {
                const id=await BoardRepository.create(user.uid,newSettings);
                if (!form.isConnected) return;
                // تُلتقط بطاقة المشاركة مرة واحدة عند الإنشاء؛ لا نعيد بنائها عند
                // تعديل البنر حتى لا تعرض تطبيقات المراسلة نسخة مخزنة مضللة.
                if (newSettings.isPublic) OgPreviewTrigger.request(id).catch(error => console.error('OG preview request failed', error));
                await layout?.refreshUserBoards?.();
                toast('تم إنشاء اللوحة. أضف أول طالب لتبدأ.','success');
                navigate(`/edit/${id}/students`);
            }
        } catch(err) {saveFailed = true;console.error(err);if(form.isConnected) reportError('تعذر حفظ اللوحة. اختياراتك محفوظة هنا؛ حاول مرة أخرى.');}
        finally {
            saving=false; form.removeAttribute('aria-busy');
            fields.disabled=false;
            controls.forEach(b=>{b.disabled=false;});
            submit.textContent=label; refreshSaveState();
        }
    });
    if(isEdit) container.querySelector('#deleteBoardBtn').addEventListener('click',async()=>{
        const ok=await confirmDialog({ signal,title:'حذف اللوحة',message:`سيتم حذف لوحة "${settings.name}" وجميع بيانات الطلاب فيها نهائياً.`,confirmText:'حذف نهائياً',danger:true,requireText:settings.name});
        if(!ok) return;
        try {
            await BoardRepository.delete(board.id);
            await layout?.refreshUserBoards?.();
            toast('تم حذف اللوحة','success');
            navigate('/dashboard');
        }
        catch(err) {console.error(err);toast('تعذر حذف اللوحة','error');}
    });
    return () => scopePicker.destroy();
}
