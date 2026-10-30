import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';

// Copy this file to src/firebase/config.ts and fill in your real Firebase values.
// Get them from: https://console.firebase.google.com/ -> Project settings -> General -> Your apps -> Add app (web)
// Never commit config.ts — it's in .gitignore because it contains API keys.
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: '1:YOUR_SENDER_ID:web:YOUR_WEB_APP_ID',
};

// Initialize Firebase app (only once)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);

export type { User };

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
};
