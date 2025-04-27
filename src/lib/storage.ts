import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  User,
  FormType,
  FormSection,
  FormField,
  FormSubmission,
  FormDraft,
  Message,
  FormSectionWithFields,
  UserSession,
} from "../lib/firebaseService";

const firebaseConfig = {
  // Add your Firebase config here
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAZ96B2F3OrkwDRoYP5q3iMyx4cnHLv4SU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||  "formease-bf6ad.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ||  "formease-bf6ad",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "formease-bf6ad.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "349366421308",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:349366421308:web:825795fe7391a0f02dc039"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export class FirebaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const docRef = doc(db, "users", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists()
      ? ({ id: docSnap.id, ...docSnap.data() } as User)
      : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty
      ? undefined
      : ({
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data(),
        } as User);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty
      ? undefined
      : ({
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data(),
        } as User);
  }

  async createUser(userData: Omit<User, "id" | "createdAt">): Promise<User> {
    const docRef = await addDoc(collection(db, "users"), {
      ...userData,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, ...userData, createdAt: Timestamp.now() };
  }

  async updateUser(
    id: string,
    userData: Partial<User>,
  ): Promise<User | undefined> {
    const docRef = doc(db, "users", id);
    await updateDoc(docRef, userData);
    const updated = await this.getUser(id);
    return updated;
  }

  // User Session methods
  async createUserSession(
    session: Omit<UserSession, "id" | "createdAt">,
  ): Promise<UserSession> {
    const docRef = await addDoc(collection(db, "userSessions"), {
      ...session,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, userId: session.userId, token: session.token, createdAt: Timestamp.now() };
  }

  async getUserSessionByToken(
    token: string,
  ): Promise<UserSession | undefined> {
    const q = query(
      collection(db, "userSessions"),
      where("token", "==", token),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty
      ? undefined
      : ({
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data(),
        } as UserSession);
  }

  async deleteUserSession(token: string): Promise<void> {
    const q = query(
      collection(db, "userSessions"),
      where("token", "==", token),
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      await deleteDoc(querySnapshot.docs[0].ref);
    }
  }

  // Form Type methods
  async getFormTypes(): Promise<FormType[]> {
    const querySnapshot = await getDocs(collection(db, "formTypes"));
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as FormType,
    );
  }

  async getFormTypeByCode(code: string): Promise<FormType | undefined> {
    const q = query(collection(db, "formTypes"), where("code", "==", code));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty
      ? undefined
      : ({
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data(),
        } as FormType);
  }

  // Form Structure methods
  async getFormSections(formTypeId: string): Promise<FormSection[]> {
    const q = query(
      collection(db, "formSections"),
      where("formTypeId", "==", formTypeId),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as FormSection,
    );
  }

  async getFormFields(sectionId: string): Promise<FormField[]> {
    const q = query(
      collection(db, "formFields"),
      where("sectionId", "==", sectionId),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as FormField,
    );
  }

  async getFormStructure(
    formTypeCode: string,
  ): Promise<{ formType: FormType; sections: FormSectionWithFields[] }> {
    const formType = await this.getFormTypeByCode(formTypeCode);
    if (!formType) throw new Error("Form type not found");

    const sections = await this.getFormSections(formType.id);
    const sectionsWithFields: FormSectionWithFields[] = await Promise.all(
      sections.map(async (section) => {
        const fields = await this.getFormFields(section.id);
        return {
          id: section.id,
          title: section.title,
          order: section.order,
          isOpen: false,
          fields: fields.map((field) => ({
            id: field.id,
            sectionId: field.sectionId,
            label: field.label,
            fieldKey: field.fieldKey,
            required: field.required,
            type: field.type,
            value: "",
            error: "",
          })),
        };
      }),
    );

    return {
      formType,
      sections: sectionsWithFields.sort((a, b) => a.order - b.order),
    };
  }

  // Form Submission methods
  async createFormSubmission(
    submission: Omit<FormSubmission, "id" | "createdAt">,
  ): Promise<FormSubmission> {
    const docRef = await addDoc(collection(db, "formSubmissions"), {
      ...submission,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, userId: submission.userId, formId: submission.formId, formData: submission.formData, createdAt: Timestamp.now() };
  }

  async getFormSubmission(id: string): Promise<FormSubmission | undefined> {
    const docRef = doc(db, "formSubmissions", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists()
      ? ({ id: docSnap.id, ...docSnap.data() } as FormSubmission)
      : undefined;
  }

  async getUserFormSubmissions(userId: string): Promise<FormSubmission[]> {
    const q = query(
      collection(db, "formSubmissions"),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as FormSubmission,
    );
  }

  // Form Draft methods
  async createFormDraft(
    draft: Omit<FormDraft, "id" | "createdAt" | "lastUpdated">,
  ): Promise<FormDraft> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, "formDrafts"), {
      ...draft,
      createdAt: now,
      lastUpdated: now,
    });
    return { id: docRef.id, userId: draft.userId, formId: draft.formId, data: draft.data, createdAt: now, lastUpdated: now };
  }

  async getFormDraft(id: string): Promise<FormDraft | undefined> {
    const docRef = doc(db, "formDrafts", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists()
      ? ({ id: docSnap.id, ...docSnap.data() } as FormDraft)
      : undefined;
  }

  async getUserFormDrafts(userId: string): Promise<FormDraft[]> {
    const q = query(
      collection(db, "formDrafts"),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as FormDraft,
    );
  }

  async updateFormDraft(
    id: string,
    data: Partial<FormDraft>,
  ): Promise<FormDraft | undefined> {
    const docRef = doc(db, "formDrafts", id);
    await updateDoc(docRef, { ...data, lastUpdated: serverTimestamp() });
    const updated = await this.getFormDraft(id);
    return updated;
  }

  async deleteFormDraft(id: string): Promise<void> {
    await deleteDoc(doc(db, "formDrafts", id));
  }

  // Message methods
  async saveMessage(
    message: Omit<Message, "id" | "timestamp">,
  ): Promise<Message> {
    const docRef = await addDoc(collection(db, "messages"), {
      ...message,
      timestamp: serverTimestamp(),
    });
    return { id: docRef.id, sessionId: message.sessionId, senderId: message.senderId, text: message.text, timestamp: Timestamp.now() };
  }

  async getMessagesBySession(sessionId: string): Promise<Message[]> {
    const q = query(
      collection(db, "messages"),
      where("sessionId", "==", sessionId),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          sessionId: data.sessionId,
          senderId: data.senderId,
          text: data.text,
          sentAt: data.sentAt,
        } as Message;
      },
    );
  }

  async getUserMessages(userId: string): Promise<Message[]> {
    const q = query(collection(db, "messages"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Message,
    );
  }
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "createdAt">): Promise<User>;
  updateUser(id: string, userData: Partial<User>): Promise<User | undefined>;

  // User Session methods
  createUserSession(
    session: Omit<UserSession, "id" | "createdAt">,
  ): Promise<UserSession>;
  getUserSessionByToken(
    token: string,
  ): Promise<UserSession | undefined>;
  deleteUserSession(token: string): Promise<void>;

  // Form Type methods
  getFormTypes(): Promise<FormType[]>;
  getFormTypeByCode(code: string): Promise<FormType | undefined>;

  // Form Structure methods
  getFormSections(formTypeId: string): Promise<FormSection[]>;
  getFormFields(sectionId: string): Promise<FormField[]>;
  getFormStructure(
    formTypeCode: string,
  ): Promise<{ formType: FormType; sections: FormSectionWithFields[] }>;

  // Form Submission methods
  createFormSubmission(
    submission: Omit<FormSubmission, "id" | "createdAt">,
  ): Promise<FormSubmission>;
  getFormSubmission(id: string): Promise<FormSubmission | undefined>;
  getUserFormSubmissions(userId: string): Promise<FormSubmission[]>;

  // Form Draft methods
  createFormDraft(
    draft: Omit<FormDraft, "id" | "createdAt" | "lastUpdated">,
  ): Promise<FormDraft>;
  getFormDraft(id: string): Promise<FormDraft | undefined>;
  getUserFormDrafts(userId: string): Promise<FormDraft[]>;
  updateFormDraft(
    id: string,
    data: Partial<FormDraft>,
  ): Promise<FormDraft | undefined>;
  deleteFormDraft(id: string): Promise<void>;

  // Message methods
  saveMessage(message: Omit<Message, "id" | "timestamp">): Promise<Message>;
  getMessagesBySession(sessionId: string): Promise<Message[]>;
  getUserMessages(userId: string): Promise<Message[]>;
}

export const storage = new FirebaseStorage();
