// ================================================================
// STEP 1: Go to https://firebase.google.com → Create Project
// STEP 2: Add a Web App → Copy your config here
// STEP 3: Enable Authentication (Email/Password) in Firebase Console
// STEP 4: Enable Firestore Database in Firebase Console
// ================================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBml9_Qi3PXL3lffZa1rUzo-3QnYMbor20",
  authDomain: "tuition-app-afb21.firebaseapp.com",
  projectId: "tuition-app-afb21",
  storageBucket: "tuition-app-afb21.firebasestorage.app",
  messagingSenderId: "987148517949",
  appId: "1:987148517949:web:794d69141b0cc295b66054",
  measurementId: "G-CJKVE95K6K"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
