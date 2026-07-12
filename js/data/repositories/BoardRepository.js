// طبقة الوصول الوحيدة إلى Firestore لمستند اللوحات
import { db } from '../../core/firebase.js';
import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, deleteField,
    query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove,
} from '../../core/firebase-sdk.js';
import { Leaderboard } from '../../domain/models/Leaderboard.js';
import { sanitizeSettings } from '../../domain/models/BoardSettings.js';
import { LIMITS } from '../../core/config.js';

const COLLECTION = 'leaderboards';

function boardsCol() {
    return collection(db, COLLECTION);
}

function boardRef(boardId) {
    return doc(db, COLLECTION, boardId);
}

function randomId(len = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

export const BoardRepository = {
    async listMine(uid) {
        const q = query(boardsCol(), where('ownerUid', '==', uid), orderBy('updatedAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => new Leaderboard(d.id, d.data()));
    },

    async get(boardId) {
        const snap = await getDoc(boardRef(boardId));
        if (!snap.exists()) return null;
        return new Leaderboard(snap.id, snap.data());
    },

    // اشتراك مباشر للوحة العامة؛ يعيد دالة إلغاء الاشتراك
    watch(boardId, onChange, onError) {
        return onSnapshot(boardRef(boardId), snap => {
            if (!snap.exists()) { onChange(null); return; }
            onChange(new Leaderboard(snap.id, snap.data()));
        }, onError);
    },

    async create(ownerUid, settings) {
        const id = randomId();
        await setDoc(boardRef(id), {
            ownerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            settings: sanitizeSettings(settings),
            students: {},
        });
        return id;
    },

    async updateSettings(boardId, settings) {
        await updateDoc(boardRef(boardId), {
            settings: sanitizeSettings(settings),
            updatedAt: serverTimestamp(),
        });
    },

    async delete(boardId) {
        await deleteDoc(boardRef(boardId));
    },

    async addStudent(boardId, name, currentCount) {
        if (currentCount >= LIMITS.MAX_STUDENTS_PER_BOARD) {
            throw new Error(`لا يمكن تجاوز ${LIMITS.MAX_STUDENTS_PER_BOARD} طالباً في اللوحة الواحدة.`);
        }
        const studentId = randomId(10);
        await updateDoc(boardRef(boardId), {
            [`students.${studentId}`]: {
                name: name.slice(0, LIMITS.MAX_NAME_LENGTH),
                memorized: [],
                completedDate: null,
                createdAt: serverTimestamp(),
            },
            updatedAt: serverTimestamp(),
        });
        return studentId;
    },

    async renameStudent(boardId, studentId, name) {
        await updateDoc(boardRef(boardId), {
            [`students.${studentId}.name`]: name.slice(0, LIMITS.MAX_NAME_LENGTH),
            updatedAt: serverTimestamp(),
        });
    },

    async deleteStudent(boardId, studentId) {
        await updateDoc(boardRef(boardId), {
            [`students.${studentId}`]: deleteField(),
            updatedAt: serverTimestamp(),
        });
    },

    // يبدّل حالة الحفظ لسورة معيّنة، ويحدّث تاريخ الإنجاز عند اكتمال/نقصان النطاق
    async setSurah(boardId, studentId, surahNumber, memorized, isNowComplete, wasComplete) {
        const updates = {
            [`students.${studentId}.memorized`]: memorized
                ? arrayUnion(surahNumber)
                : arrayRemove(surahNumber),
            updatedAt: serverTimestamp(),
        };
        if (isNowComplete && !wasComplete) {
            updates[`students.${studentId}.completedDate`] = serverTimestamp();
        } else if (!isNowComplete && wasComplete) {
            updates[`students.${studentId}.completedDate`] = null;
        }
        await updateDoc(boardRef(boardId), updates);
    },
};
