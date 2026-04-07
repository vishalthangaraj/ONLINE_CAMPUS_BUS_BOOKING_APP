import React, { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import { auth } from './firebase'
import { apiService } from './services/api'

function readStoredUser() {
  try {
    const stored = localStorage.getItem('cb_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function App() {
  const [user, setUser] = useState(readStoredUser)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        localStorage.removeItem('cb_user')
        localStorage.removeItem('cb_jwt')
        setUser(null)
        return
      }

      // Sync with backend to get details and JWT
      const syncBackend = async () => {
        try {
          const syncRes = await apiService.googleLogin({
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            googleId: firebaseUser.uid,
            photoURL: firebaseUser.photoURL
          })
          const { token, user: backendUser } = syncRes.data
          localStorage.setItem('cb_jwt', token)
          localStorage.setItem('cb_user', JSON.stringify(backendUser))
          setUser(backendUser)
        } catch (err) {
          console.error('Backend sync failed:', err)
          // Fallback to basic firebase info if backend is down
          const syncedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Campus User',
            photoURL: firebaseUser.photoURL || '',
            role: 'student',
          }
          setUser(syncedUser)
        }
      }

      syncBackend()
    })

    return () => unsubscribe()
  }, [])

  const isLoggedIn = useMemo(() => Boolean(user && user.email), [user])

  const handleLogout = async () => {
    await signOut(auth)
    localStorage.removeItem('cb_user')
    localStorage.removeItem('cb_jwt')
    setUser(null)
  }

  if (!isLoggedIn) {
    return <Login onLogin={setUser} />
  }

  return <Dashboard user={user} onLogout={handleLogout} onUserUpdate={setUser} />
}

export default App
