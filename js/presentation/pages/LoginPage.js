// صفحة تسجيل الدخول: جوجل + بريد إلكتروني/كلمة مرور
import { auth } from '../../core/firebase.js';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
} from '../../core/firebase-sdk.js';
import { bannerHeader, toast } from '../views/ui.js';
import { queryParam } from '../../core/router.js';

const ERROR_MESSAGES = {
    'auth/invalid-email': 'البريد الإلكتروني غير صحيح.',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني.',
    'auth/wrong-password': 'كلمة المرور غير صحيحة.',
    'auth/invalid-credential': 'بيانات الدخول غير صحيحة.',
    'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل.',
    'auth/weak-password': 'كلمة المرور ضعيفة — يجب أن تكون 6 أحرف على الأقل.',
    'auth/popup-blocked': 'المتصفح منع النافذة المنبثقة — جرّب الدخول بالبريد الإلكتروني.',
    'auth/popup-closed-by-user': 'تم إغلاق نافذة الدخول قبل الاكتمال.',
    'auth/network-request-failed': 'تعذر الاتصال بالشبكة.',
    'auth/unauthorized-domain': 'هذا النطاق غير مصرّح له بتسجيل الدخول — أضفه في Authentication > Settings > Authorized domains.',
};

function friendlyError(err) {
    if (!ERROR_MESSAGES[err?.code]) console.error('Unhandled auth error:', err?.code, err);
    return ERROR_MESSAGES[err?.code] || 'حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى.';
}

export default function LoginPage(container, { navigate }) {
    const next = queryParam('next') || '/dashboard';
    let mode = 'signin'; // signin | signup

    container.innerHTML = `
        ${bannerHeader({ title: 'دخول المعلمين', subtitle: 'سجّل الدخول لإنشاء وإدارة لوحات الحفظ' })}
        <div class="auth-card">
            <h2 class="auth-title" id="authTitle">تسجيل الدخول</h2>
            <div class="auth-error" id="authError" role="alert"></div>

            <button class="google-btn" id="googleBtn" type="button">
                <svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.9 5.1 29.7 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.9 5.1 29.7 3 24 3 16.3 3 9.6 7.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.6 0 10.7-1.9 14.6-5.4l-6.7-5.7C29.8 35.6 27 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.5 40.6 16.2 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.7 5.7C40.9 36.8 45 31 45 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
                المتابعة بحساب Google
            </button>

            <div class="auth-divider">أو</div>

            <form id="emailForm">
                <div class="form-group" id="nameGroup" style="display:none;">
                    <label class="form-label" for="nameInput">الاسم</label>
                    <input type="text" class="form-input" id="nameInput" autocomplete="name">
                </div>
                <div class="form-group">
                    <label class="form-label" for="emailInput">البريد الإلكتروني</label>
                    <input type="email" class="form-input" id="emailInput" autocomplete="email" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="passwordInput">كلمة المرور</label>
                    <input type="password" class="form-input" id="passwordInput" autocomplete="current-password" required minlength="6">
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;" id="submitBtn">تسجيل الدخول</button>
            </form>

            <div class="auth-alt">
                <span id="altText">ليس لديك حساب؟</span>
                <button type="button" id="toggleModeBtn">إنشاء حساب جديد</button>
            </div>
            <div class="auth-alt">
                <button type="button" id="forgotBtn">نسيت كلمة المرور؟</button>
            </div>
        </div>
    `;

    const errorBox = container.querySelector('#authError');
    const showError = msg => {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
    };
    const clearError = () => { errorBox.style.display = 'none'; };

    // يجب استدعاء signInWithPopup مباشرة داخل معالج النقر دون أي await قبله لتفادي حجب المتصفح للنافذة
    container.querySelector('#googleBtn').addEventListener('click', () => {
        clearError();
        signInWithPopup(auth, new GoogleAuthProvider())
            .then(() => { toast('تم تسجيل الدخول بنجاح ✓', 'success'); navigate(next); })
            .catch(err => { if (err.code !== 'auth/cancelled-popup-request') showError(friendlyError(err)); });
    });

    const nameGroup = container.querySelector('#nameGroup');
    const nameInput = container.querySelector('#nameInput');
    const authTitle = container.querySelector('#authTitle');
    const submitBtn = container.querySelector('#submitBtn');
    const altText = container.querySelector('#altText');
    const toggleModeBtn = container.querySelector('#toggleModeBtn');

    function applyMode() {
        if (mode === 'signup') {
            authTitle.textContent = 'إنشاء حساب معلم';
            submitBtn.textContent = 'إنشاء الحساب';
            altText.textContent = 'لديك حساب بالفعل؟';
            toggleModeBtn.textContent = 'تسجيل الدخول';
            nameGroup.style.display = 'block';
        } else {
            authTitle.textContent = 'تسجيل الدخول';
            submitBtn.textContent = 'تسجيل الدخول';
            altText.textContent = 'ليس لديك حساب؟';
            toggleModeBtn.textContent = 'إنشاء حساب جديد';
            nameGroup.style.display = 'none';
        }
    }

    toggleModeBtn.addEventListener('click', () => {
        mode = mode === 'signin' ? 'signup' : 'signin';
        clearError();
        applyMode();
    });

    container.querySelector('#emailForm').addEventListener('submit', async e => {
        e.preventDefault();
        clearError();
        const email = container.querySelector('#emailInput').value.trim();
        const password = container.querySelector('#passwordInput').value;
        submitBtn.disabled = true;
        try {
            if (mode === 'signup') {
                const name = nameInput.value.trim();
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                if (name) await updateProfile(cred.user, { displayName: name });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            toast('تم تسجيل الدخول بنجاح ✓', 'success');
            navigate(next);
        } catch (err) {
            showError(friendlyError(err));
        } finally {
            submitBtn.disabled = false;
        }
    });

    container.querySelector('#forgotBtn').addEventListener('click', async () => {
        const email = container.querySelector('#emailInput').value.trim();
        if (!email) { showError('اكتب بريدك الإلكتروني أولاً ثم اضغط نسيت كلمة المرور.'); return; }
        try {
            await sendPasswordResetEmail(auth, email);
            toast('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني', 'success');
        } catch (err) {
            showError(friendlyError(err));
        }
    });

    applyMode();
}
