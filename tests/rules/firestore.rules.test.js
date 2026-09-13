// اختبارات قواعد Firestore على المحاكي المحلي.
// شغّلها عبر: npm run test:rules (يشغّل المحاكي تلقائياً — الأنسب على Linux/CI).
// على Windows محلياً: يوجد خلل معروف في firebase-tools (emulators:exec + npm run معاً
// يفشل بخطأ stdin) — استخدم بدلاً منه نافذتي طرفية: npm run test:rules:emulator
// في الأولى، ثم npm run test:rules:run في الثانية بعد جاهزية المحاكي.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
} from '@firebase/rules-unit-testing';
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, Timestamp, serverTimestamp,
} from 'firebase/firestore';

const PROJECT_ID = 'wisam-rules-test';
const OWNER_UID = 'owner-uid';
const STRANGER_UID = 'stranger-uid';

let testEnv;

function validBoardData(overrides = {}) {
    return {
        ownerUid: OWNER_UID,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        settings: { name: 'لوحة اختبار', isPublic: false, banner: { themeId: 'emerald' } },
        students: {},
        ...overrides,
    };
}

// يُنشئ مستنداً مباشرة بصلاحيات المشرف (يتجاوز القواعد) لتحضير حالة الاختبار
async function seedBoard(boardId, data) {
    await testEnv.withSecurityRulesDisabled(async ctx => {
        await setDoc(doc(ctx.firestore(), 'leaderboards', boardId), data);
    });
}

before(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync('firestore.rules', 'utf8'),
            host: '127.0.0.1',
            port: 8081,
        },
    });
});

after(async () => {
    await testEnv?.cleanup();
});

test('get: owner can always read their own board, public or private', async () => {
    await seedBoard('b1', validBoardData({ settings: { name: 'خاصة', isPublic: false } }));
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'leaderboards', 'b1')));
});

test('get: anyone (including anonymous) can read a public board', async () => {
    await seedBoard('b2', validBoardData({ settings: { name: 'عامة', isPublic: true } }));
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anonDb, 'leaderboards', 'b2')));
});

test('get: a stranger cannot read a private board', async () => {
    await seedBoard('b3', validBoardData({ settings: { name: 'خاصة', isPublic: false } }));
    const strangerDb = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(getDoc(doc(strangerDb, 'leaderboards', 'b3')));
});

test('get: anonymous cannot read a private board', async () => {
    await seedBoard('b4', validBoardData({ settings: { name: 'خاصة', isPublic: false } }));
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonDb, 'leaderboards', 'b4')));
});

test('list: owner can list boards filtered by their own uid', async () => {
    await seedBoard('b5', validBoardData());
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const q = query(collection(ownerDb, 'leaderboards'), where('ownerUid', '==', OWNER_UID));
    await assertSucceeds(getDocs(q));
});

test('list: a stranger cannot list boards filtered by someone else\'s uid', async () => {
    await seedBoard('b6', validBoardData());
    const strangerDb = testEnv.authenticatedContext(STRANGER_UID).firestore();
    const q = query(collection(strangerDb, 'leaderboards'), where('ownerUid', '==', OWNER_UID));
    await assertFails(getDocs(q));
});

test('create: an authenticated user can create a valid board they own', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    // createdAt يجب أن يكون serverTimestamp() الفعلي — القاعدة تقارنه بـ request.time
    await assertSucceeds(setDoc(doc(ownerDb, 'leaderboards', 'c1'), {
        ownerUid: OWNER_UID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        settings: { name: 'لوحة جديدة', isPublic: true, banner: { themeId: 'sapphire' } },
        students: {},
    }));
});

test('create: a stale pre-Phase-6 client with no banner field at all is still allowed (cache-staleness backward compat)', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'leaderboards', 'c6'), {
        ownerUid: OWNER_UID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        settings: { name: 'بلا بانر', isPublic: true },
        students: {},
    }));
});

test('create: rejected when a banner IS sent but its themeId is the wrong type', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'leaderboards', 'c7'), {
        ownerUid: OWNER_UID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        settings: { name: 'بانر فاسد', isPublic: true, banner: { themeId: 42 } },
        students: {},
    }));
});

test('create: rejected if ownerUid does not match the caller', async () => {
    const strangerDb = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(setDoc(doc(strangerDb, 'leaderboards', 'c2'), validBoardData()));
});

test('create: rejected with an empty board name', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'leaderboards', 'c3'), validBoardData({ settings: { name: '', isPublic: true } })));
});

test('create: rejected if students is not empty', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'leaderboards', 'c4'), validBoardData({
        students: { s1: { name: 'طالب', memorized: [] } },
    })));
});

test('create: rejected for an unauthenticated caller', async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(anonDb, 'leaderboards', 'c5'), validBoardData()));
});

test('update: owner can rename their board and add a valid student', async () => {
    await seedBoard('u1', validBoardData());
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(updateDoc(doc(ownerDb, 'leaderboards', 'u1'), {
        'settings.name': 'اسم محدَّث',
        'students.s1': { name: 'طالب جديد', memorized: [] },
    }));
});

test('update: a stranger cannot update someone else\'s board', async () => {
    await seedBoard('u2', validBoardData());
    const strangerDb = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(updateDoc(doc(strangerDb, 'leaderboards', 'u2'), { 'settings.name': 'استيلاء' }));
});

test('update: ownerUid cannot be changed', async () => {
    await seedBoard('u3', validBoardData());
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(ownerDb, 'leaderboards', 'u3'), { ownerUid: STRANGER_UID }));
});

test('update: createdAt cannot be changed', async () => {
    await seedBoard('u4', validBoardData());
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(ownerDb, 'leaderboards', 'u4'), { createdAt: Timestamp.now() }));
});

test('update: banner can be changed by owner', async () => {
    await seedBoard('u7', validBoardData());
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(updateDoc(doc(ownerDb, 'leaderboards', 'u7'), {
        'settings.banner': { themeId: 'midnight' },
    }));
});

test('update: banner cannot be changed by non-owner', async () => {
    await seedBoard('u8', validBoardData());
    const strangerDb = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(updateDoc(doc(strangerDb, 'leaderboards', 'u8'), {
        'settings.banner': { themeId: 'amber' },
    }));
});

test('update: rejected when students would exceed the 150 cap', async () => {
    const students = {};
    for (let i = 0; i < 151; i++) students[`s${i}`] = { name: `طالب ${i}`, memorized: [] };
    await seedBoard('u6', validBoardData());
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(ownerDb, 'leaderboards', 'u6'), { students }));
});

test('delete: owner can delete their own board', async () => {
    await seedBoard('d1', validBoardData());
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(deleteDoc(doc(ownerDb, 'leaderboards', 'd1')));
});

test('delete: a stranger cannot delete someone else\'s board', async () => {
    await seedBoard('d2', validBoardData());
    const strangerDb = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(deleteDoc(doc(strangerDb, 'leaderboards', 'd2')));
});

test('users collection: a user can only read/write their own user document', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const strangerDb = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'users', OWNER_UID), { hello: 'world' }));
    await assertFails(setDoc(doc(strangerDb, 'users', OWNER_UID), { hello: 'hijack' }));
});
