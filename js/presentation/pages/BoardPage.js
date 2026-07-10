// اللوحة العامة: يعرضها أي شخص لديه الرابط دون تسجيل دخول
import { BoardRepository } from '../../data/repositories/BoardRepository.js';
import { Student } from '../../domain/models/Student.js';
import { rankStudents } from '../../domain/usecases/RankStudents.js';
import { bannerHeader, copyToClipboard, boardShareUrl, skeletonCards, toast } from '../views/ui.js';
import { renderStudentCard } from '../views/StudentCardView.js';
import { renderClassProgress } from '../views/ClassProgressView.js';

export default function BoardPage(container, { params }) {
    const boardId = params.boardId;
    let firstLoad = true;

    container.innerHTML = `
        <div id="pageRoot">
            ${bannerHeader({
                title: 'جارِ التحميل...',
                extraHtml: `<div id="classProgressContainer" class="merged-progress-container" style="display:none;"></div>`,
            })}
            <div style="display:flex; justify-content:center; margin: -20px 0 25px 0;">
                <button class="btn btn-secondary btn-sm" id="shareBtn" style="display:none;">🔗 مشاركة اللوحة</button>
            </div>
            ${skeletonCards(3)}
            <main id="studentsGrid" class="grid"></main>
            <div id="error-msg">
                <p>هذه اللوحة غير متاحة حالياً.</p>
            </div>
        </div>
    `;

    const unsubscribe = BoardRepository.watch(boardId, board => {
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
        const skeleton = container.querySelector('.skeleton-wrapper');
        if (skeleton) skeleton.style.display = 'none';
        const errorBox = container.querySelector('#error-msg');
        if (errorBox) {
            errorBox.style.display = 'block';
            if (message) errorBox.querySelector('p').textContent = message;
        }
    }

    function renderBoard(board) {
        document.title = `${board.settings.name} — لوحة حفظ القرآن`;

        const header = container.querySelector('header');
        header.querySelector('.banner-title').textContent = board.settings.name || 'لوحة حفظ القرآن';
        let subtitleEl = header.querySelector('.banner-subtitle');
        const subtitleText = [board.settings.schoolName, board.settings.classLabel].filter(Boolean).join(' — ');
        if (subtitleText) {
            if (!subtitleEl) {
                const sep = document.createElement('div');
                sep.className = 'banner-separator';
                const sub = document.createElement('div');
                sub.className = 'banner-subtitle';
                header.querySelector('.header-icon').after(sep, sub);
                subtitleEl = sub;
            }
            subtitleEl.textContent = subtitleText;
        }

        const shareBtn = container.querySelector('#shareBtn');
        shareBtn.style.display = 'inline-flex';
        shareBtn.onclick = async () => {
            const url = boardShareUrl(board.id);
            if (navigator.share) {
                try { await navigator.share({ title: board.settings.name, url }); return; } catch { /* المستخدم ألغى المشاركة */ }
            }
            copyToClipboard(url);
        };

        const orderedScope = board.orderedSurahs();
        const students = Object.entries(board.students).map(([id, data]) => new Student(id, data, orderedScope));
        const ranked = rankStudents(students);

        const skeleton = container.querySelector('.skeleton-wrapper');
        if (skeleton) skeleton.style.display = 'none';
        container.querySelector('#error-msg').style.display = 'none';

        renderClassProgress(board, students);

        const grid = container.querySelector('#studentsGrid');
        grid.innerHTML = '';
        if (ranked.length === 0) {
            grid.innerHTML = '<p style="text-align:center; width:100%; font-size:1.2rem; font-weight:bold;">لا توجد بيانات لهذه اللوحة حتى الآن.</p>';
            return;
        }
        ranked.forEach((student, idx) => {
            grid.appendChild(renderStudentCard(student, idx + 1));
        });
    }

    return unsubscribe;
}
