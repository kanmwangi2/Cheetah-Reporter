import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

interface UserProfile {
  uid: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  company: string
  role: string
  createdAt: Date
  lastLoginAt: Date
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, userData: Partial<UserProfile>) => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        // Load user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile)
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    // Update last login time
    await setDoc(doc(db, 'users', result.user.uid), {
      lastLoginAt: new Date()
    }, { merge: true })
  }

  const register = async (email: string, password: string, userData: Partial<UserProfile>) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    
    // Update Firebase Auth profile
    await updateProfile(result.user, {
      displayName: `${userData.firstName} ${userData.lastName}`
    })

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: result.user.uid,
      email: result.user.email!,
      displayName: `${userData.firstName} ${userData.lastName}`,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      company: userData.company || '',
      role: userData.role || 'User',
      createdAt: new Date(),
      lastLoginAt: new Date()
    }

    await setDoc(doc(db, 'users', result.user.uid), userProfile)
    setUserProfile(userProfile)
  }

  const logout = async () => {
    await signOut(auth)
  }

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')
    
    const updatedProfile = { ...userProfile, ...data }
    await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true })
    setUserProfile(updatedProfile as UserProfile)

    // Update Firebase Auth profile if display name changed
    if (data.firstName || data.lastName) {
      await updateProfile(user, {
        displayName: `${updatedProfile.firstName} ${updatedProfile.lastName}`
      })
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
    updateUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
