import React, { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, provider } from '../firebase'

export default function Login({ onLogin }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const normalizeUser = (authUser) => ({
    uid: authUser.uid,
    email: authUser.email,
    name: authUser.displayName || authUser.email?.split('@')[0] || 'Campus User',
    photoURL: authUser.photoURL || '',
    role: 'student',
  })

  const persistLogin = (userData) => {
    localStorage.setItem('cb_user', JSON.stringify(userData))
    if (onLogin) onLogin(userData)
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError('')

      const result = await signInWithPopup(auth, provider)
      const loggedInUser = normalizeUser(result.user)
      persistLogin(loggedInUser)
    } catch (err) {
      console.error('Login error:', err)
      setError('Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-card">
          <p className="login-kicker">BIT Campus Transport System</p>
          <h1 className="login-title">Smart BIT Campus Bus Booking</h1>
          <p className="login-subtitle">Book your seat, ride smart, and track your route in real time.</p>

          {error && <div className="login-error">{error}</div>}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="login-google-btn"
          >
            {loading ? 'Signing In...' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  )
}
