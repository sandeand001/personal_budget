import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCCKyQU_xqUpoJTEb8iZ3wKs8qLrRzTtjs",
  authDomain: "personal-budget-3bfe4.firebaseapp.com",
  projectId: "personal-budget-3bfe4",
  storageBucket: "personal-budget-3bfe4.firebasestorage.app",
  messagingSenderId: "677556283703",
  appId: "1:677556283703:web:31b9979a619baae01552b2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
