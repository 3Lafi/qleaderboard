import { escapeHtml, formatProgress } from './ui.js';
import { earnedBadges } from '../../domain/usecases/Badges.js';
import { uiIcon } from './InterfaceIcons.js';
import { completionMedal } from './CompletionMedalView.js';

export function renderStudentCard(student, rank, { profileHref } = {}) {
    const progress=Math.max(0,Math.min(100,student.progress));
    const complete=student.isCompleted;
    const count=earnedBadges(student.effectiveMemorized || student.memorized).length;
    const card=document.createElement('article');
    card.className=`card student-summary student-journey ${complete?'gold-card':''}`;
    card.innerHTML=`
        <div class="student-card-identity"><h3 class="student-name">${escapeHtml(student.name)}</h3>${complete?`<button type="button" class="completion-crown" aria-label="تاج الإنجاز — تهنئة ${escapeHtml(student.name)} بإنجاز المنهج" aria-expanded="false">${completionMedal()}</button>`:''}</div>
        ${complete?'<div class="completion-message" hidden><strong>تاج الإنجاز</strong><p>هنيئاً لك إتمام خطة الحفظ!</p></div>':''}
        <div class="student-progress-label"><span><bdi class="numeric-value">${student.surahsCount}</bdi> من <bdi class="numeric-value">${student.totalSurahsInScope}</bdi> سورة</span><strong><bdi class="numeric-value">${formatProgress(progress)}</bdi><small>٪</small></strong></div>
        <div class="progress-container" role="progressbar" aria-label="تقدم حفظ ${escapeHtml(student.name)}" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${progress}%"></div></div>
        ${profileHref?`<a class="student-profile-link" href="${escapeHtml(profileHref)}" aria-label="ملف ${escapeHtml(student.name)}، ${count} وساماً مكتسباً"><span class="student-earned-count"><bdi class="numeric-value">${count}</bdi><span>وساماً مكتسباً</span></span><span class="student-profile-action">ملف الطالب ${uiIcon('arrow-left')}</span></a>`:''}`;
    const crown=card.querySelector('.completion-crown');
    if(crown) {
        const message=card.querySelector('.completion-message');
        message.id=`completion-${student.id}`;crown.setAttribute('aria-controls',message.id);
        crown.addEventListener('click',()=>{
            const expanded=crown.getAttribute('aria-expanded')!=='true';
            crown.setAttribute('aria-expanded',String(expanded));message.hidden=!expanded;
            card.classList.toggle('completion-celebrating',expanded);
        });
    }
    return card;
}
