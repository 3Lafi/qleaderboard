import { BADGES } from '../../domain/usecases/Badges.js';
import { badgeArt } from '../views/BadgeView.js';

export default function LandingPage(container, { layout, user, setTitle }) {
    setTitle('وسام — لكل إنجاز في الحفظ وسام');
    layout?.setActiveBoard(null);

    container.innerHTML = `
        <div class="landing-page">
            <section class="welcome-hero">
                <div class="welcome-copy">
                    <span class="eyebrow"><span class="status-dot"></span> رفيق المعلم في رحلة التحفيظ</span>
                    <h1>كل آية تُحفظ،<br>تستحق أن <em>نحتفي بها.</em></h1>
                    <p>تابع حفظ طلابك، احتفِ بإنجازاتهم بأوسمة مميزة، واجعل رحلتهم مع القرآن أكثر إلهاماً.</p>
                    <div class="hero-actions">
                        <a href="${user ? '/dashboard' : '/login?next=%2Fnew'}" class="btn btn-primary btn-lg">
                            ${user ? 'انتقل إلى لوحاتي' : 'ابدأ بإعداد حلقتك'} <span aria-hidden="true">←</span>
                        </a>
                    </div>
                    <span class="hero-footnote">للمعلمين والحلقات والمدارس · تجربة عربية متكاملة</span>
                </div>
                <div class="welcome-visual">
                    <div class="welcome-badge-label">وَسَامُ حَافِظِ الْقُرْآنِ</div>
                    ${badgeArt(BADGES[0], { decorative: true, eager: true })}
                    <div class="welcome-visual-footer">
                        <span>حفظٌ يرفع الهمّة</span>
                        <span>وإنجازٌ يترك أثراً</span>
                    </div>
                </div>
            </section>

            <section class="home-collection">
                <div class="section-heading">
                    <div>
                        <span class="eyebrow">من أول سورة إلى تمام الختم</span>
                        <h2>ثلاثة مستويات من الفخر</h2>
                    </div>
                    <a href="/badges" class="text-link">استعرض جميع الأوسمة <span aria-hidden="true">←</span></a>
                </div>
                <div class="level-grid">
                    ${[
                        { badge: BADGES[0], label: 'وسام القرآن الكريم', tier: 'المستوى الأول', description: 'التتويج الأسمى لرحلة الحفظ. وسام خاص لمن أتم حفظ كتاب الله.' },
                        { badge: BADGES.find(b => b.id === 'juz-30'), label: 'أوسمة الأجزاء', tier: 'المستوى الثاني', description: 'ثلاثون محطة مضيئة. احتفاء بكل جزء يكتمل حفظه.' },
                        { badge: BADGES.find(b => b.id === 'surah-1'), label: 'أوسمة السور', tier: 'المستوى الثالث', description: 'لكل سورة مكانتها. 114 وساماً تروي خطوات الإنجاز.' }
                    ].map(item =>
                        `<a href="/badges?level=${item.badge.type}" class="level-card level-${item.badge.type}">
                            <span class="eyebrow">${item.tier}</span>
                            ${badgeArt(item.badge, { decorative: true })}
                            <h3>${item.label}</h3>
                            <p>${item.description}</p>
                            <span class="text-link">اكتشف المجموعة <span aria-hidden="true">←</span></span>
                        </a>`
                    ).join('')}
                </div>
            </section>

            <section class="how-section">
                <div>
                    <span class="eyebrow">وقت أقل للإدارة، مساحة أكبر للتعليم</span>
                    <h2>متابعة واضحة.<br>وتحفيز يصنع الفرق.</h2>
                    <p>كل ما تحتاجه لإدارة الحفظ في مكان واحد، من إعداد الحلقة إلى مشاركة ثمارها.</p>
                </div>
                <ol class="steps-list">
                    <li>
                        <span>01</span>
                        <div>
                            <h3>أنشئ لوحتك</h3>
                            <p>اختر المنهج المناسب للحلقة: القرآن، أجزاء محددة، أو سور مختارة.</p>
                        </div>
                    </li>
                    <li>
                        <span>02</span>
                        <div>
                            <h3>سجّل الحفظ بسهولة</h3>
                            <p>حدّث حفظ كل طالب، وشاهد التقدم والأوسمة تُحتسب تلقائياً.</p>
                        </div>
                    </li>
                    <li>
                        <span>03</span>
                        <div>
                            <h3>شارك لحظات الإنجاز</h3>
                            <p>من إعدادات اللوحة، انسخ الرابط ليتابع أولياء الأمور تقدم أبنائهم.</p>
                        </div>
                    </li>
                </ol>
            </section>
        </div>
        <footer class="site-footer">
            <a class="topbar-brand" href="/">
                <span class="topbar-icon"></span>
                <span class="topbar-title">وسام</span>
            </a>
            <p>نحتفي بالحفظ، ونُلهم الاستمرار.</p>
            <a href="/badges">مكتبة الأوسمة</a>
        </footer>
    `;
}
