// طبقة الوصول الوحيدة إلى Firestore لمستند اللوحات
import { db, auth } from '../firebase/firebase.js';
import {
    collection, doc, getDoc, getDocs, updateDoc, deleteField,
    query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, writeBatch, runTransaction,
} from '../firebase/firebase-sdk.js';
import { Leaderboard } from '../../domain/models/Leaderboard.js';
import { sanitizeSettings } from '../../domain/models/BoardSettings.js';
import { LIMITS } from '../../shared/config.js';
import { boardImageVersion } from '../../shared/board-image.js';
import { renderBoardImage } from '../services/BoardImageRenderer.js';
import { createBoardImageRecovery } from '../services/BoardImageRecovery.js';

const COLLECTION = 'leaderboards';

function boardsCol() {
    return collection(db, COLLECTION);
}

function boardRef(boardId) {
    return doc(db, COLLECTION, boardId);
}

function previewRef(boardId) { return doc(db, 'boardPreviews', boardId); }

const imageRecovery = createBoardImageRecovery({
    currentUid: () => auth.currentUser?.uid,
    readImage: async id => (await getDoc(previewRef(id))).data(),
    renderImage: renderBoardImage,
    commitIfCurrent: (id, uid, version, image) => runTransaction(db, async transaction => {
        const board = await transaction.get(boardRef(id));
        const preview = await transaction.get(previewRef(id));
        if (!board.exists() || board.data().ownerUid !== uid || await boardImageVersion(board.data().settings) !== version) return false;
        if (preview.data()?.version !== version || !preview.data()?.jpeg) {
            transaction.set(previewRef(id), image);
            transaction.update(boardRef(id), { previewRevision: crypto.randomUUID() });
        }
        return true;
    }),
});

function randomId(len = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

export const BoardRepository = {
    retryPreviews: () => imageRecovery.retry(),
    async listMine(uid) {
        const q = query(boardsCol(), where('ownerUid', '==', uid), orderBy('updatedAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            void imageRecovery.ensure(d.id, d.data());
            return new Leaderboard(d.id, d.data());
        });
    },

    async get(boardId) {
        const snap = await getDoc(boardRef(boardId));
        if (!snap.exists()) return null;
        void imageRecovery.ensure(boardId, snap.data());
        return new Leaderboard(snap.id, snap.data());
    },

    // اشتراك مباشر للوحة العامة؛ يعيد دالة إلغاء الاشتراك
    watch(boardId, onChange, onError) {
        return onSnapshot(boardRef(boardId), snap => {
            if (!snap.exists()) { onChange(null); return; }
            if (!snap.metadata.hasPendingWrites) void imageRecovery.ensure(boardId, snap.data());
            onChange(new Leaderboard(snap.id, snap.data()));
        }, onError);
    },

    async create(ownerUid, settings) {
        const id = randomId();
        const initialSettings = sanitizeSettings(settings);
        const preview = await renderBoardImage(initialSettings);
        const batch = writeBatch(db);
        batch.set(boardRef(id), {
            ownerUid,
            previewRevision: crypto.randomUUID(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            settings: initialSettings,
            // لقطة تاريخية محفوظة للتوافق مع اللوحات القديمة؛ صورة المشاركة
            // الحالية تُحفظ منفصلة وتُحدّث مع إعدادات البانر.
            initialBanner: {
                name: initialSettings.name,
                schoolName: initialSettings.schoolName,
                classLabel: initialSettings.classLabel,
                banner: initialSettings.banner,
            },
            students: {},
        });
        batch.set(previewRef(id), preview);
        await batch.commit();
        return id;
    },

    async updateSettings(boardId, settings) {
        const nextSettings = sanitizeSettings(settings);
        const version = await boardImageVersion(nextSettings);
        const previous = await getDoc(previewRef(boardId));
        const preview = previous.data()?.version === version ? null : await renderBoardImage(nextSettings);
        const batch = writeBatch(db);
        batch.update(boardRef(boardId), {
            settings: nextSettings,
            updatedAt: serverTimestamp(),
            ...(preview ? { previewRevision: crypto.randomUUID() } : {}),
        });
        if (preview) {
            batch.set(previewRef(boardId), preview);
        }
        await batch.commit();
    },

    async delete(boardId) {
        const batch = writeBatch(db);
        batch.delete(previewRef(boardId));
        batch.delete(boardRef(boardId));
        await batch.commit();
    },

    // محتسب سابقاً لطالب واحد (انتقال من برنامج آخر) — أرقام سور فقط
    async setStudentPrior(boardId, studentId, surahNumbers = []) {
        const clean = [...new Set(surahNumbers.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 114))].sort((a, b) => a - b);
        await updateDoc(boardRef(boardId), {
            [`students.${studentId}.priorSurahs`]: clean,
            updatedAt: serverTimestamp(),
        });
    },

    async addStudent(boardId, name, currentCount, { cohortStudentId = '', hidden = false } = {}) {
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
                ...(cohortStudentId ? { cohortStudentId: String(cohortStudentId) } : {}),
                ...(hidden ? { hidden: true } : {}),
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
        const snapshot = await getDoc(boardRef(boardId));
        const cohortStudentId = snapshot.data()?.students?.[studentId]?.cohortStudentId;
        await updateDoc(boardRef(boardId), {
            [`students.${studentId}`]: deleteField(),
            ...(cohortStudentId ? { excludedCohortStudentIds: arrayUnion(String(cohortStudentId)) } : {}),
            updatedAt: serverTimestamp(),
        });
    },

    async setStudentVisibility(boardId, studentId, hidden, override = '', cohortStudentId = '') {
        await updateDoc(boardRef(boardId), {
            [`students.${studentId}.hidden`]: Boolean(hidden),
            [`students.${studentId}.visibilityOverride`]: override ? override : deleteField(),
            ...(cohortStudentId ? { [`students.${studentId}.cohortStudentId`]: String(cohortStudentId) } : {}),
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
