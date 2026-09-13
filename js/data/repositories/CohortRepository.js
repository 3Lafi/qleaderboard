// طبقة الوصول الوحيدة إلى مجموعة الدفعات في Firestore
import { db } from '../firebase/firebase.js';
import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, deleteField,
    query, where, serverTimestamp,
} from '../firebase/firebase-sdk.js';
import { Cohort } from '../../domain/models/Cohort.js';
import { LIMITS } from '../../shared/config.js';

const COLLECTION = 'cohorts';

const cohortsCol = () => collection(db, COLLECTION);
const cohortRef = id => doc(db, COLLECTION, id);

function randomId(len = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

function toMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function cleanName(name) {
    return String(name || '').trim().slice(0, LIMITS.MAX_NAME_LENGTH);
}

export const CohortRepository = {
    // بلا orderBy في الاستعلام حتى لا نحتاج فهرساً مركّباً؛ الترتيب يتم في العميل
    async listMine(uid) {
        const q = query(cohortsCol(), where('ownerUid', '==', uid));
        const snap = await getDocs(q);
        return snap.docs
            .map(d => new Cohort(d.id, d.data()))
            .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    },

    async get(id) {
        const snap = await getDoc(cohortRef(id));
        return snap.exists() ? new Cohort(snap.id, snap.data()) : null;
    },

    async create(ownerUid, { name, note = '' } = {}) {
        const clean = cleanName(name);
        if (!clean) throw new Error('اكتب اسم الدفعة');
        const id = randomId();
        await setDoc(cohortRef(id), {
            ownerUid,
            name: clean,
            note: String(note || '').slice(0, 200),
            students: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return id;
    },

    async update(id, { name, note } = {}) {
        const payload = { updatedAt: serverTimestamp() };
        if (name !== undefined) {
            const clean = cleanName(name);
            if (!clean) throw new Error('اكتب اسم الدفعة');
            payload.name = clean;
        }
        if (note !== undefined) payload.note = String(note || '').slice(0, 200);
        await updateDoc(cohortRef(id), payload);
    },

    // ربط لوحة بالدفعة (يُسجَّل الترتيب ليكون التدرّج معروفاً)
    async linkProgram(id, boardId) {
        const cohort = await this.get(id);
        if (!cohort) return;
        const programs = (cohort.programs || []).filter(entry => String(entry.boardId) !== String(boardId));
        programs.push({ boardId: String(boardId), linkedAt: new Date().toISOString() });
        await updateDoc(cohortRef(id), { programs, updatedAt: serverTimestamp() });
    },

    async unlinkProgram(id, boardId) {
        const cohort = await this.get(id);
        if (!cohort) return;
        const programs = (cohort.programs || []).filter(entry => String(entry.boardId) !== String(boardId));
        await updateDoc(cohortRef(id), { programs, updatedAt: serverTimestamp() });
    },

    async delete(id) {
        await deleteDoc(cohortRef(id));
    },

    async addStudent(id, name, currentCount = 0) {
        if (currentCount >= LIMITS.MAX_STUDENTS_PER_BOARD) {
            throw new Error(`لا يمكن تجاوز ${LIMITS.MAX_STUDENTS_PER_BOARD} طالباً في الدفعة الواحدة.`);
        }
        const clean = cleanName(name);
        if (!clean) throw new Error('اكتب اسم الطالب');
        const studentId = randomId(10);
        await updateDoc(cohortRef(id), {
            [`students.${studentId}`]: { name: clean, joinedAt: serverTimestamp() },
            updatedAt: serverTimestamp(),
        });
        return studentId;
    },

    // إضافة دفعة كاملة من الأسماء مرة واحدة (للاستيراد أو اللصق)
    async addStudents(id, names = [], currentCount = 0) {
        const clean = [...new Set(names.map(cleanName).filter(Boolean))];
        if (!clean.length) return [];
        if (currentCount + clean.length > LIMITS.MAX_STUDENTS_PER_BOARD) {
            throw new Error(`لا يمكن تجاوز ${LIMITS.MAX_STUDENTS_PER_BOARD} طالباً في الدفعة الواحدة.`);
        }
        const payload = { updatedAt: serverTimestamp() };
        const ids = clean.map(name => {
            const studentId = randomId(10);
            payload[`students.${studentId}`] = { name, joinedAt: serverTimestamp() };
            return studentId;
        });
        await updateDoc(cohortRef(id), payload);
        return ids;
    },

    async renameStudent(id, studentId, name) {
        const clean = cleanName(name);
        if (!clean) throw new Error('اكتب اسم الطالب');
        await updateDoc(cohortRef(id), {
            [`students.${studentId}.name`]: clean,
            updatedAt: serverTimestamp(),
        });
    },

    async removeStudent(id, studentId) {
        await updateDoc(cohortRef(id), {
            [`students.${studentId}`]: deleteField(),
            updatedAt: serverTimestamp(),
        });
    },
};
