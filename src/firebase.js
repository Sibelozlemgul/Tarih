import { initializeApp } from "firebase/app";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB8zbUoPtBn9bqUyiCxV6YdAEJLc4izBms",
  authDomain: "bilgikartlari-b3672.firebaseapp.com",
  projectId: "bilgikartlari-b3672",
  storageBucket: "bilgikartlari-b3672.firebasestorage.app",
  messagingSenderId: "210868376536",
  appId: "1:210868376536:web:b7660ba023cf61c78b58ad"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
