// تجميع طلاب البرامج المتكررة في دفعة واحدة وربط كل طالب بها.
// الاستخدام: node scripts/link-cohort.mjs --cohort "اسم الدفعة" [--dry]
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { normalizeArabic } from '../js/shared/text-utils.js';

const firebaseConfig = {
    apiKey: "AIzaSyCGW9PNgB-tiRzFbcrvK2aXa1Gs-RZ3GHg",
    authDomain: "wisam-3lafi.firebaseapp.com",
    projectId: "wisam-3lafi",
    storageBucket: "wisam-3lafi.firebasestorage.app",
    messagingSenderId: "586769682323",
    appId: "1:586769682323:web:ee86c70831a778f33c2266",
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const cohortName = (() => {
    const i = args.indexOf('--cohort');
    return i !== -1 ? args[i + 1] : 'دفعة طلاب الحلقة';
})();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const cred = await signInWithEmailAndPassword(auth, 'demo.teacher@wisam.test', 'WisamPassword123!');
const uid = cred.user.uid;
console.log(`${dryRun ? '[تجربة بلا كتابة] ' : ''}uid: ${uid}`);

const boardsSnap = await getDocs(query(collection(db, 'leaderboards'), where('ownerUid', '==', uid)));
const boards = boardsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
console.log(`اللوحات: ${boards.length}`);

// مفتاح موحّد للاسم: توحيد الهمزات والتاء المربوطة وحذف التشكيل وتقليص المسافات
const keyOf = name => normalizeArabic(name).replace(/\s+/g, ' ').trim();
const displayName = name => String(name || '').replace(/\s+/g, ' ').trim();

// 1) اتحاد الأسماء عبر كل اللوحات
const roster = new Map(); // key -> { id, name, boards: Set }
const randomId = (len = 10) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
};

for (const board of boards) {
    for (const [studentId, student] of Object.entries(board.students || {})) {
        const key = keyOf(student.name);
        if (!key) continue;
        if (!roster.has(key)) roster.set(key, { id: randomId(), name: displayName(student.name), boards: new Set(), entries: [] });
        const entry = roster.get(key);
        entry.boards.add(board.id);
        entry.entries.push({ boardId: board.id, studentId });
    }
}

console.log(`\nالأسماء الفريدة: ${roster.size}`);
for (const board of boards) {
    const inBoard = [...roster.values()].filter(r => r.boards.has(board.id)).length;
    console.log(`  ${board.settings?.name}: ${Object.keys(board.students || {}).length} سجل — ${inBoard} من أسماء الدفعة`);
}
const shared = [...roster.values()].filter(r => r.boards.size > 1);
console.log(`  أسماء مشتركة بين أكثر من برنامج: ${shared.length}`);

if (dryRun) {
    console.log('\n(تجربة) لن تتم أي كتابة.');
    process.exit(0);
}

// 2) إنشاء الدفعة
const cohortId = randomId(8);
// قاعدة الأمان تفرض إنشاء الدفعة فارغة (مثل اللوحات) ثم تُضاف الأسماء بتحديث لاحق
await setDoc(doc(db, 'cohorts', cohortId), {
    ownerUid: uid,
    name: cohortName,
    startedAt: new Date(),
    note: `تجميع تلقائي لطلاب: ${boards.map(b => b.settings?.name).filter(Boolean).join(' · ')}`,
    students: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
});
await updateDoc(doc(db, 'cohorts', cohortId), {
    students: Object.fromEntries([...roster.values()].map(r => [r.id, { name: r.name, joinedAt: new Date() }])),
    updatedAt: serverTimestamp(),
});
console.log(`\nأُنشئت الدفعة «${cohortName}» (${cohortId}) بعدد ${roster.size} طالباً`);

// 3) ربط كل سجل طالب في كل لوحة بعضو الدفعة
let linked = 0;
for (const board of boards) {
    const payload = { updatedAt: serverTimestamp(), 'settings.cohortId': cohortId };
    for (const [studentId, student] of Object.entries(board.students || {})) {
        const member = roster.get(keyOf(student.name));
        if (!member) continue;
        payload[`students.${studentId}.cohortStudentId`] = member.id;
        linked += 1;
    }
    await updateDoc(doc(db, 'leaderboards', board.id), payload);
    console.log(`  رُبطت ${board.settings?.name} بالدفعة`);
}
console.log(`\nتم ربط ${linked} سجلاً طالباً بعضو واحد في الدفعة.`);
process.exit(0);
