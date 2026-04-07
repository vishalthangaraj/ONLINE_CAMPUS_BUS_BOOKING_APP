import { signInWithPopup } from 'firebase/auth'
import { auth, provider } from '../firebase'
import apiService from '../services/api'

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
      const firebaseUser = result.user
      
      // Sync with our custom backend to get a JWT token
      const syncRes = await apiService.googleLogin({
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        googleId: firebaseUser.uid,
        photoURL: firebaseUser.photoURL
      })

      const { token, user: backendUser } = syncRes.data
      
      // Store JWT token for subsequent API calls
      localStorage.setItem('cb_jwt', token)
      
      // Store user details (including MongoDB _id)
      persistLogin(backendUser)
    } catch (err) {
      console.error('Login error:', err)
      setError(err?.response?.data?.message || 'Google sign-in failed. Please try again.')
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
