
// Use standard modular imports for Firebase v9+
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCsiM7WDaDGa7nv87nHbkKE6fsFDwMnNZA",
  authDomain: "logistics-70952.firebaseapp.com",
  projectId: "logistics-70952",
  storageBucket: "logistics-70952.firebasestorage.app",
  messagingSenderId: "626764813746",
  appId: "1:626764813746:web:0dc6f5a8f4ec6b964cc0ab",
  measurementId: "G-X38M823TQM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Export auth and db instances initialized with the modular SDK
export const auth = getAuth(app);
export const db = getFirestore(app);