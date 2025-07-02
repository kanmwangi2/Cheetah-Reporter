import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../types/project';

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  initialize: () => () => void; // Returns the unsubscribe function
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userProfile: null,
  loading: true,
  isAuthenticated: false,
  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          set({
            user,
            userProfile: docSnap.data() as UserProfile,
            isAuthenticated: true,
            loading: false,
          });
        } else {
          // Handle case where user exists in auth but not in firestore
          set({ user, userProfile: null, isAuthenticated: true, loading: false });
        }
      } else {
        set({ user: null, userProfile: null, isAuthenticated: false, loading: false });
      }
    });
    return unsubscribe;
  },
}));

// Initialize the auth listener when the app loads
// This should be called in your main App.tsx
useAuthStore.getState().initialize();
