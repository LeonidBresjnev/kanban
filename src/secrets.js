// Firebase configuration secrets for the Kanban project
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAPn05tMb69UT93qibloP2n3LLSaW52Ygg",
  authDomain: "kanban-235f8.firebaseapp.com",
  projectId: "kanban-235f8",
  storageBucket: "kanban-235f8.firebasestorage.app",
  messagingSenderId: "341601819048",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:341601819048:web:c08a668a0db0dcca3ca59d"
};

export default firebaseConfig;
