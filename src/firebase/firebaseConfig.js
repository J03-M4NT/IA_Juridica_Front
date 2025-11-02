// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAE4Q6n0uXqxjiSv4MBGlXlYyOTjd1tsOo",
  authDomain: "lexit-ai.firebaseapp.com",
  projectId: "lexit-ai",
  storageBucket: "lexit-ai.firebasestorage.app",
  messagingSenderId: "64541422499",
  appId: "1:64541422499:web:11b144e2774b5f4ecd6016",
  measurementId: "G-4Z0963YMN2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
