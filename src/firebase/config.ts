import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC69xOrEJHKGXwp2hyEVrNtSnl3RSJA-00",
  authDomain: "radsim-21fb7.firebaseapp.com",
  projectId: "radsim-21fb7",
  storageBucket: "radsim-21fb7.firebasestorage.app",
  messagingSenderId: "190612577174",
  appId: "1:190612577174:web:3de8c858d836cecf341bb7",
  measurementId: "G-41Y6TWXHZD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics (only in browser environment)
export const initAnalytics = async () => {
  if (await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};

export default app;
