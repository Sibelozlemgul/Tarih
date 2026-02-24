import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDzbCnZUxQLp1pqzUWzNoh7Z6vg19eU7dM",
  authDomain: "sibelozlemgul-96f37.firebaseapp.com",
  projectId: "sibelozlemgul-96f37",
  storageBucket: "sibelozlemgul-96f37.firebasestorage.app",
  messagingSenderId: "419605878008",
  appId: "1:419605878008:web:48877d931082754457d70d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
