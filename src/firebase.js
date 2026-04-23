import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAT7h5KF24bvUFYYn2iSFeoMQsmwaG3FG4",
  authDomain: "logisticahco-70142.firebaseapp.com",
  projectId: "logisticahco-70142",
  storageBucket: "logisticahco-70142.firebasestorage.app",
  messagingSenderId: "919667445997",
  appId: "1:919667445997:web:140c91ff9e09411e8a3ce4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();