import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const devConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const prodConfig = {
  apiKey: "AIzaSyAT7h5KF24bvUFYYn2iSFeoMQsmwaG3FG4",
  authDomain: "logisticahco-70142.firebaseapp.com",
  projectId: "logisticahco-70142",
  storageBucket: "logisticahco-70142.firebasestorage.app",
  messagingSenderId: "919667445997",
  appId: "1:919667445997:web:140c91ff9e09411e8a3ce4"
};

const firebaseConfig = import.meta.env.DEV ? devConfig : prodConfig;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  hd: 'hermaco.net'
});
