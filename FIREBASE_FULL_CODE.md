# Campus Bus Booking — Full Firebase / Firestore source (reference)

This file embeds the **complete** frontend code for Google Sign-In, Firestore bus seeding, real-time bus list, seat booking with `runTransaction`, and the `bookings` collection. Paths are relative to the repo root `campus_bus_booking_app/`.

**Run:** `cd frontend`, then `npm install` and `npm run dev`.

Deploy `firestore.rules` in the Firebase Console (Firestore → Rules).

---

## `frontend/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <title>Campus Bus Booking - CampusRide</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## `frontend/vite.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
});
```

---

## `frontend/package.json`

```json
{
  "name": "campus-bus-booking-frontend",
  "version": "1.0.0",
  "description": "Campus Bus Seat Booking â€” React Vite Frontend",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "campus_bus_booking_app": "file:..",
    "firebase": "^12.9.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "socket.io-client": "^4.8.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "vite": "^7.3.1"
  }
}
```

---

## `frontend/src/main.jsx`

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## `frontend/src/App.jsx`

```javascript
import React, { useMemo, useState } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

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

  const isLoggedIn = useMemo(() => Boolean(user && user.email), [user])

  const handleLogout = () => {
    localStorage.removeItem('cb_user')
    localStorage.removeItem('cb_jwt')
    setUser(null)
  }

  if (!isLoggedIn) {
    return <Login onLogin={setUser} />
  }

  return <Dashboard user={user} onLogout={handleLogout} />
}

export default App
```

---

## `frontend/src/firebase.js`

```javascript
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import { CAMPUS_BUSES } from './data/campusBuses'

const firebaseConfig = {
  apiKey: 'AIzaSyDN53vzg5QoxuPi0yBGb43cEkQ6Ja8knXM',
  authDomain: 'campus-bus-seat-booking-app.firebaseapp.com',
  projectId: 'campus-bus-seat-booking-app',
  storageBucket: 'campus-bus-seat-booking-app.firebasestorage.app',
  messagingSenderId: '206323488122',
  appId: '1:206323488122:web:d72c9c309d41bbc01fb2c3',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)

const buildDefaultSeats = (totalSeats) => {
  const seats = {}
  for (let seat = 1; seat <= totalSeats; seat += 1) {
    seats[String(seat)] = { status: 'available' }
  }
  return seats
}

