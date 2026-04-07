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
