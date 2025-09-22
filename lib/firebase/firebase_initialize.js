import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";


export const firebaseConfig = {
  apiKey: "AIzaSyC_3uNrdj_Ny_68fIlWLCxFXCIfYxW7KWM",
  authDomain: "cmc-db-final.firebaseapp.com",
  projectId: "cmc-db-final",
  storageBucket: "cmc-db-final.firebasestorage.app",
  messagingSenderId: "931051452635",
  appId: "1:931051452635:web:53ba3e0194d3705530b4fe",
  measurementId: "G-E8EH6HD13J"
};
//  Initialize Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

//  Setup persistent auth 
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  
  auth = getAuth(app);
}

//  Firestore
const db = getFirestore(app);

export { app, auth, db };
