// اللوحة العامة: يعرضها أي شخص لديه الرابط مع إمكانية التنقل والاستكشاف
import { Student } from '../../domain/models/Student.js';
import { rankStudents } from '../../domain/usecases/RankStudents.js';
import { resolvePriorSurahs } from '../../domain/usecases/PriorMemorization.js';
import { bannerHeader, skeletonCards } from '../views/ui.js';
import { renderStudentCard } from '../views/StudentCardView.js';
import { bannerTheme } from '../../shared/banner-themes.js';
import { matchesStudentName } from '../../shared/text-utils.js';
import { createFeedbackState } from '../layout/FeedbackStateView.js';

export default function BoardPage(container, { toast, params, layout, user, services, setTitle }) {
    const BoardRepository = services.boards;
    const boardId = params.boardId;
    let firstLoad = true;
    let rankedStudents = [];
    let searchText = '', studentFilter = 'all';
    let board = null;

    function mountBoard() {
    container.innerHTML = `
        <div id="pageRoot" class="public-board">
            ${bannerHeader({
                title: 'جارِ التحميل...',
                className: 'board-banner',
            })}
            ${skeletonCards(3)}
            <div class="board-tools">
                <div>
                    <h2>رحلة طلابنا</h2>
                    <p id="studentCount"></p>
                </div>
                <label class="badge-search">
                    <span>الطالب</span>
                    <input type="search" id="boardStudentSearch" aria-label="ابحث عن طالب في اللوحة" placeholder="ابحث عن طالب…">
                </label>
            </div>
            <div class="board-student-filters" role="group" aria-label="تصفية الطلاب">
                <button type="button" data-student-filter="all" aria-pressed="true">الجميع <span id="countAll" class="numeric-value">0</span></button>
                <button type="button" data-student-filter="completed" aria-pressed="false">أتموا الحفظ <span id="countCompleted" class="numeric-value">0</span></button>
                <button type="button" data-student-filter="learning" aria-pressed="false">يواصلون الحفظ <span id="countLearning" class="numeric-value">0</span></button>
            </div>
            <section id="studentsGrid" class="grid"></section>
        </div>
    `;

    container.querySelector('#boardStudentSearch').addEventListener('input', e => {
        searchText = e.target.value;
        renderStudents();
    });

    container.querySelector('.board-student-filters').addEventListener('click', event => {
        const button = event.target.closest('[data-student-filter]');
        if (!button) return;
        studentFilter = button.dataset.studentFilter;
        renderStudents();
    });

    }
    mountBoard();

    const unsubscribe = BoardRepository.watch(boardId, incoming => {
        board = incoming;
        if (!board) {
            showUnavailable();
            return;
        }
        if (!board.settings.isPublic) {
            showUnavailable('هذه اللوحة خاصة ولا يمكن عرضها بهذا الرابط.');
            return;
        }
        renderBoard(board);
        firstLoad = false;
    }, err => {
        console.error(err);
        if (firstLoad) showUnavailable();
        else toast('تعذر تحديث البيانات — يعرض آخر نسخة محفوظة', 'error');
    });

    function showUnavailable(message) {
        rankedStudents = [];
        setTitle('اللوحة غير متاحة — وسام');
        // نُبقي سياق اللوحة في الشريط الجانبي حتى يعرف المستخدم أين هو
        layout?.setActiveBoard(board?.ownerUid === user?.uid ? board : null);
        layout?.setStudentsNav(null);
        layout?.announcePage?.();

        const signedIn = Boolean(user);
        container.replaceChildren(createFeedbackState({
            type: 'unavailable',
            icon: '🔒',
            eyebrow: 'لوحة خاصة أو غير موجودة',
            title: 'اللوحة غير متاحة',
            message: message || 'قد تكون هذه اللوحة خاصة بالمعلم أو أن الرابط المطلوب غير صحيح.',
            actions: [
                { label: 'العودة للرئيسية', href: '/', primary: true },
                { label: 'مكتبة الأوسمة', href: '/badges' },
                signedIn ? { label: 'لوحاتي', href: '/dashboard' } : { label: 'تسجيل الدخول', href: '/login' },
            ]
        }));
    }

    function renderBoard(board) {
        if (!container.querySelector('#pageRoot')) mountBoard();
        setTitle(`${board.settings.name} — لوحة حفظ القرآن`);
        layout?.setActiveBoard(board);

        const tools = container.querySelector('.board-tools');
        const filters = container.querySelector('.board-student-filters');
        if (tools) tools.hidden = false;
        if (filters) filters.hidden = false;

        const header = container.querySelector('header');
        if (!header) return;

        const theme = bannerTheme(board.settings.banner?.themeId);
        header.style.setProperty('--banner-gradient', theme.gradient);
        header.style.setProperty('--banner-shadow', theme.shadow);
        // لون اللوحة ينعكس على اللوحة كاملة: البطاقات والخطوط والأشرطة تأخذ نفس اللون
        const pageRoot = container.querySelector('#pageRoot');
        if (pageRoot) {
            pageRoot.style.setProperty('--board-accent', theme.accent);
            pageRoot.style.setProperty('--board-accent-soft', theme.accentSoft);
            pageRoot.style.setProperty('--board-accent-ink', theme.accentInk);
        }
        header.querySelector('.banner-title').textContent = board.settings.name || 'لوحة حفظ القرآن';

        let subtitleEl = header.querySelector('.banner-subtitle');
        const subtitleText = [board.settings.schoolName, board.settings.classLabel].filter(Boolean).join(' — ');
        if (subtitleText) {
            if (!subtitleEl) {
                const sep = document.createElement('div');
                sep.className = 'banner-separator';
                const sub = document.createElement('div');
                sub.className = 'banner-subtitle';
                header.querySelector('.banner-title').after(sep, sub);
                subtitleEl = sub;
            }
            subtitleEl.textContent = subtitleText;
        } else {
            subtitleEl?.remove();
            header.querySelector('.banner-separator')?.remove();
        }

        const orderedScope = board.orderedSurahs();
        const students = Object.entries(board.students).map(([id, data]) =>
            new Student(id, data, orderedScope, resolvePriorSurahs(board, data)));
        rankedStudents = rankStudents(students);
        layout?.setStudentsNav({
            boardId,
            boardName: board.settings.name,
            linkable: true,
            students: rankedStudents.map((student, index) => ({
                id: student.id,
                name: student.name,
                rank: index + 1,
                progress: student.progress,
                completed: student.isCompleted,
            })),
        });
        container.querySelector('#studentCount').textContent = rankedStudents.length
            ? `${rankedStudents.length} طالب · افتح ملف الطالب لاستكشاف أوسمته`
            : 'لا يوجد طلاب في هذه اللوحة بعد';

        const skeleton = container.querySelector('.skeleton-wrapper');
        if (skeleton) skeleton.style.display = 'none';

        renderStudents();
    }

    function renderStudents() {
        const grid = container.querySelector('#studentsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const completed = rankedStudents.filter(s => s.isCompleted).length;
        container.querySelector('#countAll').textContent = rankedStudents.length;
        container.querySelector('#countCompleted').textContent = completed;
        container.querySelector('#countLearning').textContent = rankedStudents.length - completed;
        container.querySelectorAll('[data-student-filter]').forEach(b =>
            b.setAttribute('aria-pressed', String(b.dataset.studentFilter === studentFilter))
        );

        const matches = rankedStudents.map((student, i) => ({ student, rank: i + 1 })).filter(({ student }) =>
            matchesStudentName(student.name, searchText) &&
            (studentFilter === 'all' || (studentFilter === 'completed' ? student.isCompleted : !student.isCompleted))
        );

        if (!matches.length) {
            grid.innerHTML = `
                <div class="empty-search">
                    <p>${rankedStudents.length ? 'لا يوجد طلاب مطابقون لهذا الاختيار.' : 'لا توجد بيانات لهذه اللوحة حتى الآن.'}</p>
                    ${rankedStudents.length ? '<button type="button" class="btn btn-secondary" id="clearStudentSearch">عرض جميع الطلاب</button>' : ''}
                </div>`;
            grid.querySelector('#clearStudentSearch')?.addEventListener('click', () => {
                searchText = '';
                studentFilter = 'all';
                const input = container.querySelector('#boardStudentSearch');
                if (input) { input.value = ''; input.focus(); }
                renderStudents();
            });
            return;
        }

        matches.forEach(({ student, rank }) =>
            grid.appendChild(renderStudentCard(student, rank, { profileHref: `/b/${boardId}/students/${student.id}` }))
        );
    }

    return unsubscribe;
}
