// Firebase configuration secrets for the Kanban project
import type { FirebaseOptions } from 'firebase/app'

export const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'funwithkanban.firebaseapp.com',
  projectId: 'kanban-235f8',
  storageBucket: 'kanban-235f8.firebasestorage.app',
  messagingSenderId: '341601819048',
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export default firebaseConfig;
