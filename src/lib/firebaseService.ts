import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  DocumentData,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// Firebase config (replace with your actual values)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAZ96B2F3OrkwDRoYP5q3iMyx4cnHLv4SU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||  "formease-bf6ad.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ||  "formease-bf6ad",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "formease-bf6ad.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "349366421308",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:349366421308:web:825795fe7391a0f02dc039"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Type definitions

export interface User {
  id: string;
  username?: string;
  email?: string;
  createdAt?: Timestamp;
  [key: string]: any;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  createdAt: Timestamp;
  [key: string]: any;
}

export interface FormType {
  id: string;
  code: string;
  title?: string;
  description?: string;
  [key: string]: any;
}

export interface FormSection {
  id: string;
  formTypeId: string;
  title: string;
  order?: number;
  [key: string]: any;
}

export interface FormField {
  id: string;
  sectionId: string;
  label: string;
  fieldKey: string;
  required: boolean;
  type: string;
  value?: string;
  error?: string;
  [key: string]: any;
}

export interface FormSubmission {
  id: string;
  userId: string;
  formId: string;
  formData: { [key: string]: any };
  createdAt: Timestamp;
  [key: string]: any;
}

export interface FormDraft {
  id: string;
  userId: string;
  formId: string;
  data: { [key: string]: any };
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  [key: string]: any;
}

export type FormData = { [key: string]: any };

export type Message = {
  id?: string;
  sessionId: string;
  senderId: string;
  text: string;
  sentAt?: Date;
  timestamp?: Timestamp;
  [key: string]: any;
};

export type Session = {
  userId: string;
  language: string;
  createdAt: Date;
};

export type FormSectionWithFields = {
  id: string | number;
  title: string;
  order?: number;
  isOpen?: boolean;
  fields: FormField[];
};

export type ChatMessage = {
  sender: "bot" | "user";
  text: string;
  thinking?: boolean;
};
