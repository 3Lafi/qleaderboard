// One information hierarchy for desktop, phone and board navigation.
const teacherDestinations = [
    { key: 'dashboard', href: '/dashboard', label: 'لوحاتي', icon: 'boards' },
    { key: 'cohorts', href: '/cohorts', label: 'الدفعات', icon: 'cohorts' },
    { key: 'badges', href: '/badges', label: 'الأوسمة', icon: 'badges' },
];
const guestDestinations = [
    { key: 'home', href: '/', label: 'الرئيسية', icon: 'home' },
    { key: 'badges', href: '/badges', label: 'الأوسمة', icon: 'badges' },
    { key: 'login', href: '/login', label: 'تسجيل الدخول', icon: 'login' },
];

export function primaryDestinations(user) {
    return user ? teacherDestinations : guestDestinations;
}

export function primarySection(activeKey, user, board = null) {
    if (activeKey === 'cohort-detail') return 'cohorts';
    if (activeKey === 'board-public' && isBoardOwner(board, user)) return 'dashboard';
    if (user && ['new', 'board-students', 'board-settings'].includes(activeKey)) return 'dashboard';
    return activeKey;
}

export function isBoardOwner(board, user) {
    return Boolean(board?.ownerUid && user?.uid && String(board.ownerUid) === String(user.uid));
}

export function boardDestinations(board, user) {
    if (!board?.id || !board.settings) return [];
    const id = encodeURIComponent(board.id);
    const owner = isBoardOwner(board, user);
    return [
        ...(owner ? [{ key: 'board-students', href: `/edit/${id}/students`, label: 'جدول المتابعة', icon: 'sheet' }] : []),
        ...(board.settings?.isPublic !== false ? [{ key: 'board-public', href: `/b/${id}`, label: owner ? 'عرض اللوحة' : 'الطلاب', icon: 'publicView' }] : []),
        ...(owner ? [{ key: 'board-settings', href: `/edit/${id}`, label: 'إعدادات اللوحة', icon: 'settings' }] : []),
    ];
}

export function navigationTitle(activeKey) {
    return ({ home: 'الرئيسية', dashboard: 'لوحاتي', cohorts: 'الدفعات', 'cohort-detail': 'الدفعة', badges: 'الأوسمة', login: 'تسجيل الدخول', new: 'لوحة جديدة', 'board-students': 'جدول المتابعة', 'board-public': 'عرض اللوحة', 'board-settings': 'إعدادات اللوحة', 'not-found': 'الصفحة غير موجودة' })[activeKey] || 'وسام';
}
