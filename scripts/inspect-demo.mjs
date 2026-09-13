// قراءة فقط: عرض لوحات حساب المعلم التجريبي وأسماء طلابها
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCGW9PNgB-tiRzFbcrvK2aXa1Gs-RZ3GHg",
    authDomain: "wisam-3lafi.firebaseapp.com",
    projectId: "wisam-3lafi",
    storageBucket: "wisam-3lafi.firebasestorage.app",
    messagingSenderId: "586769682323",
    appId: "1:586769682323:web:ee86c70831a778f33c2266",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const cred = await signInWithEmailAndPassword(auth, 'demo.teacher@wisam.test', 'WisamPassword123!');
console.log('uid:', cred.user.uid);
const snap = await getDocs(query(collection(db, 'leaderboards'), where('ownerUid', '==', cred.user.uid)));
console.log('boards:', snap.size);
for (const doc of snap.docs) {
    const d = doc.data();
    const students = Object.entries(d.students || {});
    console.log(`\n— ${d.settings?.name}  (id=${doc.id})`);
    console.log(`  scope=${d.settings?.scope?.type} juz=${JSON.stringify(d.settings?.scope?.juzNumbers||[])} surahs=${d.settings?.scope?.surahNumbers?.length||0} curriculum=${JSON.stringify(d.settings?.scope?.curriculum||null)}`);
    console.log(`  priorMode=${d.settings?.priorMode ?? '(غير محدد)'} students=${students.length}`);
    students.forEach(([id, s]) => console.log(`   · ${s.name} — محفوظ ${ (s.memorized||[]).length } — cohort=${s.cohortStudentId||'-'}`));
}
const cohorts = await getDocs(query(collection(db, 'cohorts'), where('ownerUid', '==', cred.user.uid)));
console.log('\ncohorts:', cohorts.size);
cohorts.forEach(c => console.log('  •', c.data().name, Object.keys(c.data().students||{}).length));
process.exit(0);
