// معاينة تطوير محلية فقط؛ يستبدل جميع عمليات المستودع ولا يصل إلى بيانات Firestore.
import { createRouter } from '../../js/presentation/navigation/BrowserRouter.js';
const authListeners = new Set();
let currentUser;
const authState = { user: () => currentUser, ready: async () => {}, subscribe(cb) { authListeners.add(cb); return () => authListeners.delete(cb); } };
function setUser(user) { currentUser = user; authListeners.forEach(cb => cb(user)); }
import { AppLayoutManager } from '../../js/presentation/layout/AppLayout.js';
const BoardRepository = {};
import { Leaderboard } from '../../js/domain/models/Leaderboard.js';
import { defaultSettings } from '../../js/domain/models/BoardSettings.js';
import { expandScope } from '../../js/shared/quran-data.js';
if (!['localhost','127.0.0.1'].includes(location.hostname)) throw Error('Local preview only');
const fixtureSearch = location.search;
const user = { uid:'qa-only', displayName:'معلم تجريبي', email:'teacher@example.test' };
currentUser = user;
// المعاينة لا تراقب جلسة Firebase حقيقية حتى لا تطغى على المستخدم التجريبي

const defaultScope = defaultSettings().scope.surahNumbers;
const fixture = { ownerUid:user.uid, settings:{...defaultSettings(), name:'حلقة النور', schoolName:'مدرسة وسام التجريبية', classLabel:'المستوى الأول'}, students:{alpha:{name:'طالب تجريبي ١',memorized:[112,113,114]}, beta:{name:'طالب تجريبي ٢',memorized:defaultScope}, gamma:{name:'طالب تجريبي ٣',memorized:[]}} };
const fixtureStudentCount=Math.min(150,Math.max(3,Number(new URLSearchParams(fixtureSearch).get('studentCount')) || 3));
for(let i=4;i<=fixtureStudentCount;i++)fixture.students[`student-${i}`]={name:`طالب متابعة ${String(i).padStart(3,'0')}`,memorized:[],completedDate:null};
if (new URLSearchParams(fixtureSearch).get('legacyScope') === 'custom') {
    fixture.settings.scope = {type:'custom',juzNumbers:[],curriculum:null,surahNumbers:[1,112,114]};
}
if(new URLSearchParams(fixtureSearch).get('completionScope')==='short') fixture.settings.scope={type:'custom',juzNumbers:[],curriculum:null,surahNumbers:[112,113,114]};
const progressCase = new URLSearchParams(fixtureSearch).get('progressCase');
if (progressCase === 'zero') Object.values(fixture.students).forEach(student => { student.memorized = []; });
if (progressCase === 'hidden') fixture.settings.showClassProgress = false;
if (progressCase === 'empty') fixture.students = {};
if (new URLSearchParams(fixtureSearch).get('privateBoard') === '1') fixture.settings.isPublic = false;
// برنامج جزء 29: طلاب انتقلوا من جزء 30 ولا يملكون محفوظاً في الخطة الحالية
if (new URLSearchParams(fixtureSearch).get('program') === 'juz29') {
    fixture.settings.scope = { type: 'juz', juzNumbers: [29], curriculum: null, surahNumbers: expandScope({ type: 'juz', juzNumbers: [29] }) };
    fixture.settings.direction = 'reverse';
    fixture.settings.priorMode = 'auto';
    Object.values(fixture.students).forEach(student => { student.memorized = []; });
}
if (new URLSearchParams(fixtureSearch).get('program') === 'juz29-noprior') {
    fixture.settings.scope = { type: 'juz', juzNumbers: [29], curriculum: null, surahNumbers: expandScope({ type: 'juz', juzNumbers: [29] }) };
    fixture.settings.direction = 'reverse';
    fixture.settings.priorMode = 'none';
    Object.values(fixture.students).forEach(student => { student.memorized = []; });
}
for (const key of Object.keys(BoardRepository)) BoardRepository[key] = async () => { throw Error(`Unexpected repository call: ${key}`); };
const board = () => new Leaderboard('qa-board', structuredClone(fixture));
// لوحات إضافية لاختبار الشريط الجانبي بمعلّم يملك عشرات اللوحات
const boardCount = Math.min(60, Math.max(1, Number(new URLSearchParams(fixtureSearch).get('boardCount')) || 1));
const extraBoards = Array.from({ length: boardCount - 1 }, (_, i) => {
    const n = i + 2;
    const extra = structuredClone(fixture);
    extra.settings.name = `حلقة ${['النور','الهدى','الفجر','البيان','الإتقان','الفرقان'][i % 6]} ${n}`;
    extra.students = Object.fromEntries(Object.entries(extra.students).slice(0, n % 7));
    return new Leaderboard(`qa-board-${n}`, extra);
});
BoardRepository.listMine = async () => [board(), ...extraBoards];
BoardRepository.get = async id => {
    const delay = Number(new URLSearchParams(fixtureSearch).get('loadDelay')) || 0;
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    return id === 'qa-board' ? board() : extraBoards.find(b => b.id === id) || null;
};
const watchers = new Set();
BoardRepository.watch = (id, cb) => { watchers.add(cb); queueMicrotask(()=>{ if(watchers.has(cb)) cb(id === 'qa-board' ? board() : extraBoards.find(b => b.id === id) || null); }); return ()=>watchers.delete(cb); };
const privateToggle = document.querySelector('#privateBoard');
if (privateToggle) privateToggle.onchange = event => { fixture.settings.isPublic = !event.target.checked; watchers.forEach(cb=>cb(board())); };
BoardRepository.setSurah = async (_boardId,id,n,selected) => {
    const delay=Math.min(1500,Math.max(0,Number(new URLSearchParams(fixtureSearch).get('saveDelay')) || 0));
    if(delay) await new Promise(resolve=>setTimeout(resolve,delay));
    const failure = document.querySelector('#failNext');
    if(failure?.checked) { failure.checked=false; throw Error('Simulated save failure'); }
    fixture.students[id].memorized = selected ? [...new Set([...fixture.students[id].memorized,n])] : fixture.students[id].memorized.filter(x=>x!==n);
};
BoardRepository.addStudent = async (_boardId,name,_count,extra={}) => { const id=`local-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;fixture.students[id]={name,memorized:[],...(extra.cohortStudentId?{cohortStudentId:extra.cohortStudentId}:{})};return id; };
// دفعات تجريبية للمعاينة
const cohortFixture = { id:'qa-cohort', ownerUid:user.uid, name:'دفعة 1447 — المستوى الأول', students:{ c1:{name:'أحمد سالم'}, c2:{name:'بدر ناصر'} }, programs:[{ boardId:'qa-board', linkedAt:new Date().toISOString() }] };
const CohortRepositoryStub = {
    listMine: async () => [new (await import('../../js/domain/models/Cohort.js')).Cohort(cohortFixture.id, cohortFixture)],
    get: async id => id === cohortFixture.id ? new (await import('../../js/domain/models/Cohort.js')).Cohort(cohortFixture.id, cohortFixture) : null,
    create: async (_uid, { name }) => { cohortFixture.name = name; return cohortFixture.id; },
    update: async (_id, { name }) => { if (name) cohortFixture.name = name; },
    addStudent: async (_id, name) => { const id=`c-${Date.now()}-${Math.random().toString(36).slice(2,5)}`; cohortFixture.students[id]={name}; return id; },
    linkProgram: async (_id, boardId) => { cohortFixture.programs = [...(cohortFixture.programs||[]).filter(p=>p.boardId!==boardId), { boardId, linkedAt: new Date().toISOString() }]; },
    unlinkProgram: async (_id, boardId) => { cohortFixture.programs = (cohortFixture.programs||[]).filter(p=>p.boardId!==boardId); },
    addStudents: async (_id, names) => names.map((name,i)=>{ const id=`c-${Date.now()}-${i}`; cohortFixture.students[id]={name}; return id; }),
    renameStudent: async (_id, sid, name) => { cohortFixture.students[sid].name = name; },
    removeStudent: async (_id, sid) => { delete cohortFixture.students[sid]; },
    delete: async () => {},
};
const CohortRepository = CohortRepositoryStub;
for (const key of Object.keys(CohortRepository)) CohortRepository[key] = CohortRepositoryStub[key] || (async () => { throw Error(`Unexpected cohort call: ${key}`); });
BoardRepository.renameStudent = async (_boardId,id,name)=>{fixture.students[id].name=name;};
BoardRepository.setStudentPrior = async (_boardId,id,surahs)=>{fixture.students[id].priorSurahs=[...(surahs||[])];};
BoardRepository.deleteStudent = async (_boardId,id)=>{delete fixture.students[id];};
function checkSaveFailure() {
    const failure = document.querySelector('#failNext');
    if (failure?.checked) { failure.checked = false; throw Error('Simulated save failure'); }
}
BoardRepository.create = async (_owner,settings)=>{checkSaveFailure();fixture.settings=settings;fixture.students={};return 'qa-board';};
BoardRepository.updateSettings = async (_id,settings)=>{checkSaveFailure();fixture.settings=settings;};

BoardRepository.delete = async () => { fixture.students = {}; };
const authentication = {
    signInGoogle: async () => setUser(user),
    signIn: async () => setUser(user),
    signUp: async (_email, _password, name) => setUser({ ...user, displayName: name || user.displayName }),
    resetPassword: async () => {},
    signOut: async () => setUser(null),
};
const services = { boards: BoardRepository, cohorts: CohortRepository, authentication };
const layout = new AppLayoutManager({ authState, ...services });
const previewRoutes = { dashboard:'/dashboard', students:'/edit/qa-board/students', new:'/new', settings:'/edit/qa-board', board:'/b/qa-board', profile:'/b/qa-board/students/alpha', landing:'/', login:'/login', badges:'/badges', cohorts:'/cohorts', cohort:'/cohorts/qa-cohort' };
const firstParams = new URLSearchParams(fixtureSearch);
const firstPage = firstParams.get('page') || 'dashboard';
if (firstParams.get('guest') === '1' || firstPage === 'login' || firstPage === 'landing') currentUser = null;
const basePath = '/tests/ui/app';
if (location.pathname.endsWith('preview.html')) history.replaceState(null, '', basePath + (previewRoutes[firstPage] || '/dashboard') + fixtureSearch);
document.querySelector('.qa-nav').hidden = firstParams.get('tools') !== '1';
const router = createRouter({ authState, layout, services, basePath });
document.querySelectorAll('[data-preview]').forEach(button => button.onclick = () => router.navigate(previewRoutes[button.dataset.preview]));
router.start();
