import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without firebaseConfig.firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ADMIN_EMAIL = 'syedshoaib.outlook@gmail.com';

// Connection test as mandated by Firebase skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or unreachable.');
    }
  }
}

// Trigger initial connection verification
testConnection();

// Google Sign-In helper
export async function signInWithGoogle(): Promise<User> {
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked') {
      alert('Sign-in popup was blocked by your browser. Please allow popups or open this application in a new tab.');
    }
    throw error;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Generate unique 6-character alphanumeric code
export function generateFriendCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper to determine admin status
export function checkIsAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
