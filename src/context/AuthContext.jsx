/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from '../firebase'

export const AuthContext = createContext({
  currentUser: null,
  loading: true,
  isGuest: false,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  signupWithEmail: async () => {},
  logout: async () => {},
  loginAsGuest: () => {},
})

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('kanban_mock_user')
      if (savedUser) {
        return JSON.parse(savedUser)
      }
      const guestActive = localStorage.getItem('kanban_guest_mode') === 'true'
      if (guestActive) {
        return {
          uid: 'guest_user_id',
          email: 'guest@kanban.local',
          displayName: 'Guest User',
          isAnonymous: true,
        }
      }
      return null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [isGuest, setIsGuest] = useState(() => {
    try {
      return localStorage.getItem('kanban_guest_mode') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (!auth) {
      // Fallback if Firebase auth is not configured
      const savedUser = localStorage.getItem('kanban_mock_user')
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser))
        } catch {
          // ignore
        }
      }
      setLoading(false)
      return
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user)
        setIsGuest(false)
        try {
          localStorage.removeItem('kanban_guest_mode')
        } catch {
          // ignore
        }
      } else {
        // If mock user or guest mode was active, preserve user
        const guestActive = localStorage.getItem('kanban_guest_mode') === 'true'
        const savedMockUser = localStorage.getItem('kanban_mock_user')
        if (savedMockUser) {
          try {
            setCurrentUser(JSON.parse(savedMockUser))
            setIsGuest(false)
          } catch {
            setCurrentUser(null)
          }
        } else if (guestActive) {
          setIsGuest(true)
          setCurrentUser({
            uid: 'guest_user_id',
            email: 'guest@kanban.local',
            displayName: 'Guest User',
            isAnonymous: true,
          })
        } else {
          setCurrentUser(null)
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      const mockUser = {
        uid: 'google_user_' + Date.now(),
        email: 'user@gmail.com',
        displayName: 'Demo User',
      }
      setCurrentUser(mockUser)
      setIsGuest(false)
      localStorage.setItem('kanban_mock_user', JSON.stringify(mockUser))
      localStorage.removeItem('kanban_guest_mode')
      return mockUser
    }
    const result = await signInWithPopup(auth, googleProvider)
    setIsGuest(false)
    localStorage.removeItem('kanban_guest_mode')
    return result.user
  }

  const loginWithEmail = async (email, password) => {
    if (!auth) {
      const mockUser = {
        uid: 'user_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
        email,
        displayName: email.split('@')[0],
      }
      setCurrentUser(mockUser)
      setIsGuest(false)
      localStorage.setItem('kanban_mock_user', JSON.stringify(mockUser))
      localStorage.removeItem('kanban_guest_mode')
      return mockUser
    }
    const result = await signInWithEmailAndPassword(auth, email, password)
    setIsGuest(false)
    localStorage.removeItem('kanban_guest_mode')
    return result.user
  }

  const signupWithEmail = async (email, password, displayName) => {
    if (!auth) {
      const mockUser = {
        uid: 'user_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
        email,
        displayName: displayName || email.split('@')[0],
      }
      setCurrentUser(mockUser)
      setIsGuest(false)
      localStorage.setItem('kanban_mock_user', JSON.stringify(mockUser))
      localStorage.removeItem('kanban_guest_mode')
      return mockUser
    }
    const result = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(result.user, { displayName })
    }
    setIsGuest(false)
    localStorage.removeItem('kanban_guest_mode')
    return result.user
  }

  const loginAsGuest = () => {
    const guestUser = {
      uid: 'guest_user_id',
      email: 'guest@kanban.local',
      displayName: 'Guest Admin',
      isAnonymous: true,
    }
    setIsGuest(true)
    setCurrentUser(guestUser)
    try {
      localStorage.setItem('kanban_guest_mode', 'true')
    } catch {
      // ignore
    }
  }

  const logout = async () => {
    try {
      localStorage.removeItem('kanban_guest_mode')
      localStorage.removeItem('kanban_mock_user')
    } catch {
      // ignore
    }
    setIsGuest(false)
    setCurrentUser(null)
    if (auth) {
      await signOut(auth)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isGuest,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        loginAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
