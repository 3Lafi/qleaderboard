// إنشاء/تعديل لوحة: الاسم، المدرسة، نطاق المنهج، الاتجاه، الخصوصية
import { authState } from '../../core/authState.js';
import { BoardRepository } from '../../data/repositories/BoardRepository.js';
import { defaultSettings, sanitizeSettings } from '../../domain/models/BoardSettings.js';
import { SURAHS } from '../../core/quran-data.js';
import { topbar, bindTopbar, toast, confirmDialog, escapeHtml } from '../views/ui.js';
import { mountScopePicker } from '../views/ScopePickerView.js';
import { mountBannerDesigner } from '../views/BannerDesignerView.js';

export default async function BoardSettingsPage(container, { params, navigate }) {
    const user = authState.user();
    const isEdit = Boolean(params.boardId);
    let board = null;

    if (isEdit) {
        board = await BoardRepository.get(params.boardId);
        if (!board) {
            container.innerHTML = `<div id="error-msg" style="display:block;"><p>اللوحة غير موجودة.</p></div>`;
            return;
        }
        if (board.ownerUid !== user.uid) {
            container.innerHTML = `<div id="error-msg" style="display:block;"><p>لا تملك صلاحية تعديل هذه اللوحة.</p></div>`;
            return;
        }
    }

    const settings = isEdit
        ? JSON.parse(JSON.stringify(board.settings))
        : defaultSettings();

    const oldSurahNumbers = new Set(settings.scope.surahNumbers || []);

    container.innerHTML = `
        ${topbar('dashboard')}
        <div class="page-title-row">
            <h1 class="page-title">${isEdit ? 'إعدادات اللوحة' : 'لوحة جديدة'}</h1>
        </div>

        <form id="boardForm">
            <div class="form-card">
                <div class="form-group">
                    <label class="form-label" for="fName">اسم اللوحة *</label>
                    <input type="text" class="form-input" id="fName" required maxlength="100" value="${escapeHtml(settings.name)}" placeholder="مثال: حلقة الفجر — المستوى الثاني">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="fSchool">اسم المدرسة / الحلقة</label>
                        <input type="text" class="form-input" id="fSchool" maxlength="150" value="${escapeHtml(settings.schoolName)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="fClass">اسم الفصل / المجموعة</label>
                        <input type="text" class="form-input" id="fClass" maxlength="100" value="${escapeHtml(settings.classLabel)}">
                    </div>
                </div>
            </div>

            ${isEdit ? '' : '<div class="form-card" id="bannerCardHost"></div>'}

            <div class="form-card" id="scopeCardHost"></div>

            <div class="form-card">
                <div class="toggle-row">
                    <div>
                        <div class="toggle-label">اتجاه الحفظ</div>
                        <p class="form-hint" style="margin-top:2px;">عكسي: من الناس صعوداً (المعتاد في التحفيظ) — طردي: من الفاتحة</p>
                    </div>
                    <div class="seg-tabs" style="width:220px; margin-bottom:0;" role="group" aria-label="اتجاه الحفظ">
                        <button type="button" class="seg-tab ${settings.direction !== 'forward' ? 'active' : ''}" data-dir="reverse" aria-pressed="${settings.direction !== 'forward'}">عكسي</button>
                        <button type="button" class="seg-tab ${settings.direction === 'forward' ? 'active' : ''}" data-dir="forward" aria-pressed="${settings.direction === 'forward'}">طردي</button>
                    </div>
                </div>
                <div class="toggle-row">
                    <span class="toggle-label" id="fPublicLabel">لوحة عامة (رابط مشاركة بدون تسجيل دخول)</span>
                    <label class="toggle">
                        <input type="checkbox" id="fPublic" aria-labelledby="fPublicLabel" ${settings.isPublic ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="toggle-row">
                    <span class="toggle-label" id="fShowClassLabel">إظهار شريط إنجاز الفصل</span>
                    <label class="toggle">
                        <input type="checkbox" id="fShowClass" aria-labelledby="fShowClassLabel" ${settings.showClassProgress ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="form-group" style="margin-top:16px; margin-bottom:0;">
                    <label class="form-label" for="fCurrentSurah">السورة الحالية للفصل</label>
                    <select class="form-select" id="fCurrentSurah">
                        <option value="">تلقائي (يُحسب حسب تقدم الطلاب)</option>
                        ${SURAHS.map(s => `<option value="${s.n}" ${settings.classCurrentSurah === s.n ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div style="display:flex; gap:10px;">
                <button type="submit" class="btn btn-primary btn-lg" id="submitBtn">${isEdit ? 'حفظ التغييرات' : 'إنشاء اللوحة'}</button>
                <a href="/dashboard" class="btn btn-secondary btn-lg">إلغاء</a>
            </div>
        </form>

        ${isEdit ? `
            <div class="danger-zone">
                <h3 class="danger-zone-title">منطقة الخطر</h3>
                <p class="form-hint" style="margin-bottom:14px;">حذف اللوحة يزيل جميع بيانات الطلاب نهائياً ولا يمكن التراجع عنه.</p>
                <button type="button" class="btn btn-danger" id="deleteBoardBtn">حذف اللوحة</button>
            </div>
        ` : ''}
    `;
    bindTopbar(container);

    const scopePicker = mountScopePicker(container.querySelector('#scopeCardHost'), settings.scope);

    // التصميم يُختار عند الإنشاء فقط — في التعديل يمرَّر banner المحفوظ كما هو (القواعد تمنع تغييره)
    let bannerDesigner = null;
    if (!isEdit) {
        bannerDesigner = mountBannerDesigner(container.querySelector('#bannerCardHost'), () => ({
            name: container.querySelector('#fName').value,
            schoolName: container.querySelector('#fSchool').value,
            classLabel: container.querySelector('#fClass').value,
        }));
        ['#fName', '#fSchool', '#fClass'].forEach(sel => {
            container.querySelector(sel).addEventListener('input', bannerDesigner.refreshPreview);
        });
    }

    let direction = settings.direction !== 'forward' ? 'reverse' : 'forward';
    container.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => {
            direction = btn.dataset.dir;
            container.querySelectorAll('[data-dir]').forEach(b => {
                b.classList.toggle('active', b === btn);
                b.setAttribute('aria-pressed', String(b === btn));
            });
        });
    });

    if (isEdit) {
        container.querySelector('#deleteBoardBtn').addEventListener('click', async () => {
            const ok = await confirmDialog({
                title: 'حذف اللوحة',
                message: `سيتم حذف لوحة "${settings.name}" وجميع بيانات الطلاب فيها نهائياً.`,
                confirmText: 'حذف نهائياً',
                danger: true,
                requireText: settings.name,
            });
            if (!ok) return;
            try {
                await BoardRepository.delete(board.id);
                toast('تم حذف اللوحة', 'success');
                navigate('/dashboard');
            } catch (err) {
                console.error(err);
                toast('تعذر حذف اللوحة', 'error');
            }
        });
    }

    container.querySelector('#boardForm').addEventListener('submit', async e => {
        e.preventDefault();
        const submitBtn = container.querySelector('#submitBtn');

        let newSettings;
        try {
            newSettings = sanitizeSettings({
                name: container.querySelector('#fName').value,
                schoolName: container.querySelector('#fSchool').value,
                classLabel: container.querySelector('#fClass').value,
                banner: isEdit ? settings.banner : { themeId: bannerDesigner.getThemeId() },
                scope: scopePicker.getScope(),
                direction,
                isPublic: container.querySelector('#fPublic').checked,
                showClassProgress: container.querySelector('#fShowClass').checked,
                classCurrentSurah: container.querySelector('#fCurrentSurah').value
                    ? Number(container.querySelector('#fCurrentSurah').value)
                    : null,
            });
        } catch (err) {
            toast(err.message, 'error');
            return;
        }

        submitBtn.disabled = true;
        try {
            if (isEdit) {
                const shrunk = [...oldSurahNumbers].some(n => !newSettings.scope.surahNumbers.includes(n));
                await BoardRepository.updateSettings(board.id, newSettings);
                if (shrunk) toast('تم الحفظ — بيانات الحفظ خارج النطاق الجديد محفوظة ولن تُحتسب فقط', 'success');
                else toast('تم حفظ التغييرات', 'success');
                navigate(`/edit/${board.id}`);
            } else {
                const id = await BoardRepository.create(user.uid, newSettings);
                toast('تم إنشاء اللوحة ✓', 'success');
                navigate(`/edit/${id}/students`);
            }
        } catch (err) {
            console.error(err);
            toast('تعذر حفظ اللوحة، حاول مرة أخرى', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });
}
