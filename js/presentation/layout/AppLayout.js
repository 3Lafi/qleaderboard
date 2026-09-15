// هيكل التطبيق العام ومحرّك التنقل المستقر (AppLayout & AppShell)
// Stable primary destinations, board navigation and an accessible mobile drawer.
import { sidebarHtml, bindSidebarEvents, updateSidebarActive } from './SidebarView.js';
import { normalizeStudents } from './SidebarStudentsNav.js';
import { createFeedbackState } from './FeedbackStateView.js';
import { appHeaderHtml, updateAppHeader } from './AppHeaderView.js';

// المسارات التي يُعرض فيها تنقّل ملفات الطلاب داخل الشريط الجانبي
const STUDENT_NAV_KEYS = new Set(['board-public', 'board-students', 'board-settings']);

export class AppLayoutManager {
    constructor({ authState, boards, authentication }) {
        this.authState = authState;
        this.boards = boards;
        this.authentication = authentication;
        this.boardsRequest = 0;
        this.currentActiveKey = '';
        this.locationTrail = null;
        this.activeBoard = null;
        this.studentsNav = null;
        this.userBoards = [];
        this.isSidebarOpen = false;
        this.isInitialized = false;
        this.authSubscribed = false;
        this.navProgressTimer = null;
        this.lastDrawerMode = null;
        this.boardPickerOpen = false;
    }

