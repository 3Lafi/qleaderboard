import { publicStudentProfile, ownerStudentProfile } from '../../domain/usecases/StudentProfile.js';
import { evaluateBadges } from '../../domain/usecases/Badges.js';
import { escapeHtml } from '../views/ui.js';
import { badgeCard, bindBadgeDetails } from '../views/BadgeView.js';
import { completionMedal } from '../views/CompletionMedalView.js';
import { matchesQueryNameOrNumber } from '../../shared/text-utils.js';
import { createFeedbackState } from '../layout/FeedbackStateView.js';
import { findStudentPrograms } from '../../domain/usecases/StudentPrograms.js';

export default function StudentProfilePage(container, { params = {}, layout, user, services, setTitle, signal, ownerView }) {
    const BoardRepository = services.boards;
    const boardId = params.boardId;
    const studentId = params.studentId;
    const backHref = ownerView ? `/edit/${boardId}/students` : `/b/${boardId}`;
    let type = 'all', query = '', includeLocked = false, badges = [];

    // برامج الطالب الأخرى: ما حفظه في أي لوحة أخرى يظهر هنا وفي أوسمته
    let crossPrograms = [];
    let crossMemorized = [];
    let latestBoard = null;
    let latestProfile = null;
    const crossWatchers = [];


    async function loadCrossPrograms(board) {
            const entry = board?.students?.[studentId];
        if (!user || !entry || board?.ownerUid !== user.uid || !entry.cohortStudentId) return false;
        try {
            const mine = await BoardRepository.listMine(user.uid);
            if (signal.aborted) return false;
            const programs = findStudentPrograms(mine, entry.cohortStudentId).filter(p => p.boardId !== board.id);
            crossPrograms = programs;
            mergeCross();
            // متابعة مباشرة لبقية البرامج حتى يظهر أي تغيير فوراً
            for (const program of programs) {
                if (crossWatchers.some(w => w.boardId === program.boardId)) continue;
                const unsubscribe = BoardRepository.watch(program.boardId, updated => {
                    if (!updated) return;
                    crossPrograms = crossPrograms.map(existing => existing.boardId === updated.id
                        ? { ...existing, memorized: updated.students?.[existing.studentId]?.memorized || [] }
                        : existing);
                    mergeCross();
                    if (latestProfile) render(latestProfile);
                }, () => {});
                crossWatchers.push({ boardId: program.boardId, unsubscribe });
            }
            return true;
        } catch (error) {
            console.error('cross programs failed', error);
            return false;
        }
    }

    function mergeCross() {
        const set = new Set();
        crossPrograms.forEach(program => (program.memorized || []).forEach(n => {
            if (Number.isInteger(n) && n >= 1 && n <= 114) set.add(n);
        }));
        crossMemorized = [...set].sort((a, b) => a - b);
    }

    setTitle('ملف الطالب — وسام');
    container.innerHTML = `
        <section class="student-profile">
            <div id="studentProfileContent">
                <p role="status">جارِ تحميل ملف الطالب…</p>
            </div>
        </section>
    `;

    const host = container.querySelector('#studentProfileContent');
    const closeDetails = () => container.querySelectorAll('.badge-dialog').forEach(dialog => dialog.close());

    function unavailable(error = false) {
        badges = [];
        setTitle('ملف الطالب غير متاح — وسام');
        layout?.announcePage?.();

        host.replaceChildren(createFeedbackState({
            type: error ? 'error' : 'unavailable',
            icon: error ? '⚠️' : '🔒',
            eyebrow: 'ملف الطالب',
            title: 'ملف الطالب غير متاح',
            message: error ? 'تعذر تحميل ملف الطالب في الوقت الحالي. حاول مرة أخرى.' : 'قد تكون اللوحة خاصة أو لم يعد الطالب مسجلاً فيها.',
            actions: [
                { label: 'العودة للوحة', href: backHref, primary: true },
                { label: 'مكتبة الأوسمة', href: '/badges' },
                { label: 'الرئيسية', href: '/' }
            ]
        }));
        closeDetails();
    }

    function renderCollection() {
        const matches = badges.filter(b =>
            (includeLocked || b.earned) &&
            (type === 'all' || b.type === type) &&
            matchesQueryNameOrNumber(b, query)
        );

        const countEl = host.querySelector('#profileResultCount');
        if (countEl) countEl.textContent = `${matches.length} وسام`;

        const grid = host.querySelector('#profileBadgeGrid');
        if (!grid) return;

        grid.innerHTML = matches.length
            ? matches.map(b => badgeCard(b)).join('')
            : `<div class="empty-search">
                   <h3>${query ? 'لا توجد أوسمة مطابقة' : 'هذه المجموعة تنتظر إنجازك'}</h3>
                   <p>${query ? 'جرّب اسماً أو رقماً آخر.' : 'تظهر الأوسمة هنا عندما يسجل المعلم الحفظ.'}</p>
                   <button class="btn btn-secondary" id="resetProfileFilter">${query ? 'مسح البحث' : 'استكشف الأوسمة القادمة'}</button>
               </div>`;

        bindBadgeDetails(grid, matches, { signal });

        grid.querySelector('#resetProfileFilter')?.addEventListener('click', () => {
            const hadQuery = Boolean(query);
            if (hadQuery) {
                query = '';
                const searchEl = host.querySelector('#profileBadgeSearch');
                if (searchEl) searchEl.value = '';
            } else {
                includeLocked = true;
                const checkEl = host.querySelector('#includeLockedBadges');
                if (checkEl) checkEl.checked = true;
            }
            renderCollection();
            const focusTarget = host.querySelector(hadQuery ? '#profileBadgeSearch' : '#includeLockedBadges');
            focusTarget?.focus();
        });
    }

    function render(profile) {
        if (!profile || !profile.student) {
            unavailable();
            return;
        }
        closeDetails();

        const { student, rank, boardName, students = [profile.student] } = profile;
        const focused = document.activeElement?.id;
        const ownSurahs = student.effectiveMemorized || student.memorized;
        const allSurahs = [...new Set([...ownSurahs, ...crossMemorized])].sort((a, b) => a - b);
        badges = evaluateBadges(allSurahs);
        const earned = badges.filter(b => b.earned);
        const counts = Object.fromEntries(['quran', 'juz', 'surah'].map(t => [t, earned.filter(b => b.type === t).length]));

        setTitle(`${student.name} — ملف الطالب — وسام`);
        layout?.setActiveBoard(latestBoard);
        layout?.setStudentsNav({
            boardId,
            boardName,
            activeStudentId: studentId,
            ownerView,
            students: students.map((entry, index) => ({
                id: entry.id,
                name: entry.name,
                rank: entry.rank ?? (index + 1),
                progress: entry.progress,
                completed: entry.isCompleted,
            })),
        });

        host.classList.toggle('profile-complete', student.isCompleted);
        host.innerHTML = `
            <section class="profile-masthead" aria-labelledby="studentProfileName">
                <div class="profile-title-copy">
                    <a class="profile-board-name" href="${backHref}">${escapeHtml(boardName)}</a>
                    <h1 id="studentProfileName">${escapeHtml(student.name)}</h1>
                    <div class="profile-facts">
                        <span>الترتيب <bdi class="numeric-value">${rank}</bdi> <span class="profile-fact-total">/ <bdi class="numeric-value">${students.length}</bdi></span></span>
                        <span><bdi class="numeric-value">${student.surahsCount}</bdi> سورة محفوظة في البرنامج</span>
                        <span><bdi class="numeric-value">${earned.length}</bdi> وسام مكتسب</span>
                    </div>
                </div>
                <div class="profile-personal-mark" ${student.isCompleted ? 'role="img" aria-label="تاج الإنجاز — إتمام خطة الحفظ"' : 'aria-hidden="true"'}>
                    ${student.isCompleted ? completionMedal() : escapeHtml(Array.from(student.name.trim())[0] || 'و')}
                </div>
            </section>
            <div class="profile-collection-heading">
                <h2>أوسمة الطالب</h2>
                <span><bdi class="numeric-value">${earned.length}</bdi> وساماً مكتسباً</span>
            </div>
            <div class="profile-collection-tools">
                <div class="profile-levels" role="group" aria-label="مستوى أوسمة الطالب">
                    ${[['all', 'جميع الأوسمة', earned.length], ['quran', 'القرآن', counts.quran], ['juz', 'الأجزاء', counts.juz], ['surah', 'السور', counts.surah]].map(([key, label, count]) =>
                        `<button data-profile-level="${key}" aria-pressed="${key === type}">${label}<span>${count}</span></button>`
                    ).join('')}
                </div>
                <label class="badge-search">
                    <span>بحث</span>
                    <input id="profileBadgeSearch" type="search" aria-label="ابحث في أوسمة الطالب" placeholder="اسم الوسام أو رقمه…" value="${escapeHtml(query)}">
                </label>
            </div>
            <div class="profile-collection-options">
                <label><input id="includeLockedBadges" type="checkbox" ${includeLocked ? 'checked' : ''}> إظهار الأوسمة القادمة</label>
                <span id="profileResultCount" role="status" aria-live="polite"></span>
            </div>
            <div class="achievement-grid profile-badge-grid" id="profileBadgeGrid"></div>
        `;

        host.querySelectorAll('[data-profile-level]').forEach(button => button.addEventListener('click', () => {
            type = button.dataset.profileLevel;
            host.querySelectorAll('[data-profile-level]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
            renderCollection();
        }));

        host.querySelector('#profileBadgeSearch').addEventListener('input', e => {
            query = e.target.value;
            renderCollection();
        });

        host.querySelector('#includeLockedBadges').addEventListener('change', e => {
            includeLocked = e.target.checked;
            renderCollection();
        });

        renderCollection();
        if (focused) host.querySelector(`#${CSS.escape(focused)}`)?.focus();
    }

    if (!boardId || !studentId) {
        unavailable();
        return closeDetails;
    }

    let crossLoaded = false;
    const unsubscribe = BoardRepository.watch(
        boardId,
        board => {
            latestBoard = board;
            const profile = ownerView ? ownerStudentProfile(board, studentId, user?.uid) : publicStudentProfile(board, studentId);
            latestProfile = profile;
            render(profile);
            // بعد أول رسم نحمّل بقية برامج الطالب (للمعلم فقط) ثم نعيد الرسم
            if (!crossLoaded && board) {
                crossLoaded = true;
                loadCrossPrograms(board).then(loaded => { if (loaded && latestProfile) render(latestProfile); });
            }
        },
        () => unavailable(true)
    );

    return () => {
        unsubscribe();
        crossWatchers.forEach(w => { try { w.unsubscribe(); } catch (_) {} });
        closeDetails();
    };
}
