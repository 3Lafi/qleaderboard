// نقطة الاستيراد الوحيدة لكل ما يُستخدم من Firebase SDK — رفع الإصدار يصبح تعديلاً في هذا الملف فقط
export { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';

export {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    signOut,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';

export {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    deleteField,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    writeBatch,
    runTransaction,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
