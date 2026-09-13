// صفحة الدفعات: تسجيل دفعة بالاسم ثم إدارة طلابها.
import { cohortSummaryText } from '../../domain/models/Cohort.js';
import { escapeHtml } from '../views/ui.js';
import { createFeedbackState } from '../layout/FeedbackStateView.js';
import { LIMITS } from '../../shared/config.js';

export default async function CohortsPage(container, { toast, layout, navigate, user, services, setTitle }) {
    const CohortRepository = services.cohorts;
    setTitle('الدفعات — وسام');
    layout?.setActiveBoard(null);

    let cohorts = [];

    container.innerHTML = `<div id="cohortsHost"><p role="status">جارِ تحميل الدفعات…</p></div>`;
    const host = container.querySelector('#cohortsHost');

    async function load() {
        try {
            cohorts = await CohortRepository.listMine(user.uid);
        } catch (error) {
            console.error(error);
            host.replaceChildren(createFeedbackState({
                type: 'error',
                icon: '⚠️',
                eyebrow: 'الدفعات',
                title: 'تعذر تحميل الدفعات',
                message: 'تحقق من الاتصال وأعد المحاولة.',
                actions: [{ label: 'إعادة المحاولة', onClick: () => load(), primary: true }]
            }));
            return;
        }
        render();
    }

    function render() {
        host.innerHTML = `
            <div class="page-title-row">
                <div>
                    <span class="eyebrow">تنظيم الطلاب</span>
                    <h1 class="page-title">الدفعات</h1>
                    <p class="page-subtitle">سجّل الدفعة مرة واحدة باسمها، ثم اخترها عند إنشاء أي برنامج جديد بدل إعادة كتابة الأسماء.</p>
                </div>
                <div class="cohort-total"><strong class="numeric-value">${cohorts.length}</strong><span>دفعة مسجلة</span></div>
            </div>

            <form class="cohort-create" id="cohortCreateForm">
                <div class="cohort-create-row">
                    <label class="cohort-field">
                        <span>اسم الدفعة</span>
                        <input type="text" id="cohortName" placeholder="مثال: دفعة 1447 — المستوى الأول" maxlength="${LIMITS.MAX_NAME_LENGTH}" required autocomplete="off">
                    </label>
                    <button type="submit" class="btn btn-primary" id="createCohortBtn">تسجيل الدفعة</button>
                </div>
                <p class="cohort-create-note">بعد التسجيل ستنتقل إلى صفحة الدفعة لإضافة أسماء الطلاب.</p>
            </form>

            <div id="cohortsList">${cohorts.length ? cohorts.map(cohortCardHtml).join('') : emptyStateHtml()}</div>
        `;

        host.querySelector('#cohortCreateForm').addEventListener('submit', async event => {
            event.preventDefault();
            const button = host.querySelector('#createCohortBtn');
            const name = host.querySelector('#cohortName').value.trim();
            if (!name || button.disabled) return;
            button.disabled = true;
            try {
                const id = await CohortRepository.create(user.uid, { name });
                toast(`تم تسجيل «${name}»`, 'success');
                navigate(`/cohorts/${id}`);
            } catch (error) {
                console.error(error);
                toast(error?.message || 'تعذر تسجيل الدفعة', 'error');
                button.disabled = false;
            }
        });
    }

    function cohortCardHtml(cohort) {
        return `
            <a class="cohort-card" href="/cohorts/${cohort.id}">
                <span class="cohort-card-emblem" aria-hidden="true">${escapeHtml(Array.from(cohort.name || 'د')[0])}</span>
                <span class="cohort-card-copy">
                    <span class="cohort-card-name">${escapeHtml(cohort.name || 'دفعة بدون اسم')}</span>
                    <span class="cohort-card-meta">${escapeHtml(cohortSummaryText(cohort))}</span>
                </span>
                <span class="cohort-card-arrow" aria-hidden="true">←</span>
            </a>
        `;
    }

    function emptyStateHtml() {
        return `
            <div class="cohort-empty">
                <strong>لا توجد دفعات بعد</strong>
                <p>ابدأ بتسجيل دفعة باسمها، ثم أضف أسماء الطلاب — وستجدها جاهزة للاختيار في كل برنامج جديد.</p>
            </div>
        `;
    }

    await load();
}
