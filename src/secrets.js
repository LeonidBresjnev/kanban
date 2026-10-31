// Firebase configuration secrets for the Kanban project
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "kanban-235f8.firebaseapp.com",
  projectId: "kanban-235f8",
  storageBucket: "kanban-235f8.firebasestorage.app",
  messagingSenderId: "341601819048",
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export default firebaseConfig;
