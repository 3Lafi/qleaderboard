import { BADGES, BADGE_LEVELS } from '../../domain/usecases/Badges.js';
import { badgeArt, badgeCard, bindBadgeDetails } from '../views/BadgeView.js';
import { matchesQueryNameOrNumber } from '../../shared/text-utils.js';

export default function BadgesPage(container, { layout, setTitle, signal, url, replaceQuery }) {
    setTitle('مكتبة الأوسمة — وسام');
    layout?.setActiveBoard(null);

    let filter = ['quran', 'juz', 'surah'].includes(url.searchParams.get('level')) ? url.searchParams.get('level') : 'surah';
    let query = url.searchParams.get('q') || '';

    container.innerHTML = `
        <section class="badge-library">
            <div class="page-title-row">
                <div>
                    <span class="eyebrow">لكل إنجاز وسام</span>
                    <h1 class="page-title">مكتبة الأوسمة</h1>
                    <p class="page-subtitle">رحلة تبدأ بسورة، وتتوج بحفظ القرآن الكريم.</p>
                </div>
                <span class="collection-total">145 <span>وساماً في انتظار الإنجاز</span></span>
            </div>
            <div class="level-selector" role="group" aria-label="مستوى الأوسمة">
                ${[{ type: 'quran', id: 'quran-1', title: 'القرآن الكريم' }, { type: 'juz', id: 'juz-30', title: 'الأجزاء' }, { type: 'surah', id: 'surah-1', title: 'السور' }].map(item =>
                    `<button class="level-choice ${item.type === filter ? 'active' : ''}" data-level="${item.type}" aria-pressed="${item.type === filter}" aria-label="استعرض ${BADGE_LEVELS[item.type].label}">
                        <span class="level-choice-tier">${BADGE_LEVELS[item.type].tier}</span>
                        ${badgeArt(BADGES.find(b => b.id === item.id), { decorative: true, eager: true })}
                        <strong>${item.title}</strong>
                        <span class="level-choice-count">${BADGE_LEVELS[item.type].count} ${item.type === 'quran' ? 'وسام' : 'وساماً'}</span>
                    </button>`
                ).join('')}
            </div>
            <div class="section-heading library-heading-with-search">
                <div>
                    <h2 id="collectionTitle">أوسمة السور</h2>
                    <p id="collectionDescription">كل سورة تحفظها، إنجاز يبقى معك.</p>
                </div>
                <div class="library-search-wrap">
                    <label class="badge-search">
                        <span>بحث</span>
                        <input type="search" id="badgeSearch" placeholder="اسم السورة أو رقمها…" aria-label="ابحث عن وسام">
                    </label>
                    <span id="resultCount" class="badge-count-pill" role="status" aria-live="polite"></span>
                </div>
            </div>
            <div class="achievement-grid" id="badgeGrid"></div>
            <aside class="collection-note">
                <img src="/images/app-icons/badge-v10-192.png" width="36" height="36" alt="">
                <div>
                    <strong>إنجازك يُحتسب تلقائياً</strong>
                    <p>تظهر الأوسمة في ملف الطالب عندما يسجل المعلم الحفظ. الأوسمة هنا للعرض والتعرّف على شروط اكتسابها.</p>
                </div>
            </aside>
        </section>
    `;

    const grid = container.querySelector('#badgeGrid');

    function render() {
        const search = new URLSearchParams({ level: filter });
        if (query) search.set('q', query);
        replaceQuery(search.toString());
        const matches = BADGES.filter(b => b.type === filter && matchesQueryNameOrNumber(b, query));

        grid.innerHTML = matches.length
            ? matches.map(b => badgeCard(b, { catalog: true })).join('')
            : `<div class="empty-search">
                   <h3>لم نجد وساماً بهذا الاسم</h3>
                   <p>جرّب اسم سورة آخر أو رقمها.</p>
                   <button class="btn btn-secondary" id="clearSearch">مسح البحث</button>
               </div>`;

        container.querySelector('#collectionTitle').textContent = BADGE_LEVELS[filter].label;
        container.querySelector('#collectionDescription').textContent = {
            quran: 'وسام واحد يحمل معنى رحلة كاملة.',
            juz: 'ثلاثون جزءاً، وثلاثون محطة تستحق الاحتفاء.',
            surah: 'كل سورة تحفظها، إنجاز يبقى معك.'
        }[filter];
        container.querySelector('#resultCount').textContent = `${matches.length} وسام`;

        bindBadgeDetails(grid, matches, { catalog: true, signal });

        grid.querySelector('#clearSearch')?.addEventListener('click', () => {
            query = '';
            container.querySelector('#badgeSearch').value = '';
            render();
        });
    }

    container.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => {
        filter = button.dataset.level;
        query = '';
        const searchInput = container.querySelector('#badgeSearch');
        searchInput.value = '';
        searchInput.placeholder = filter === 'surah' ? 'اسم السورة أو رقمها…' : 'ابحث بالاسم أو الرقم…';
        container.querySelectorAll('[data-level]').forEach(b => {
            b.classList.toggle('active', b === button);
            b.setAttribute('aria-pressed', String(b === button));
        });
        render();
    }));

    container.querySelector('#badgeSearch').addEventListener('input', e => {
        query = e.target.value;
        render();
    });

    container.querySelector('#badgeSearch').value = query;
    container.querySelector('#badgeSearch').placeholder = filter === 'surah' ? 'اسم السورة أو رقمها…' : 'ابحث بالاسم أو الرقم…';
    render();
}
