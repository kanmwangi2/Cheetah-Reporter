import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
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
  resetPassword: (email: string) => Promise<void>
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
        try {
          // Load user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          
          if (userDoc.exists()) {
            const profileData = userDoc.data()
            
            // Convert Firestore timestamps to Date objects
            const profile = {
              ...profileData,
              createdAt: profileData.createdAt?.toDate ? profileData.createdAt.toDate() : new Date(profileData.createdAt || Date.now()),
              lastLoginAt: profileData.lastLoginAt?.toDate ? profileData.lastLoginAt.toDate() : new Date(profileData.lastLoginAt || Date.now())
            } as UserProfile
            
            setUserProfile(profile)
          } else {
            // Create a default profile if none exists
            const defaultProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              firstName: '',
              lastName: '',
              company: '',
              role: 'User',
              createdAt: new Date(),
              lastLoginAt: new Date()
            }
            await setDoc(doc(db, 'users', user.uid), defaultProfile)
            setUserProfile(defaultProfile)
          }
        } catch (error) {
          console.error('Error loading user profile:', error)
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email)
      const result = await signInWithEmailAndPassword(auth, email.trim(), password)
      console.log('Login successful for:', result.user.email)
      
      // Update last login time
      await setDoc(doc(db, 'users', result.user.uid), {
        lastLoginAt: new Date()
      }, { merge: true })
    } catch (error: any) {
      console.error('Login error:', error.code, error.message)
      throw new Error(`Login failed: ${error.message}`)
    }
  }

  const register = async (email: string, password: string, userData: Partial<UserProfile>) => {
    try {
      console.log('Attempting registration for:', email)
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password)
      console.log('Registration successful for:', result.user.email)
      
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

      console.log('Creating user profile in Firestore:', userProfile)
      await setDoc(doc(db, 'users', result.user.uid), userProfile)
      setUserProfile(userProfile)
    } catch (error: any) {
      console.error('Registration error:', error.code, error.message)
      throw new Error(`Registration failed: ${error.message}`)
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  const resetPassword = async (email: string) => {
    try {
      console.log('Sending password reset email to:', email)
      await sendPasswordResetEmail(auth, email.trim())
      console.log('Password reset email sent successfully')
    } catch (error: any) {
      console.error('Password reset error:', error.code, error.message)
      throw new Error(`Password reset failed: ${error.message}`)
    }
  }

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')
    
    const updatedProfile = { ...userProfile, ...data }
    await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true })
    setUserProfile(updatedProfile as UserProfile)

    // Update Firebase Auth profile if display name changed
    if (data.firstName || data.lastName) {
      const newDisplayName = `${updatedProfile.firstName} ${updatedProfile.lastName}`
      await updateProfile(user, {
        displayName: newDisplayName
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
    resetPassword,
    updateUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
