// Firebase configuration secrets for the Kanban project
import type { FirebaseOptions } from 'firebase/app'

export const firebaseConfig: FirebaseOptions = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'kanban.firebaseapp.com',
  projectId: 'kanban',
  storageBucket: 'kanban.firebasestorage.app',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
}

export default firebaseConfig;
