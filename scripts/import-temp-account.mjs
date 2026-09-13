import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { SURAHS } from '../js/shared/quran-data.js';
import { resolveCurriculumSurahs } from '../js/shared/curriculum-data.js';
import { readFileSync } from 'node:fs';

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

const EMAIL = 'demo.teacher@wisam.test';
const PASSWORD = 'WisamPassword123!';

console.log('Signing in...');
const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
const uid = cred.user.uid;
await updateProfile(cred.user, { displayName: 'معلم تجريبي' });
console.log('Signed in as:', uid, EMAIL);

// Read JSON data fetched from Google Script
const raw = readFileSync('/home/bolafi/.gemini/antigravity/brain/2ccecc32-1e3a-4ddb-a695-7bd9594ae991/.system_generated/steps/238/content.md', 'utf8');
const jsonStr = raw.substring(raw.indexOf('{'));
const payload = JSON.parse(jsonStr).data;

// Normalize Arabic text helper
function norm(s) {
    return s.trim()
        .replace(/[\u064B-\u065F]/g, '')
        .replace(/[إأآا]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي');
}

const nameToNum = new Map();
for (const s of SURAHS) {
    nameToNum.set(norm(s.name), s.n);
    if (s.name.startsWith('ال')) {
        nameToNum.set(norm(s.name.substring(2)), s.n);
    }
}

function getSurahNumber(name) {
    return nameToNum.get(norm(name)) || nameToNum.get(norm(name.replace(/^ال/, ''))) || null;
}

function randomId(len = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

// 1. Board 1: منهج الصف الأول
const curriculumSurahs = resolveCurriculumSurahs({ countryId: 1, systemId: 2, stageId: 1, levelId: 1, termId: null });
const almanhajStudentsRaw = payload['المنهج'] || [];

const board1Id = 'almanhaj1';
console.log('Creating Board 1: منهج حفظ الصف الأول...');
await setDoc(doc(db, 'leaderboards', board1Id), {
    ownerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    settings: {
        name: 'منهج حفظ الصف الأول',
        schoolName: 'ابتدائية هشام بن عمار لتحفيظ القرآن ببريدة',
        classLabel: 'الصف الأول الابتدائي',
        banner: { themeId: 'emerald' },
        scope: {
            type: 'curriculum',
            curriculum: { countryId: 1, systemId: 2, stageId: 1, levelId: 1, termId: null },
            surahNumbers: curriculumSurahs
        },
        direction: 'reverse',
        isPublic: true,
        showClassProgress: true,
        classCurrentSurah: null
    },
    students: {}
});

const board1Students = {};
for (let i = 0; i < almanhajStudentsRaw.length; i++) {
    const item = almanhajStudentsRaw[i];
    // If the entry is named "المنهج", it is the class target; we can skip or include. Let's include actual students.
    if (item.name === 'المنهج') continue;
    const stId = 'st_m_' + (i + 1);
    const memorizedNums = (item.memorized_surahs || []).map(getSurahNumber).filter(Boolean);
    board1Students[stId] = {
        name: item.name.trim(),
        memorized: memorizedNums,
        completedDate: item.completed_date || null,
        createdAt: item.completed_date || '2026-03-01T08:00:00.000Z'
    };
}
await updateDoc(doc(db, 'leaderboards', board1Id), {
    students: board1Students,
    updatedAt: serverTimestamp()
});
console.log(`Board 1 created with ${Object.keys(board1Students).length} students.`);

// 2. Board 2: جزء عم
const juzAmmaStudentsRaw = payload['جزء عم'] || [];
const juzAmmaSurahs = Array.from({ length: 37 }, (_, i) => 78 + i); // 78 to 114
const board2Id = 'juzamma30';
console.log('Creating Board 2: جزء عم...');
await setDoc(doc(db, 'leaderboards', board2Id), {
    ownerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    settings: {
        name: 'لوحة حفظ جزء عم',
        schoolName: 'ابتدائية هشام بن عمار لتحفيظ القرآن ببريدة',
        classLabel: 'جزء عم',
        banner: { themeId: 'emerald' },
        scope: {
            type: 'juz',
            juzNumber: 30,
            surahNumbers: juzAmmaSurahs
        },
        direction: 'reverse',
        isPublic: true,
        showClassProgress: true,
        classCurrentSurah: null
    },
    students: {}
});

const board2Students = {};
for (let i = 0; i < juzAmmaStudentsRaw.length; i++) {
    const item = juzAmmaStudentsRaw[i];
    const stId = 'st_a_' + (i + 1);
    const memorizedNums = (item.memorized_surahs || []).map(getSurahNumber).filter(Boolean);
    board2Students[stId] = {
        name: item.name.trim(),
        memorized: memorizedNums,
        completedDate: item.completed_date || null,
        createdAt: item.completed_date || '2026-03-01T08:00:00.000Z'
    };
}
await updateDoc(doc(db, 'leaderboards', board2Id), {
    students: board2Students,
    updatedAt: serverTimestamp()
});
console.log(`Board 2 created with ${Object.keys(board2Students).length} students.`);

// 3. Board 3: جزء تبارك
const juzTabarakStudentsRaw = payload['جزء تبارك'] || [];
const juzTabarakSurahs = Array.from({ length: 11 }, (_, i) => 67 + i); // 67 to 77
const board3Id = 'juztabarak29';
console.log('Creating Board 3: جزء تبارك...');
await setDoc(doc(db, 'leaderboards', board3Id), {
    ownerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    settings: {
        name: 'لوحة حفظ جزء تبارك',
        schoolName: 'ابتدائية هشام بن عمار لتحفيظ القرآن ببريدة',
        classLabel: 'جزء تبارك',
        banner: { themeId: 'emerald' },
        scope: {
            type: 'juz',
            juzNumber: 29,
            surahNumbers: juzTabarakSurahs
        },
        direction: 'reverse',
        isPublic: true,
        showClassProgress: true,
        classCurrentSurah: null
    },
    students: {}
});

const board3Students = {};
for (let i = 0; i < juzTabarakStudentsRaw.length; i++) {
    const item = juzTabarakStudentsRaw[i];
    const stId = 'st_t_' + (i + 1);
    const memorizedNums = (item.memorized_surahs || []).map(getSurahNumber).filter(Boolean);
    board3Students[stId] = {
        name: item.name.trim(),
        memorized: memorizedNums,
        completedDate: item.completed_date || null,
        createdAt: item.completed_date || '2026-03-01T08:00:00.000Z'
    };
}
await updateDoc(doc(db, 'leaderboards', board3Id), {
    students: board3Students,
    updatedAt: serverTimestamp()
});
console.log(`Board 3 created with ${Object.keys(board3Students).length} students.`);

console.log('ALL 3 BOARDS CREATED AND POPULATED SUCCESSFULLY!');