    /**
     * تجهيز هيكل التطبيق العام داخل الحاوية الأساسية لمرة واحدة فقط
     * @param {HTMLElement} rootContainer عنصر #app
     * @returns {HTMLElement} عنصر #pageContent المخصص لمحتوى الصفحات
     */
    initShell(rootContainer) {

        let shell = rootContainer.querySelector('#appShell');
        if (!shell) {
            rootContainer.innerHTML = `
                <div id="appShell" class="app-shell">
                    <div id="navProgress" class="nav-progress" hidden><i></i></div>
                    <div id="sidebarBackdrop" class="sidebar-backdrop" aria-hidden="true"></div>
                    <aside id="appSidebarHost" class="app-sidebar" aria-label="شريط التنقل الجانبي"></aside>
                    <div class="app-main-wrapper">
                        <div id="appHeaderHost">${appHeaderHtml()}</div>
                        <main id="pageContent" class="page-content" tabindex="-1"></main>
                    </div>
                    <p id="routeAnnouncer" class="sr-only" role="status" aria-live="polite"></p>
                </div>
            `;
            shell = rootContainer.querySelector('#appShell');
            this.isInitialized = false;
        }

        const sidebarHost = shell.querySelector('#appSidebarHost');
        const contentHost = shell.querySelector('#pageContent');
        const backdrop = shell.querySelector('#sidebarBackdrop');

        if (!this.isInitialized) {
            // رسم الواجهات الأولية لمرة واحدة دون تدمير لاحق للـ DOM
            sidebarHost.innerHTML = sidebarHtml(this.currentActiveKey, {
                activeBoard: this.activeBoard,
                user: this.authState.user(),
                boards: this.userBoards,
                studentsNav: this.studentsNav
            });

            // Bind navigation and account actions once.
            bindSidebarEvents(sidebarHost, {
                signOut: () => this.authentication.signOut(),
                closeDrawer: () => this.closeSidebar(),
                toggleBoardPicker: (force) => this.toggleBoardPicker(force)
            });

            const menuButton = shell.querySelector('#appMenuBtn');
            menuButton.onclick = () => this.toggleSidebar(menuButton);

            // حبس التركيز داخل الدرج أثناء فتحه + إغلاقه بالسحب
            sidebarHost.addEventListener('keydown', event => this.trapDrawerFocus(event));
            this.bindDrawerSwipe(sidebarHost);

            // إغلاق الدرج عند لمس الغطاء الخلفي أو سحبه نحو الحافة
            if (backdrop) {
                backdrop.onclick = () => this.closeSidebar();
                this.bindDrawerSwipe(backdrop);
            }

            // إغلاق الدرج بمفتاح Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isSidebarOpen) {
                    this.closeSidebar();
                }
            });

            // مراقبة تسجيل الدخول والخروج لتحديث قائمة لوحات الشريط الجانبي فوراً
            if (!this.authSubscribed) {
                this.authState.subscribe(u => {
                    this.locationTrail = null;
                    this.boardPickerOpen = false;
                    this.activeBoard = null;
                    this.studentsNav = null;
                    this.userBoards = [];
                    this.boardsUid = null;
                    ++this.boardsRequest;
                    if (u) this.refreshUserBoards(u.uid);
                    this.renderSidebar(u);
                });
                this.authSubscribed = true;
            }

            this.syncDrawerAccessibility();
            window.matchMedia('(max-width: 992px)').addEventListener('change', event => {
                // عند العودة لسطح المكتب نغلق الدرج ونحرّر قفل التمرير
                if (!event.matches && this.isSidebarOpen) this.closeSidebar();
                this.syncDrawerAccessibility();
            });
            this.isInitialized = true;
        }

        return contentHost;
    }

    /**
     * إعادة رسم محتوى الشريط الجانبي من الحالة الحالية
     * @param {Object|null} [user] المستخدم الحالي (يُقرأ من حالة المصادقة إن لم يُمرَّر)
     */
    setLocationTrail(trail) {
        this.locationTrail = trail;
        this.renderHeader();
    }

    setGuestBoardView(enabled) {
        const shell = document.getElementById('appShell');
        shell?.classList.toggle('guest-board-view', Boolean(enabled));
        if (enabled) this.closeSidebar();
    }

    renderHeader(user = this.authState.user()) {
        updateAppHeader(document.getElementById('appHeaderHost'), {
            activeKey: this.currentActiveKey, board: this.activeBoard, user, studentsNav: this.studentsNav, trail: this.locationTrail
        });
    }

    renderSidebar(user = this.authState.user()) {
        const sidebarHost = document.getElementById('appSidebarHost');
        if (!sidebarHost) return;

        // شبكة أمان: أي تغيّر في نمط العرض يجب أن يعيد ضبط حالة العزل،
        // لأن شريطاً معزولاً (inert) يبدو ظاهراً لكنه لا يستقبل أي نقرة.
        const drawerMode = this.isDrawerMode();
        if (drawerMode !== this.lastDrawerMode) {
            this.lastDrawerMode = drawerMode;
            this.syncDrawerAccessibility();
        }

        this.renderHeader(user);
        updateSidebarActive(sidebarHost, this.currentActiveKey, {
            activeBoard: this.activeBoard,
            user,
            boards: this.userBoards,
            studentsNav: this.studentsNav,
            boardPickerOpen: this.boardPickerOpen
        });
    }

    /**
     * ضبط سياق تنقّل ملفات الطلاب المعروض في الشريط الجانبي
     * تستدعيه الصفحات التي تعرف طلاب اللوحة النشطة (وتُمرّر قائمة فارغة لإظهار حالة "لا طلاب").
     * @param {{boardId?:string, boardName?:string, students?:Array<Object>, activeStudentId?:string}|null} context
     */
    setStudentsNav(context = null) {
        if (!context?.boardId) {
            this.clearStudentsNav();
            return;
        }

        this.studentsNav = {
            boardId: String(context.boardId),
            boardName: context.boardName || this.activeBoard?.settings?.name || '',
            students: normalizeStudents(context.students),
            activeStudentId: context.activeStudentId ? String(context.activeStudentId) : '',
            // The page selects owner or public profile destinations.
            linkable: context.linkable !== false,
            ownerView: Boolean(context.ownerView)
        };
        this.renderSidebar();
    }

    /**
     * إخفاء قسم تنقّل ملفات الطلاب
     */
    clearStudentsNav() {
        if (!this.studentsNav) return;
        this.studentsNav = null;
        this.renderSidebar();
    }

    /**
     * إظهار مؤشر تقدّم رفيع أثناء تحميل الصفحة التالية.
     * لا يظهر في الانتقالات السريعة حتى لا يومض.
     */
    beginNavigation() {
        clearTimeout(this.navProgressTimer);
        this.navProgressTimer = setTimeout(() => {
            const bar = document.getElementById('navProgress');
            if (bar) bar.hidden = false;
        }, 140);
    }

    /**
     * إخفاء مؤشر التقدّم بعد اكتمال الرسم
     */
    endNavigation() {
        clearTimeout(this.navProgressTimer);
        const bar = document.getElementById('navProgress');
        if (bar) bar.hidden = true;
    }

    /**
     * فتح الدرج الجانبي للهاتف مع نقل التركيز داخله
     * @param {HTMLElement} [trigger] الزر الذي فتح الدرج (يُعاد إليه التركيز عند الإغلاق)
     */
    openSidebar(trigger = null) {
        const shell = document.getElementById('appShell');
        if (!shell || this.isSidebarOpen || !this.isDrawerMode()) return;

        this.drawerTrigger = trigger instanceof HTMLElement ? trigger : document.activeElement;
        shell.classList.add('sidebar-open');
        this.isSidebarOpen = true;
        document.body.classList.add('drawer-locked');
        this.setDrawerExpanded(true);
        this.syncDrawerAccessibility();

        // نقل التركيز يجب أن يقع بعد أن يطبّق المتصفح عزل الخلفية، لأن عزل العنصر
        // المُركَّز عليه (زر القائمة) يلغي التركيز في الإطار التالي.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const sidebar = document.getElementById('appSidebarHost');
            if (!sidebar || !this.isSidebarOpen) return;
            const target = sidebar.querySelector('#sidebarCloseBtn') || this.drawerFocusables()[0];
            target?.focus({ preventScroll: true });
            if (!sidebar.contains(document.activeElement)) {
                setTimeout(() => { if (this.isSidebarOpen) target?.focus({ preventScroll: true }); }, 80);
            }
        }));
    }

    /**
     * إغلاق الدرج الجانبي للهاتف وإعادة التركيز إلى مصدر الفتح
     */
    closeSidebar() {
        const shell = document.getElementById('appShell');
        if (!shell) return;
        const wasOpen = this.isSidebarOpen;
        shell.classList.remove('sidebar-open');
        this.isSidebarOpen = false;
        document.body.classList.remove('drawer-locked');
        this.setDrawerExpanded(false);
        // رفع العزل قبل إعادة التركيز، لأن العنصر المعزول لا يقبل التركيز
        this.syncDrawerAccessibility();

        if (wasOpen && !this.drawerClosedByPopstate && this.drawerTrigger instanceof HTMLElement && this.drawerTrigger.isConnected) {
            this.drawerTrigger.focus({ preventScroll: true });
        }
        this.drawerTrigger = null;
        this.drawerClosedByPopstate = false;
    }

    /**
     * هل نحن في وضع الدرج (شاشة أقل من 993px)؟
     */
    isDrawerMode() {
        return window.matchMedia('(max-width: 992px)').matches;
    }

    /**
     * ضبط دلالات الدرج: نافذة حوارية عند الفتح، والمحتوى خلفه معزول (inert).
     * في وضع سطح المكتب لا يُعزل شيء لأن الشريط جزء دائم من الصفحة.
     */
    syncDrawerAccessibility() {
        const sidebar = document.getElementById('appSidebarHost');
        const main = document.querySelector('.app-main-wrapper');
        if (!sidebar) return;

        if (!this.isDrawerMode()) {
            sidebar.removeAttribute('role');
            sidebar.removeAttribute('aria-modal');
            sidebar.removeAttribute('aria-hidden');
            sidebar.inert = false;
            if (main) main.inert = false;
            return;
        }

        if (this.isSidebarOpen) {
            sidebar.setAttribute('role', 'dialog');
            sidebar.setAttribute('aria-modal', 'true');
            sidebar.removeAttribute('aria-hidden');
            sidebar.inert = false;
            if (main) main.inert = true;
        } else {
            sidebar.removeAttribute('role');
            sidebar.removeAttribute('aria-modal');
            sidebar.setAttribute('aria-hidden', 'true');
            sidebar.inert = true;
            if (main) main.inert = false;
        }
    }

    /**
     * تحديث حالة زر فتح القائمة في شريط الجوال
     */
    setDrawerExpanded(expanded) {
        const menuButton = document.getElementById('appMenuBtn');
        if (!menuButton) return;
        const isOpen = Boolean(expanded);
        menuButton.setAttribute('aria-expanded', String(isOpen));
        menuButton.setAttribute('aria-label', isOpen ? 'إغلاق القائمة' : 'فتح القائمة');
        menuButton.setAttribute('aria-haspopup', 'dialog');
    }

    /**
     * العناصر القابلة للتركيز داخل الدرج
     */
    drawerFocusables() {
        const sidebar = document.getElementById('appSidebarHost');
        if (!sidebar) return [];
        return [...sidebar.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, summary, [tabindex]:not([tabindex="-1"])')]
            .filter(el => el.offsetParent !== null || el === document.activeElement);
    }

    /**
     * حبس التركيز داخل الدرج المفتوح حتى لا يتوه مستخدم لوحة المفاتيح في الصفحة خلفه
     */
    trapDrawerFocus(event) {
        if (event.key !== 'Tab' || !this.isSidebarOpen) return;
        const focusables = this.drawerFocusables();
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && (active === first || !document.getElementById('appSidebarHost').contains(active))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (active === last || !document.getElementById('appSidebarHost').contains(active))) {
            event.preventDefault();
            first.focus();
        }
    }

    /**
     * إغلاق الدرج بسحب الإصبع نحو الحافة (اتجاه RTL: نحو اليمين)
     */
    bindDrawerSwipe(sidebarEl) {
        let startX = 0, startY = 0, tracking = false;
        sidebarEl.addEventListener('touchstart', event => {
            if (!this.isSidebarOpen || event.touches.length !== 1) return;
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
            tracking = true;
        }, { passive: true });
        sidebarEl.addEventListener('touchmove', event => {
            if (!tracking) return;
            const dx = event.touches[0].clientX - startX;
            const dy = Math.abs(event.touches[0].clientY - startY);
            if (dy > 60) { tracking = false; return; }
            if (dx > 64) { tracking = false; this.closeSidebar(); }
        }, { passive: true });
        sidebarEl.addEventListener('touchend', () => { tracking = false; }, { passive: true });
        sidebarEl.addEventListener('touchcancel', () => { tracking = false; }, { passive: true });
    }

    /**
     * التبديل بين فتح وإغلاق الدرج الجانبي
     */
    toggleSidebar(trigger = null) {
        if (this.isSidebarOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar(trigger);
        }
    }

    /**
     * فتح/إغلاق لوحة اختيار اللوحات داخل الشريط (بلا نوافذ منبثقة)
     * @param {boolean} [force]
     */
    toggleBoardPicker(force) {
        this.boardPickerOpen = typeof force === 'boolean' ? force : !this.boardPickerOpen;
        this.renderSidebar();
        const target = document.getElementById(this.boardPickerOpen ? 'boardPickerSearch' : 'boardSwitcherBtn');
        target?.focus({ preventScroll: true });
    }

    /**
     * تحميل لوحات المستخدم من قاعدة البيانات وتخزينها
     * @param {string} uid
     * @returns {Promise<Array>}
     */
    async loadUserBoards(uid) {
        const request = ++this.boardsRequest;
        if (!uid) { this.userBoards = []; this.boardsUid = null; return []; }
        try {
            const boards = await this.boards.listMine(uid);
            if (request === this.boardsRequest && this.authState.user()?.uid === uid) {
                this.userBoards = boards;
                this.boardsUid = uid;
            }
        } catch (error) {
            if (request === this.boardsRequest) { this.userBoards = []; this.boardsUid = null; }
            console.error('Failed to load user boards for sidebar:', error);
        }
        return this.userBoards;
    }

    /**
     * إعادة تحميل لوحات المستخدم وتحديث مظهر الشريط الجانبي
     * @param {string} [uid]
     */
    async refreshUserBoards(uid = this.authState.user()?.uid) {
        if (uid) {
            await this.loadUserBoards(uid);
        } else {
            this.userBoards = [];
        }
        this.renderSidebar();
    }

    /**
     * تحديث حالة التنقل النشطة بسلاسة وبدون إعادة بناء الـ DOM
     * @param {string} activeKey مفتاح الصفحة النشطة
     * @param {Object} [options]
     * @param {Object} [options.activeBoard] اللوحة النشطة إن وجدت
     * @param {Object} [options.user]
     * @param {string} [options.activeStudentId] الطالب المعروض في مسار ملف الطالب
     */
    updateNavigation(activeKey = '', { activeBoard = null, user = undefined, activeStudentId = null } = {}) {
        this.locationTrail = null;
        this.currentActiveKey = activeKey;
        if (activeBoard !== undefined) {
            this.activeBoard = activeBoard;
        }

        this.syncStudentsNavScope(activeKey, activeStudentId);
        this.boardPickerOpen = false;

        const currentUser = user !== undefined ? user : this.authState.user();
        if (currentUser && this.boardsUid !== currentUser.uid) {
            this.refreshUserBoards(currentUser.uid);
        }

        // إغلاق الدرج المنزلق إن كان مفتوحاً
        this.closeSidebar();

        this.renderSidebar(currentUser);
    }

    /**
     * يبقي قسم الطلاب مرتبطاً باللوحة النشطة فقط: يحدّث الطالب المعروض
     * أو يخفي القسم عند مغادرة مسارات اللوحة.
     * @param {string} activeKey
     * @param {string|null} activeStudentId
     */
    syncStudentsNavScope(activeKey, activeStudentId = null) {
        const sameBoard = this.studentsNav
            && this.activeBoard
            && String(this.studentsNav.boardId) === String(this.activeBoard.id);

        if (!STUDENT_NAV_KEYS.has(activeKey) || !sameBoard) {
            this.studentsNav = null;
            return;
        }
        this.studentsNav.activeStudentId = activeStudentId ? String(activeStudentId) : '';
        this.studentsNav.ownerView = activeKey !== 'board-public';
    }

    /**
     * تحديث سياق اللوحة النشطة في الشريط الجانبي وتحديث قائمة اللوحات إن لزم
     * @param {Object|null} board
     */
    setActiveBoard(board) {
        if (board?.id) {
            // بعض الصفحات تمرّر كائنًا مختصرًا (المعرّف والاسم فقط)؛ نفضّل نسخة المستودع
            // الكاملة حتى يعرف الشريط المالك وعدد الطلاب وحالة الخصوصية.
            const known = this.userBoards.find(b => String(b.id) === String(board.id));
            this.activeBoard = board.settings ? board : known || board;

            const idx = this.userBoards.findIndex(b => String(b.id) === String(board.id));
            if (idx !== -1) {
                this.userBoards[idx] = board.settings ? board : this.userBoards[idx];
            } else if (board.ownerUid && board.ownerUid === this.authState.user()?.uid) {
                this.userBoards.unshift(board);
            }
        } else {
            this.activeBoard = board || null;
        }

        if (this.studentsNav && (!this.activeBoard || String(this.studentsNav.boardId) !== String(this.activeBoard.id))) {
            this.studentsNav = null;
        }
        this.renderSidebar();
    }

    /**
     * عرض شاشة الخطأ التفاعلية لمنع انسداد المستخدم
     * @param {HTMLElement} contentContainer
     * @param {Error} error
     * @param {() => void} [retryFn]
     */
    renderError(contentContainer, error, retryFn) {
        console.error('AppLayout error:', error);
        const signedIn = Boolean(this.authState.user());
        contentContainer.replaceChildren(createFeedbackState({
            type: 'error',
            icon: '⚠️',
            eyebrow: 'تعذر تحميل الصفحة',
            title: 'حدث خطأ غير متوقع',
            message: 'نعتذر عن هذا الخلل. يمكنك تحديث الصفحة أو العودة إلى لوحاتك أو الصفحة الرئيسية.',
            actions: [
                ...(retryFn ? [{ label: 'إعادة المحاولة', onClick: retryFn, primary: true }] : []),
                signedIn ? { label: 'لوحاتي', href: '/dashboard', primary: !retryFn } : { label: 'العودة للرئيسية', href: '/', primary: !retryFn },
                { label: 'مكتبة الأوسمة', href: '/badges' },
            ]
        }));
    }

    /**
     * إعادة إعلان عنوان الصفحة الحالية (للصفحات التي تحدّث العنوان بعد التحميل)
     */
    announcePage() {
        const announcer = document.getElementById('routeAnnouncer');
        if (announcer) announcer.textContent = document.title;
    }
}
