// الصفحة الرئيسية: تعريف بالتطبيق ودعوة المعلمين للدخول
import { authState } from '../../core/authState.js';
import { bannerHeader, topbar, bindTopbar } from '../views/ui.js';
import { APP_NAME } from '../../core/config.js';

export default function LandingPage(container) {
    const user = authState.user();

    container.innerHTML = `
        ${topbar('')}
        ${bannerHeader({
            title: APP_NAME,
            subtitle: 'أنشئ لوحات متابعة حفظ القرآن الكريم لطلابك وشاركها برابط واحد',
        })}

        <div class="landing-cta">
            ${user
                ? `<a href="/dashboard" class="btn btn-primary btn-lg">لوحاتي</a>`
                : `<a href="/login" class="btn btn-primary btn-lg">دخول المعلمين</a>`}
        </div>

        <main class="portal-grid">
            <div class="portal-card">
                <div class="feature-emoji">📋</div>
                <h2 class="portal-title">لوحات متعددة</h2>
                <p class="feature-desc">أنشئ لوحة لكل فصل أو حلقة، واختر المنهج: القرآن كاملاً، أجزاء محددة، أو سوراً مخصصة.</p>
            </div>
            <div class="portal-card">
                <div class="feature-emoji">✅</div>
                <h2 class="portal-title">متابعة سهلة</h2>
                <p class="feature-desc">سجّل حفظ الطلاب بلمسة واحدة لكل سورة، وتُحسب النسب تلقائياً موزونة بعدد الآيات.</p>
            </div>
            <div class="portal-card">
                <div class="feature-emoji">🔗</div>
                <h2 class="portal-title">مشاركة برابط</h2>
                <p class="feature-desc">شارك اللوحة مع الطلاب وأولياء الأمور برابط عام يعرض الترتيب مباشرة دون تسجيل دخول.</p>
            </div>
        </main>
    `;

    bindTopbar(container);
}
