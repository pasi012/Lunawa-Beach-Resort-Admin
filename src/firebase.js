// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD1rWR_-4KMBVebVID8N3UZwmIjya3KQoA",
  authDomain: "lunawa-beach-resort.firebaseapp.com",
  projectId: "lunawa-beach-resort",
  storageBucket: "lunawa-beach-resort.firebasestorage.app",
  messagingSenderId: "816083961383",
  appId: "1:816083961383:web:7e6e427d9b524b45527002",
  measurementId: "G-R09G8P43VD"
};

const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);
export const db = getFirestore(app);