export const seedBusesIfMissing = async () => {
  const checks = CAMPUS_BUSES.map(async (bus) => {
    const ref = doc(db, 'buses', bus.id)
    const snapshot = await getDoc(ref)
    if (!snapshot.exists()) {
      await setDoc(ref, {
        ...bus,
        seats: buildDefaultSeats(bus.totalSeats),
        updatedAt: Date.now(),
      })
    }
  })

  await Promise.all(checks)
}
```

---

## `frontend/src/data/campusBuses.js`

```javascript
export const CAMPUS_BUSES = [
  {
    id: 'BIT01',
    name: 'BIT01',
    route: 'Tiruppur -> College',
    fromCity: 'Tiruppur',
    toCity: 'Bannari Amman Institute of Technology',
    routePoints: ['Tiruppur Bus Stand', 'Perundurai', 'Sathyamangalam', 'BIT Campus'],
    totalSeats: 50,
  },
  {
    id: 'BIT02',
    name: 'BIT02',
    route: 'Gobichettipalayam -> College',
    fromCity: 'Gobichettipalayam',
    toCity: 'Bannari Amman Institute of Technology',
    routePoints: ['Gobichettipalayam New Bus Stand', 'Sathyamangalam', 'Bannari', 'BIT Campus'],
    totalSeats: 50,
  },
  {
    id: 'BIT03',
    name: 'BIT03',
    route: 'Erode -> College',
    fromCity: 'Erode',
    toCity: 'Bannari Amman Institute of Technology',
    routePoints: ['Erode Central Bus Stand', 'Perundurai', 'Sathyamangalam', 'BIT Campus'],
    totalSeats: 50,
  },
  {
    id: 'BIT04',
    name: 'BIT04',
    route: 'Salem -> College',
    fromCity: 'Salem',
    toCity: 'Bannari Amman Institute of Technology',
    routePoints: ['Salem New Bus Stand', 'Bhavani', 'Sathyamangalam', 'BIT Campus'],
    totalSeats: 50,
  },
  {
    id: 'BIT05',
    name: 'BIT05',
    route: 'Karur -> College',
    fromCity: 'Karur',
    toCity: 'Bannari Amman Institute of Technology',
    routePoints: ['Karur Bus Stand', 'Kangeyam', 'Gobichettipalayam', 'BIT Campus'],
    totalSeats: 50,
  },
]
```

---

## `frontend/src/components/Login.jsx`

```javascript
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
          <h1 className="login-title">Campus Bus Booking</h1>
          <p className="login-subtitle">Sign in with your Google account to continue</p>

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
```

---

## `frontend/src/components/Dashboard.jsx`

```javascript
import React, { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { CAMPUS_BUSES } from '../data/campusBuses'
import { db, seedBusesIfMissing } from '../firebase'

const PAGE = {
  DASHBOARD: 'dashboard',
  BUSES: 'buses',
  SEATS: 'seats',
  CONFIRMATION: 'confirmation',
}

const seatClass = (status, isSelected) => {
  if (status === 'booked') return 'seat seat-booked'
  if (isSelected) return 'seat seat-selected'
  return 'seat seat-available'
}

export default function Dashboard({ user, onLogout }) {
  const [page, setPage] = useState(PAGE.DASHBOARD)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [buses, setBuses] = useState([])
  const [selectedBusId, setSelectedBusId] = useState('')
  const [selectedSeat, setSelectedSeat] = useState('')
  const [bookingResult, setBookingResult] = useState(null)
  const [routeIndex, setRouteIndex] = useState(0)

  const selectedBus = useMemo(
    () => buses.find((bus) => bus.id === selectedBusId) || null,
    [buses, selectedBusId]
  )

  const myBookingQuery = useMemo(
    () => query(collection(db, 'bookings'), where('userId', '==', user?.uid || '')),
    [user?.uid]
  )
  const [myBooking, setMyBooking] = useState(null)

  useEffect(() => {
    let unsubscribe

    const init = async () => {
      setLoading(true)
      setError('')
      try {
        await seedBusesIfMissing()

        unsubscribe = onSnapshot(collection(db, 'buses'), (snapshot) => {
          const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
          next.sort((a, b) => a.id.localeCompare(b.id))
          setBuses(next)
        })
      } catch (err) {
        console.error(err)
        setError('Failed to load buses. Check Firebase configuration and rules.')
      } finally {
        setLoading(false)
      }
    }

    init()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user?.uid) return undefined

    const unsubscribe = onSnapshot(myBookingQuery, (snapshot) => {
      const activeBooking = snapshot.docs
        .map((item) => ({ bookingId: item.id, ...item.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0
          const bTime = b.createdAt?.seconds || 0
          return bTime - aTime
        })
        .find((item) => item.status === 'booked')

      setMyBooking(activeBooking || null)
    })

    return () => unsubscribe()
  }, [myBookingQuery, user?.uid])

  useEffect(() => {
    if (!bookingResult?.routePoints?.length) return undefined

    const routeLength = bookingResult.routePoints.length
    const timer = setInterval(() => {
      setRouteIndex((current) => {
        if (current >= routeLength - 1) return current
        return current + 1
      })
    }, 5000)

    return () => clearInterval(timer)
  }, [bookingResult])

  const seatNumbers = useMemo(() => {
    const totalSeats = selectedBus?.totalSeats || 0
    return Array.from({ length: totalSeats }, (_, index) => String(index + 1))
  }, [selectedBus?.totalSeats])

  const handleOpenBus = (busId) => {
    setSelectedBusId(busId)
    setSelectedSeat('')
    setPage(PAGE.SEATS)
  }

  const handleSeatClick = (seatNo) => {
    if (!selectedBus) return
    const status = selectedBus?.seats?.[seatNo]?.status || 'available'
    if (status === 'booked') return
    setSelectedSeat((current) => (current === seatNo ? '' : seatNo))
  }

  const handleConfirmBooking = async () => {
    if (!selectedBus || !selectedSeat || !user?.uid) {
      setError('Choose a bus and seat before confirming booking.')
      return
    }

    setError('')
    setLoading(true)

    const busRef = doc(db, 'buses', selectedBus.id)

    try {
      await runTransaction(db, async (transaction) => {
        const busSnapshot = await transaction.get(busRef)

        if (!busSnapshot.exists()) {
          throw new Error('Bus not found.')
        }

        const busData = busSnapshot.data()
        const seats = { ...(busData.seats || {}) }
        const seatState = seats[selectedSeat] || { status: 'available' }

        if (seatState.status === 'booked') {
          throw new Error('Seat already booked by another user. Please pick another seat.')
        }

        seats[selectedSeat] = {
          status: 'booked',
          bookedBy: user.uid,
          bookedEmail: user.email || '',
        }

        transaction.update(busRef, {
          seats,
          updatedAt: Date.now(),
        })
      })

      await addDoc(collection(db, 'bookings'), {
        userId: user.uid,
        userName: user.name || '',
        email: user.email || '',
        busId: selectedBus.id,
        busName: selectedBus.name,
        route: selectedBus.route,
        fromCity: selectedBus.fromCity,
        toCity: selectedBus.toCity,
        routePoints: selectedBus.routePoints || [],
        seatNumber: selectedSeat,
        status: 'booked',
        createdAt: serverTimestamp(),
      })

      setBookingResult({
        busName: selectedBus.name,
        route: selectedBus.route,
        fromCity: selectedBus.fromCity,
        toCity: selectedBus.toCity,
        routePoints: selectedBus.routePoints || [],
        seatNumber: selectedSeat,
      })
      setRouteIndex(0)
      setSelectedSeat('')
      setPage(PAGE.CONFIRMATION)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Booking failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartBooking = () => {
    setPage(PAGE.BUSES)
    setError('')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-caption">Bannari Amman Institute of Technology</p>
          <h1>Campus Bus Booking</h1>
        </div>
        <button onClick={onLogout} className="ghost-btn">
          Sign out
        </button>
      </header>

      <main className="content-wrap">
        {error && <p className="error-banner">{error}</p>}

        {page === PAGE.DASHBOARD && (
          <section className="panel hero-panel">
            <div className="profile-card">
              <img
                src={user?.photoURL || 'https://ui-avatars.com/api/?name=Student'}
                alt="User"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="kicker">Signed in as</p>
                <h2>{user?.name || 'Student'}</h2>
                <p>{user?.email || 'No email'}</p>
              </div>
            </div>

            <div className="cta-row">
              <button className="primary-btn" onClick={handleStartBooking}>
                Choose Bus
              </button>
              {myBooking && (
                <div className="booking-pill">
                  Current Booking: {myBooking.busName} - Seat {myBooking.seatNumber}
                </div>
              )}
            </div>
          </section>
        )}

        {page === PAGE.BUSES && (
          <section className="panel">
            <div className="section-head">
              <h2>Bus Selection</h2>
              <button className="ghost-btn" onClick={() => setPage(PAGE.DASHBOARD)}>
                Back
              </button>
            </div>

            {loading && buses.length === 0 ? (
              <p>Loading buses...</p>
            ) : (
              <div className="bus-grid">
                {buses.map((bus) => (
                  <button key={bus.id} className="bus-card" onClick={() => handleOpenBus(bus.id)}>
                    <p className="bus-id">{bus.name}</p>
                    <p>{bus.route}</p>
                    <p className="mini">{bus.totalSeats || 50} seats</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {page === PAGE.SEATS && selectedBus && (
          <section className="panel">
            <div className="section-head">
              <h2>
                Seat Booking - {selectedBus.name} ({selectedBus.route})
              </h2>
              <button className="ghost-btn" onClick={() => setPage(PAGE.BUSES)}>
                Back
              </button>
            </div>

            <div className="legend-row">
              <span>
                <i className="legend-dot available" /> Available
              </span>
              <span>
                <i className="legend-dot booked" /> Booked
              </span>
              <span>
                <i className="legend-dot selected" /> Selected
              </span>
            </div>

            <div className="seat-grid" role="list" aria-label="Seat layout">
              {seatNumbers.map((seatNo) => {
                const status = selectedBus?.seats?.[seatNo]?.status || 'available'
                return (
                  <button
                    key={seatNo}
                    className={seatClass(status, selectedSeat === seatNo)}
                    disabled={status === 'booked'}
                    onClick={() => handleSeatClick(seatNo)}
                  >
                    {seatNo}
                  </button>
                )
              })}
            </div>

            <div className="booking-footer">
              <p>
                Selected Seat: <strong>{selectedSeat || 'None'}</strong>
              </p>
              <button className="primary-btn" disabled={!selectedSeat || loading} onClick={handleConfirmBooking}>
                {loading ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </div>
          </section>
        )}

        {page === PAGE.CONFIRMATION && bookingResult && (
          <section className="panel">
            <h2>Booking Confirmed</h2>
            <p className="confirm-line">
              Bus {bookingResult.busName} - Seat {bookingResult.seatNumber}
            </p>
            <p className="confirm-line">Route: {bookingResult.route}</p>

            <div className="tracker-card">
              <h3>Route Tracking</h3>
              <p>
                Start Point: <strong>{bookingResult.fromCity}</strong>
              </p>
              <p>
                Current Location: <strong>{bookingResult.routePoints[routeIndex] || bookingResult.fromCity}</strong>
              </p>
              <p>
                Destination: <strong>{bookingResult.toCity}</strong>
              </p>
            </div>

            <div className="cta-row">
              <button className="primary-btn" onClick={() => setPage(PAGE.BUSES)}>
                Book Another Seat
              </button>
              <button className="ghost-btn" onClick={() => setPage(PAGE.DASHBOARD)}>
                Go To Dashboard
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
```

---

## `frontend/src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --ink: #10233b;
  --ink-soft: #42536a;
  --bg: #f4f7fb;
  --panel: #ffffff;
  --accent: #e75a2f;
  --accent-dark: #c44722;
  --line: #d9e2ee;
  --success: #26a269;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: 'Sora', 'Segoe UI', Tahoma, sans-serif;
  color: var(--ink);
  background:
    radial-gradient(circle at 10% 0%, rgba(19, 109, 175, 0.12), transparent 28%),
    radial-gradient(circle at 94% 4%, rgba(231, 90, 47, 0.16), transparent 26%),
    linear-gradient(165deg, #edf2f9 0%, #f9fbff 50%, #eff4fa 100%);
}

button {
  font: inherit;
}

.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.login-shell {
  width: min(560px, 100%);
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  padding: 34px;
  box-shadow: 0 28px 60px rgba(6, 24, 44, 0.14);
  text-align: center;
}

.login-title {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.5rem);
}

.login-subtitle {
  margin: 10px 0 24px;
  color: var(--ink-soft);
  font-size: 0.96rem;
}

.login-error {
  background: #ffe5e1;
  color: #8c2c1b;
  border: 1px solid #ffcabf;
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 14px;
  text-align: left;
}

.login-google-btn {
  width: 100%;
  border: 0;
  border-radius: 12px;
  padding: 13px 16px;
  color: #fff;
  font-weight: 600;
  background: linear-gradient(180deg, #1d5ea8 0%, #164d89 100%);
  cursor: pointer;
}

.login-google-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.app-shell {
  min-height: 100vh;
  padding-bottom: 24px;
}

.app-header {
  margin: 0 auto;
  max-width: 1100px;
  padding: 20px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.app-caption {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.app-header h1 {
  margin: 4px 0 0;
  font-size: clamp(1.2rem, 2vw, 1.8rem);
}

.content-wrap {
  margin: 0 auto;
  max-width: 1100px;
  padding: 0 18px;
}

.panel {
  background: var(--panel);
  border-radius: 20px;
  border: 1px solid var(--line);
  box-shadow: 0 14px 30px rgba(16, 35, 59, 0.08);
  padding: 20px;
}

.hero-panel {
  display: grid;
  gap: 18px;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-card img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #fff;
  box-shadow: 0 8px 20px rgba(10, 38, 67, 0.2);
}

.kicker {
  margin: 0;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-soft);
}

.profile-card h2 {
  margin: 6px 0 2px;
}

.profile-card p {
  margin: 0;
  color: var(--ink-soft);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-head h2 {
  margin: 0;
  font-size: 1.2rem;
}

.bus-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.bus-card {
  background: linear-gradient(160deg, #11335a 0%, #1a507e 100%);
  color: #fff;
  border: 0;
  border-radius: 16px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.bus-card:hover {
  transform: translateY(-2px);
}

.bus-id {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
}

.bus-card p {
  margin: 0;
}

.bus-card .mini {
  margin-top: 10px;
  font-size: 0.82rem;
  color: #cde3fb;
}

.legend-row {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.legend-row span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.86rem;
}

.legend-dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid #c4cfdd;
}

.legend-dot.available {
  background: #fff;
}

.legend-dot.booked {
  background: var(--success);
  border-color: var(--success);
}

.legend-dot.selected {
  background: #1e77c8;
  border-color: #1e77c8;
}

.seat-grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 8px;
}

.seat {
  border-radius: 10px;
  border: 1px solid #c7d2e2;
  padding: 9px 0;
  font-size: 0.82rem;
  font-weight: 600;
}

.seat-available {
  background: #fff;
  color: #16314e;
  cursor: pointer;
}

.seat-booked {
  background: var(--success);
  border-color: var(--success);
  color: #fff;
  cursor: not-allowed;
}

.seat-selected {
  background: #1e77c8;
  border-color: #1e77c8;
  color: #fff;
  cursor: pointer;
}

.booking-footer {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.booking-footer p {
  margin: 0;
}

.primary-btn,
.ghost-btn {
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  border: 1px solid transparent;
  font-weight: 600;
}

.primary-btn {
  background: var(--accent);
  color: #fff;
}

.primary-btn:hover {
  background: var(--accent-dark);
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.ghost-btn {
  border-color: var(--line);
  background: #fff;
  color: var(--ink);
}

.cta-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.booking-pill {
  background: #eef6ff;
  border: 1px solid #c8def7;
  color: #18487a;
  padding: 8px 10px;
  border-radius: 999px;
  font-size: 0.84rem;
}

.confirm-line {
  margin: 8px 0;
  color: var(--ink-soft);
}

.tracker-card {
  margin-top: 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: linear-gradient(145deg, #f7fbff 0%, #edf5ff 100%);
  padding: 14px;
}

.tracker-card h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.tracker-card p {
  margin: 6px 0;
}

.error-banner {
  margin: 0 0 14px;
  border: 1px solid #ffc2b6;
  background: #ffe8e3;
  color: #a63d22;
  border-radius: 12px;
  padding: 10px 12px;
}

@media (max-width: 900px) {
  .seat-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .seat-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .panel {
    padding: 16px;
  }

  .app-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
```

---

## `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Campus buses: authenticated users can read; updates use transactions for seat booking
    match /buses/{busId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if false;
    }

    // User bookings: each user can read/create docs where userId matches their UID
    match /bookings/{bookingId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow update, delete: if false;
    }
  }
}
```

---

