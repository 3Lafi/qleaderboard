import { auth } from '../firebase/firebase.js';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, signOut } from '../firebase/firebase-sdk.js';

export const AuthenticationService = {
    signInGoogle: () => signInWithPopup(auth, new GoogleAuthProvider()),
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    async signUp(email, password, name) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(credential.user, { displayName: name });
    },
    resetPassword: email => sendPasswordResetEmail(auth, email),
    signOut: () => signOut(auth),
};
