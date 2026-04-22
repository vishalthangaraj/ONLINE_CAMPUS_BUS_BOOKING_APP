import React, { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { apiService, shimApiService } from '../services/api'
import { CAMPUS_BUSES } from '../data/campusBuses'
import { Home, History, Calendar, HelpCircle, User as UserIcon, ClipboardList, LogOut, ShieldAlert, CheckCircle, Zap } from 'lucide-react'
import EcoImpactCard from './EcoImpactCard'
import QRCodeModal from './QRCodeModal'
import NotificationTray from './NotificationTray'

const PAGE = {
  DASHBOARD: 'dashboard',
  SEATS: 'seats',
  CONFIRMATION: 'confirmation',
}

const TABS = {
  HOME: 'home',
  HISTORY: 'history',
  SCHEDULE: 'schedule',
  SUPPORT: 'support',
  TRACKER: 'tracker',
  PROFILE: 'profile',
  ATTENDANCE: 'attendance',
}

const getTodayDate = () => {
  const dt = new Date()
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const getWorkingDaysInMonth = () => {
  const dt = new Date()
  const year = dt.getFullYear()
  const month = dt.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  let count = 0
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) count++ // Exclude Sundays
  }
  return count
}

const getCurrentMonthName = () => {
  return new Date().toLocaleString('default', { month: 'long' })
}

const DEFAULT_SEARCH = {
  fromCity: 'All',
  toCity: 'Erode',
  travelDate: getTodayDate(),
}

const DEPARTURE_TIMES = {
  BIT1: '07:30 AM', BIT2: '07:45 AM', BIT3: '08:00 AM', BIT4: '08:15 AM', BIT5: '08:30 AM',
  BIT6: '07:50 AM', BIT7: '08:05 AM', BIT8: '08:20 AM', BIT9: '08:35 AM', BIT10: '08:50 AM',
  BIT11: '07:40 AM', BIT12: '07:55 AM', BIT13: '08:10 AM', BIT14: '08:25 AM', BIT15: '08:40 AM',
  BIT16: '07:35 AM', BIT17: '08:00 AM', BIT18: '08:25 AM', BIT19: '08:45 AM', BIT20: '09:00 AM',
}

const TRACKER_ROUTE = ['Campus', 'Sathyamangalam', 'Erode']

const seatClass = (status, isSelected) => {
  if (status === 'booked') return 'seat seat-booked'
  if (isSelected) return 'seat seat-selected'
  return 'seat seat-available'
}

const getSeatsLeft = (bus) => {
  const seats = Object.values(bus?.seats || {})
  const booked = seats.filter((seat) => seat?.status === 'booked').length
  return Math.max((bus?.totalSeats || 50) - booked, 0)
}

const normalizeBusNumber = (raw) => {
  const text = String(raw || '').toUpperCase()
  const match = text.match(/BIT(\d+)/)
  if (match) return `BIT${match[1]}`
  return text || 'BIT1'
}

const getBusStatus = (bus) => {
  if (!bus) return 'Available'
  if (bus.id === 'BIT3') return 'On the way'
  if (getSeatsLeft(bus) <= 0) return 'Full'
  return 'Available'
}

const formatDate = (value) => {
  if (!value) return '-'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleDateString('en-GB')
}

const bookingDateText = (createdAt, fallbackDate) => {
  if (createdAt?.seconds) {
    return new Date(createdAt.seconds * 1000).toLocaleDateString('en-GB')
  }
  return formatDate(fallbackDate)
}

const LOCAL_MOCK_SEAT_KEY_PREFIX = 'cb_mock_bus_state_'
const LOCAL_BOOKINGS_KEY = 'cb_local_bookings'

const isFirestoreDisabledError = (err) => {
  const code = String(err?.code || '').toLowerCase()
  const message = String(err?.message || '').toLowerCase()
  return code.includes('failed-precondition') || message.includes('firestore.googleapis.com')
}

const readLocalMockSeats = (travelDate) => {
  try {
    const raw = localStorage.getItem(`${LOCAL_MOCK_SEAT_KEY_PREFIX}${travelDate}`)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeLocalMockSeats = (travelDate, seatsData) => {
  localStorage.setItem(`${LOCAL_MOCK_SEAT_KEY_PREFIX}${travelDate}`, JSON.stringify(seatsData || {}))
}

const readLocalBookings = () => {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeLocalBookings = (bookings) => {
  localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(bookings || []))
}

const getBookingErrorMessage = (err) => {
  return err?.response?.data?.error || err.message || 'Booking failed. Please try again.'
}

export default function Dashboard({ user, onLogout, onUserUpdate }) {
  const [page, setPage] = useState(PAGE.DASHBOARD)
  const [activeTab, setActiveTab] = useState(TABS.HOME)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  // Profile State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
    year: user?.year || '',
  })
  const [supportMessage, setSupportMessage] = useState('')
  const [supportSent, setSupportSent] = useState(false)
  const [search, setSearch] = useState(DEFAULT_SEARCH)

  const [buses, setBuses] = useState([])
  const [selectedBusId, setSelectedBusId] = useState('')
  const [selectedSeats, setSelectedSeats] = useState([])
  const [mockBookings, setMockBookings] = useState([])
  const [mockBusSeats, setMockBusSeats] = useState({})
  const [bookingResult, setBookingResult] = useState(null)
  const [routeIndex, setRouteIndex] = useState(0)
  const [trackerIndex, setTrackerIndex] = useState(0)
  const [bookingHistory, setBookingHistory] = useState([])
  const [firestoreFallbackMode, setFirestoreFallbackMode] = useState(false)
  const [dynamicNextDeparture, setDynamicNextDeparture] = useState(DEPARTURE_TIMES.BIT1)

  // Innovation State
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [selectedBookingForQR, setSelectedBookingForQR] = useState(null)
  const [isSOSActive, setIsSOSActive] = useState(false)
  const [sosCountdown, setSosCountdown] = useState(5)
  const [notifications, setNotifications] = useState([])
  const [assistRequired, setAssistRequired] = useState(false)
  const [feedbackSentiments, setFeedbackSentiments] = useState([])
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false)

  const selectedBus = useMemo(() => {
    const mockBuses = {
      BIT1: { from: 'Somanur' }, BIT2: { from: 'S R Nagar' }, BIT3: { from: 'Nataraj Theatre' },
      BIT4: { from: 'Perumanallur' }, BIT5: { from: 'Avinashi' }, BIT6: { from: 'Kovilpalayam' },
      BIT7: { from: 'Periyanaickenpalayam' }, BIT8: { from: 'Mettupalayam' }, BIT9: { from: 'Alankombu' },
      BIT10: { from: 'Chithode' }, BIT11: { from: 'Thudupathi' }, BIT12: { from: 'Komarapalayam' },
      BIT13: { from: 'Gandhi Nagar' }, BIT14: { from: 'Gobi' }, BIT15: { from: 'Gandhipuram' },
      BIT16: { from: 'Anthiyur' }, BIT17: { from: 'Kunnathur' }, BIT18: { from: 'Bhavanisagar' },
      BIT19: { from: 'Sirumugai' }, BIT20: { from: 'Bannari Amman Temple' }
    };
    if (mockBuses[selectedBusId]) {
      return {
        id: selectedBusId,
        name: `Bus ${selectedBusId}`,
        fromCity: mockBuses[selectedBusId].from,
        toCity: 'College',
        route: `${mockBuses[selectedBusId].from} -> College`,
        totalSeats: 45,
        isMock: true
      };
    }
    return buses.find((bus) => bus.id === selectedBusId) || null;
  }, [buses, selectedBusId])

  const sortedBuses = useMemo(() => {
    return [...buses].sort((a, b) => {
      const aNum = Number(normalizeBusNumber(a.name).replace('BIT', ''))
      const bNum = Number(normalizeBusNumber(b.name).replace('BIT', ''))
      return aNum - bNum
    })
  }, [buses])

  const availableBuses = useMemo(() => {
    let mockAvailable = 0;
    const mockBusIds = Array.from({ length: 20 }, (_, i) => `BIT${i + 1}`);
    mockBusIds.forEach(id => {
      if ((mockBusSeats[id]?.length || 0) < 45) mockAvailable++;
    });
    return sortedBuses.filter((bus) => getBusStatus(bus) !== 'Full').length + mockAvailable;
  }, [sortedBuses, mockBusSeats])

  const totalSeatsAvailable = useMemo(() => {
    let mockTotal = 0;
    const mockBusIds = Array.from({ length: 20 }, (_, i) => `BIT${i + 1}`);
    mockBusIds.forEach(id => {
      const booked = mockBusSeats[id]?.length || 0;
      mockTotal += (45 - booked);
    });
    const fbTotal = sortedBuses.reduce((sum, bus) => sum + getSeatsLeft(bus), 0);
    return fbTotal + mockTotal;
  }, [sortedBuses, mockBusSeats])

  const nextDeparture = useMemo(() => {
    return dynamicNextDeparture
  }, [dynamicNextDeparture])

  useEffect(() => {
    const times = Object.values(DEPARTURE_TIMES)
    const interval = setInterval(() => {
      const randomTime = times[Math.floor(Math.random() * times.length)]
      setDynamicNextDeparture(randomTime)
    }, 8000) // Change every 8 seconds
    return () => clearInterval(interval)
  }, [])

  const filteredBuses = useMemo(() => {
    return sortedBuses.filter((bus) => {
      const fromOk = bus.fromCity.toLowerCase() === search.fromCity.toLowerCase()
      const toOk = bus.toCity.toLowerCase() === search.toCity.toLowerCase()
      return fromOk && toOk
    })
  }, [search.fromCity, search.toCity, sortedBuses])

  const seatNumbers = useMemo(() => {
    const totalSeats = selectedBus?.totalSeats || (selectedBus?.isMock ? 45 : 0)
    return Array.from({ length: totalSeats }, (_, index) => `S${index + 1}`)
  }, [selectedBus?.totalSeats, selectedBus?.isMock])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setError('')
      try {
        await shimApiService.seedBuses()
        const response = await shimApiService.getBuses()
        const mapped = response.data.map((item) => ({
          id: item._id,
          ...item,
          routePoints: TRACKER_ROUTE,
        }))
        setBuses(mapped)
      } catch (err) {
        setFirestoreFallbackMode(true)
        setBuses(CAMPUS_BUSES.map((bus) => ({ ...bus })))
        setError('Running in local booking mode fallback.')
      } finally {
        setLoading(false)
      }
    }
    init()
    
    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:4000')
    socket.on('buses-update', (updatedBuses) => {
      const mapped = updatedBuses.map((item) => ({
        id: item._id, ...item, routePoints: TRACKER_ROUTE,
      }))
      setBuses(mapped)
    })
    socket.on('mock-state-update', (data) => {
      setMockBusSeats(data.seats || {})
    })
    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    if (!search?.travelDate) return undefined
    if (firestoreFallbackMode) {
      setMockBusSeats(readLocalMockSeats(search.travelDate))
      return undefined
    }
    const fetchMock = async () => {
      try {
        const res = await shimApiService.getMockState(search.travelDate)
        setMockBusSeats(res.data || {})
      } catch (err) { }
    }
    fetchMock()
  }, [firestoreFallbackMode, search.travelDate])

  useEffect(() => {
    if (!(user?.uid || user?._id)) return undefined
    if (firestoreFallbackMode) {
      const history = readLocalBookings()
        .filter((item) => item.userId === (user?.uid || user?._id))
        .sort((a, b) => (b.createdAtTs || 0) - (a.createdAtTs || 0))
      setBookingHistory(history)
      return undefined
    }
    const fetchHistory = async () => {
      try {
        const res = await shimApiService.getUserBookings(user?.uid || user?._id)
        setBookingHistory(res.data || [])
      } catch (err) { }
    }
    fetchHistory()
  }, [firestoreFallbackMode, user?.uid, user?._id, page, activeTab])

  // Fetch full profile info when activeTab becomes PROFILE
  useEffect(() => {
    if (activeTab === TABS.PROFILE) {
      const fetchProfile = async () => {
        try {
          const res = await apiService.getProfile()
          setProfileData({
            name: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            department: res.data.department || '',
            year: res.data.year || '',
          })
        } catch (err) {
          console.error('Failed to fetch profile', err)
        }
      }
      fetchProfile()
    }
  }, [activeTab])

  useEffect(() => {
    const timer = setInterval(() => {
      setTrackerIndex((current) => (current + 1) % TRACKER_ROUTE.length)
    }, 3500)

    return () => clearInterval(timer)
  }, [])

  // Proximity Notification Effect
  useEffect(() => {
    if (activeTab === TABS.TRACKER) {
      const timer = setTimeout(() => {
        setNotifications([{
          type: 'proximity',
          title: 'Bus Approaching Stop',
          message: 'Bus BIT3 is currently 250m away from Sathyamangalam stop. Prepare to board!'
        }])
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [activeTab])

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

  const openBusBooking = (busId) => {
    setSelectedBusId(busId)
    setSelectedSeats([])
    setBookingResult(null)
    setRouteIndex(0)
    setError('')
    setPage(PAGE.SEATS)
  }

  const handleSeatClick = (seatNo) => {
    if (!selectedBus) return
    const isMockBooked = mockBusSeats[selectedBus.id]?.includes(seatNo)
    const status = isMockBooked ? 'booked' : (selectedBus?.seats?.[seatNo]?.status || 'available')
    if (status === 'booked') return

    setSelectedSeats((current) =>
      current.includes(seatNo) ? [] : [seatNo]
    )
  }

  const handleConfirmBooking = async () => {
    const userId = user?.uid || user?._id
    if (!selectedBus || selectedSeats.length === 0 || !userId) {
      setError('Select a bus and at least one seat before confirming the booking.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const allBookings = [...bookingHistory];
      const hasBookingForSameDay = allBookings.some(
        booking => booking.travelDate === search.travelDate && booking.userId === (user?.uid || user?._id) && booking.status !== 'cancelled'
      );

      if (hasBookingForSameDay) {
        throw new Error('You already have a booking for this date. Only one booking per day is allowed.');
      }

      let useLocalFallback = firestoreFallbackMode;

      if (!useLocalFallback && !selectedBus.isMock) {
        try {
          await shimApiService.createBooking({
            userId: user?.uid || user?._id,
            userName: user.name || '',
            email: user.email || '',
            busId: selectedBus.id,
            busName: selectedBus.name,
            route: selectedBus.route,
            fromCity: selectedBus.fromCity,
            toCity: selectedBus.toCity,
            seatNumber: selectedSeats.join(', '),
            travelDate: search.travelDate,
            departureTime: DEPARTURE_TIMES[selectedBus.name] || DEPARTURE_TIMES.BIT1,
            status: 'booked'
          })
        } catch (err) {
          if (!err.response && !err.message.includes('already')) {
            useLocalFallback = true; setFirestoreFallbackMode(true);
          } else throw err;
        }
      } else if (!useLocalFallback && selectedBus.isMock) {
        try {
          await shimApiService.updateMockState(search.travelDate, {
            busId: selectedBus.id,
            selectedSeats: selectedSeats
          })
          await shimApiService.createBooking({
            userId: user?.uid || user?._id,
            userName: user.name || '',
            email: user.email || '',
            busId: selectedBus.id,
            busName: selectedBus.name,
            route: selectedBus.route,
            fromCity: selectedBus.fromCity,
            toCity: selectedBus.toCity,
            seatNumber: selectedSeats.join(', '),
            travelDate: search.travelDate,
            departureTime: DEPARTURE_TIMES.BIT1,
            status: 'booked'
          })
        } catch (err) {
          if (!err.response && !err.message.includes('already')) {
            useLocalFallback = true; setFirestoreFallbackMode(true);
          } else throw err;
        }
      }

      if (useLocalFallback) {
        const seatsData = readLocalMockSeats(search.travelDate)
        for (const seatNo of selectedSeats) {
          if ((seatsData[selectedBus.id] || []).includes(seatNo)) {
            throw new Error(`Seat ${seatNo} on ${selectedBus.name} is already booked.`)
          }
        }

        seatsData[selectedBus.id] = [...(seatsData[selectedBus.id] || []), ...selectedSeats]
        writeLocalMockSeats(search.travelDate, seatsData)
        setMockBusSeats(seatsData)

        const nextBooking = {
          bookingId: `local-${Date.now()}`,
          userId: user?.uid || user?._id,
          userName: user.name || '',
          email: user.email || '',
          busId: selectedBus.id,
          busName: selectedBus.name,
          route: selectedBus.route,
          fromCity: selectedBus.fromCity,
          toCity: selectedBus.toCity,
          routePoints: selectedBus.routePoints || TRACKER_ROUTE,
          seatNumber: selectedSeats.join(', '),
          travelDate: search.travelDate,
          departureTime: DEPARTURE_TIMES[selectedBus.name] || DEPARTURE_TIMES.BIT1,
          status: 'booked',
          assistRequired: assistRequired,
          createdAtTs: Date.now(),
        }

        const allLocalBookings = readLocalBookings()
        const updatedLocalBookings = [...allLocalBookings, nextBooking]
        writeLocalBookings(updatedLocalBookings)

        const mine = updatedLocalBookings
          .filter((item) => item.userId === (user?.uid || user?._id))
          .sort((a, b) => (b.createdAtTs || 0) - (a.createdAtTs || 0))
        setBookingHistory(mine)
        setError('Firestore API is disabled. Booking saved locally in this browser.')
      }

      setBookingResult({
        busName: selectedBus.name,
        route: selectedBus.route,
        fromCity: selectedBus.fromCity,
        toCity: selectedBus.toCity,
        routePoints: selectedBus.routePoints || TRACKER_ROUTE,
        seatNumber: selectedSeats.join(', '),
        assistRequired: assistRequired,
      })
      
      // Instant Booking Notification
      setNotifications(prev => [...prev, {
        type: 'booking',
        title: 'Booking Confirmed! 🎫',
        message: `Your seat ${selectedSeats.join(', ')} on ${selectedBus.name} is successfully reserved. Pickup at ${DEPARTURE_TIMES[selectedBus.name] || DEPARTURE_TIMES.BIT1}.`
      }])

      setRouteIndex(0)
      setSelectedSeats([])
      setAssistRequired(false)
      setActiveTab(TABS.HISTORY)
      setPage(PAGE.CONFIRMATION)
    } catch (err) {
      console.error(err)
      setError(getBookingErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return
    
    setLoading(true)
    setError('')
    try {
      await shimApiService.cancelBooking(bookingId)
      const res = await shimApiService.getUserBookings(user?.uid || user?._id)
      setBookingHistory(res.data || [])
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.error || 'Cancellation failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await apiService.updateProfile(profileData)
      setSuccessMsg('Profile updated successfully!')
      
      // Update local user state
      const updatedUser = { ...user, ...res.data }
      localStorage.setItem('cb_user', JSON.stringify(updatedUser))
      if (onUserUpdate) onUserUpdate(updatedUser)
      
    } catch (err) {
      console.error('Profile Update Error:', err)
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Failed to update profile.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (field, value) => {
    setSearch((current) => ({ ...current, [field]: value }))
  }

  const handleSearchBus = () => {
    document.getElementById('bus-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSupportSubmit = (event) => {
    event.preventDefault()
    if (!supportMessage.trim()) return
    
    setIsAnalyzingSentiment(true)
    
    // AI Sentiment Simulation
    setTimeout(() => {
      const isNegative = supportMessage.toLowerCase().includes('bad') || 
                         supportMessage.toLowerCase().includes('late') || 
                         supportMessage.toLowerCase().includes('error');
      
      const sentimentResult = {
        id: Date.now(),
        message: supportMessage,
        sentiment: isNegative ? 'Negative' : 'Positive',
        date: new Date().toLocaleString()
      }
      
      setFeedbackSentiments(prev => [sentimentResult, ...prev])
      setIsAnalyzingSentiment(false)
      setSupportSent(true)
      setSupportMessage('')
    }, 2000)
  }

  const handleOpenQR = (booking) => {
    setSelectedBookingForQR(booking)
    setIsQRModalOpen(true)
  }

  const handleSOSClick = () => {
    setIsSOSActive(true)
    setSosCountdown(5)
    
    const timer = setInterval(() => {
      setSosCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const trackerProgress = (trackerIndex / (TRACKER_ROUTE.length - 1)) * 100

  return (
    <div className="app-layout">
      <aside className="left-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">BIT</div>
          <div className="sidebar-title">
            <strong>Campus Bus</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`sidebar-link ${activeTab === TABS.HOME ? 'is-active' : ''}`} onClick={() => setActiveTab(TABS.HOME)}>
            <Home size={18} /> <span>Home</span>
          </button>
          <button className={`sidebar-link ${activeTab === TABS.HISTORY ? 'is-active' : ''}`} onClick={() => setActiveTab(TABS.HISTORY)}>
            <History size={18} /> <span>Booking History</span>
          </button>
          <button className={`sidebar-link ${activeTab === TABS.SCHEDULE ? 'is-active' : ''}`} onClick={() => setActiveTab(TABS.SCHEDULE)}>
            <Calendar size={18} /> <span>Bus Schedule</span>
          </button>
          <button className={`sidebar-link ${activeTab === TABS.SUPPORT ? 'is-active' : ''}`} onClick={() => setActiveTab(TABS.SUPPORT)}>
            <HelpCircle size={18} /> <span>Support & Help</span>
          </button>
          <button className={`sidebar-link ${activeTab === TABS.PROFILE ? 'is-active' : ''}`} onClick={() => setActiveTab(TABS.PROFILE)}>
            <UserIcon size={18} /> <span>My Profile</span>
          </button>
          <button className={`sidebar-link ${activeTab === TABS.ATTENDANCE ? 'is-active' : ''}`} onClick={() => setActiveTab(TABS.ATTENDANCE)}>
            <ClipboardList size={18} /> <span>Attendance</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link logout-link" onClick={onLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <div className="main-content-wrapper">
        <header className="top-header">
          <div className="header-breadcrumbs">
            <h2 className="header-title">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
          </div>
          <div className="header-user-info">
             {user?.photoURL ? (
               <img className="bit-user-avatar" src={user.photoURL} alt={user?.name || 'User'} referrerPolicy="no-referrer" />
             ) : (
               <span className="bit-user-avatar">{(user?.name || 'BIT').slice(0, 1)}</span>
             )}
             <span className="header-user-name">{user?.name || 'Student'}</span>
          </div>
        </header>

        {error && <p className="error-banner">{error}</p>}
        {supportSent && <p className="success-banner">Support request sent successfully. We will contact you soon.</p>}

        <main className="dashboard-content">
          {activeTab === TABS.HOME && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <EcoImpactCard bookingCount={bookingHistory.length} />
              </div>

        <section className="choose-panel">
          <div className="section-heading">
            <h3>Bus Search</h3>
            <span />
          </div>

          <div className="search-bar">
            <select value={search.fromCity} onChange={(event) => handleSearchChange('fromCity', event.target.value)}>
              <option value="All">All Routes</option>
              <option value="Somanur">Somanur</option>
              <option value="S R Nagar">Tiruppur (S R Nagar)</option>
              <option value="Nataraj Theatre">Tiruppur (Old Bus Stand)</option>
              <option value="Perumanallur">Tiruppur (New Bus Stand)</option>
              <option value="Avinashi">Avinashi</option>
              <option value="Kovilpalayam">Saravanampatti / Annur</option>
              <option value="Periyanaickenpalayam">Thudiyalur / Periyanaickenpalayam</option>
              <option value="Mettupalayam">Mettupalayam / Karamadai</option>
              <option value="Alankombu">Sirumugai</option>
              <option value="Chithode">Erode / Chithode</option>
              <option value="Thudupathi">Perundurai</option>
              <option value="Komarapalayam">Komarapalayam / Bhavani</option>
              <option value="Gandhi Nagar">Sathyamangalam Town</option>
              <option value="Gobi">Gobichettipalayam</option>
              <option value="Gandhipuram">Coimbatore (Gandhipuram)</option>
              <option value="Anthiyur">Anthiyur</option>
              <option value="Bhavanisagar">Bhavanisagar</option>
              <option value="Sirumugai">Sirumugai Express</option>
              <option value="Bannari Amman Temple">Bannari Temple</option>
            </select>
            <select value="Campus" disabled title="Destination is fixed to Campus">
              <option value="Campus">Campus</option>
            </select>
            <input
              type="date"
              value={search.travelDate}
              min={getTodayDate()}
              max={getTodayDate()}
              onChange={(event) => handleSearchChange('travelDate', event.target.value)}
              title="Bookings are restricted to today's date only"
            />
            <button className="mock-primary-btn search-button" onClick={handleSearchBus}>
              Search Bus
            </button>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="bus-list-column" id="bus-grid">
            <style>{`
              .custom-bus-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 10px 0; }
              .custom-bus-card { background: #ffffff; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; display: flex; flex-direction: column; gap: 16px; position: relative; overflow: hidden; }
              .custom-bus-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(90deg, #3b82f6, #10b981); opacity: 0; transition: opacity 0.3s ease; }
              .custom-bus-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border-color: #cbd5e1; }
              .custom-bus-card:hover::before { opacity: 1; }
              .custom-bus-header { display: flex; justify-content: space-between; align-items: flex-start; }
              .custom-bus-title { display: flex; align-items: center; gap: 12px; }
              .custom-bus-icon { font-size: 28px; background: #eff6ff; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 14px; }
              .custom-bus-name { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
              .custom-bus-number { color: #64748b; font-size: 0.85rem; font-weight: 500; margin-top: 2px; }
              .custom-status-badge { background: #ecfdf5; color: #059669; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; padding: 6px 12px; border-radius: 100px; letter-spacing: 0.05em; border: 1px solid #a7f3d0; }
              .custom-status-badge.full { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
              .custom-bus-route { padding: 16px 0; border-top: 1px dashed #e2e8f0; border-bottom: 1px dashed #e2e8f0; color: #475569; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 10px; }
              .custom-route-arrow { color: #3b82f6; }
              .custom-book-btn { background: #f8fafc; color: #3b82f6; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
              .custom-book-btn:hover { background: #3b82f6; color: #ffffff; border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
            `}</style>
            <div className="custom-bus-grid">
              {Array.from({ length: 20 }, (_, i) => {
                const id = `BIT${i + 1}`;
                const cityMap = {
                  BIT1: 'Somanur', BIT2: 'S R Nagar', BIT3: 'Nataraj Theatre', BIT4: 'Perumanallur', BIT5: 'Avinashi',
                  BIT6: 'Kovilpalayam', BIT7: 'Periyanaickenpalayam', BIT8: 'Mettupalayam', BIT9: 'Alankombu',
                  BIT10: 'Chithode', BIT11: 'Thudupathi', BIT12: 'Komarapalayam', BIT13: 'Gandhi Nagar',
                  BIT14: 'Gobi', BIT15: 'Gandhipuram', BIT16: 'Anthiyur', BIT17: 'Kunnathur', BIT18: 'Bhavanisagar',
                  BIT19: 'Sirumugai', BIT20: 'Bannari Amman Temple'
                };
                return { id, from: cityMap[id] };
              }).filter((bus) => search.fromCity === 'All' || bus.from === search.fromCity).map((bus) => (
                <div key={bus.id} className="custom-bus-card" onClick={() => openBusBooking(bus.id)}>
                  <div className="custom-bus-header">
                    <div className="custom-bus-title">
                      <div className="custom-bus-icon">🚌</div>
                      <div>
                        <h4 className="custom-bus-name">Bus {bus.id}</h4>
                        <div className="custom-bus-number">{45 - (mockBusSeats[bus.id]?.length || 0)} Seats Left</div>
                      </div>
                    </div>
                    <span className={`custom-status-badge ${(mockBusSeats[bus.id]?.length || 0) >= 45 ? 'full' : ''}`}>
                      {(mockBusSeats[bus.id]?.length || 0) >= 45 ? 'Full' : 'Available'}
                    </span>
                  </div>
                  <div className="custom-bus-route">
                    <span style={{ fontSize: '1.1rem' }}>📍</span>
                    <span>{bus.from}</span>
                    <span className="custom-route-arrow">→</span>
                    <span>College</span>
                  </div>
                  <button className="custom-book-btn" onClick={(e) => { e.stopPropagation(); openBusBooking(bus.id); }}>
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          </div>

          <aside className="tracker-column">
            <section className="tracker-panel">
              <div className="tracker-header">
                <h3>Live Bus Tracker</h3>
              </div>
              <div className="tracker-map">
                <div className="tracker-route-line" />
                <div className="tracker-mover" style={{ top: `${20 + trackerProgress * 1.9}px` }} />
                <div className={`tracker-pin tracker-pin-start ${trackerIndex === 0 ? 'is-active' : ''}`}>Campus</div>
                <div className={`tracker-pin tracker-pin-mid ${trackerIndex === 1 ? 'is-active' : ''}`}>Sathyamangalam</div>
                <div className={`tracker-pin tracker-pin-end ${trackerIndex === 2 ? 'is-active' : ''}`}>Erode</div>
              </div>
              <div className="tracker-footer" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="tracker-bus-icon">B</div>
                  <div>
                    <strong>Bus BIT3 - Currently on the way</strong>
                    <p>Active stop: {TRACKER_ROUTE[trackerIndex]}</p>
                  </div>
                </div>
                <a 
                  href="https://www.google.com/maps/dir/?api=1&destination=Bannari+Amman+Institute+of+Technology,+Sathyamangalam" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="mock-primary-btn" 
                  style={{ textDecoration: 'none', textAlign: 'center', marginTop: '12px' }}
                >
                  Track on Google Maps
                </a>
              </div>
            </section>

            {/* SOS Floating Button */}
            <div className={`sos-container ${isSOSActive ? 'sos-active' : ''}`}>
              <style>{`
                .sos-container { position: fixed; bottom: 30px; right: 30px; z-index: 1000; }
                .sos-btn { background: #ef4444; color: white; width: 60px; height: 60px; border-radius: 50%; border: none; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
                .sos-btn:hover { background: #dc2626; transform: scale(1.1); }
                .sos-alert-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(239, 68, 68, 0.95); z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; text-align: center; }
                .sos-countdown { font-size: 8rem; font-weight: 900; margin: 20px 0; }
              `}</style>
              
              <button className="sos-btn" onClick={handleSOSClick} title="Emergency SOS">
                <ShieldAlert size={30} />
              </button>

              {isSOSActive && (
                <div className="sos-alert-overlay">
                  <ShieldAlert size={100} />
                  <h1 style={{ fontSize: '3rem', marginTop: '20px' }}>EMERGENCY ALERT</h1>
                  <p style={{ fontSize: '1.5rem' }}>Broadcasting location to Campus Security...</p>
                  <div className="sos-countdown">{sosCountdown > 0 ? sosCountdown : 'SENT'}</div>
                  <button 
                    className="mock-primary-btn" 
                    style={{ background: 'white', color: '#ef4444' }}
                    onClick={() => setIsSOSActive(false)}
                  >
                    Cancel Alert
                  </button>
                </div>
              )}
            </div>
          </aside>
        </section>
      </>
      )}

        {activeTab === TABS.HISTORY ? (
          <section className="tab-panel">
            <h3>My Booking History</h3>
            {bookingHistory.length === 0 ? (
              <p className="tiny-text dark">No previous bookings found.</p>
            ) : (
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Bus Number</th>
                      <th>Date</th>
                      <th>Route</th>
                      <th>Seat Number</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingHistory.map((item) => (
                      <tr key={item._id || item.bookingId}>
                        <td>{normalizeBusNumber(item.busName || item.busId)}</td>
                        <td>{bookingDateText(item.createdAt, item.travelDate)}</td>
                        <td>{item.fromCity} -&gt; {item.toCity}</td>
                        <td>{item.seatNumber}</td>
                        <td>
                          <span className={`status-pill status-${String(item.status || 'booked').toLowerCase()}`}>
                            {item.status || 'booked'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {item.assistRequired && (
                              <span title="Special Assistance Required" style={{ fontSize: '1.2rem' }}>♿</span>
                            )}
                            <button 
                              className="mock-secondary-btn" 
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              onClick={() => handleOpenQR(item)}
                            >
                              View Ticket
                            </button>
                            {/* Cancellation Disabled as per request */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        <QRCodeModal 
          isOpen={isQRModalOpen} 
          onClose={() => setIsQRModalOpen(false)} 
          booking={selectedBookingForQR} 
        />

        <style>{`
          .mini-cancel-btn {
            background: #ffe4e6;
            color: #e11d48;
            border: 1px solid #fecdd3;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
          }
          .mini-cancel-btn:hover {
            background: #e11d48;
            color: #ffffff;
            border-color: #e11d48;
          }
        `}</style>

        {activeTab === TABS.SCHEDULE ? (
          <section className="tab-panel">
            <h3>Bus Schedule</h3>
            <p className="tiny-text dark">Filtered by route {search.fromCity} -&gt; {search.toCity} and date {formatDate(search.travelDate)}.</p>
            <div className="schedule-grid">
              {filteredBuses.map((bus) => (
                <article key={`schedule-${bus.id}`} className="schedule-card">
                  <strong>{bus.name}</strong>
                  <p>{bus.fromCity} -&gt; {bus.toCity}</p>
                  <p>Departure: {DEPARTURE_TIMES[bus.name] || DEPARTURE_TIMES.BIT1}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === TABS.SUPPORT ? (
          <section className="tab-panel">
            <h3>Support & Help</h3>
            <div className="support-layout">
              <div className="faq-card">
                <h4>FAQ</h4>
                <p><strong>How do I book a seat?</strong> Select a bus and click Book Seat.</p>
                <p><strong>Can I see live location?</strong> Yes, the tracker updates in real time.</p>
                <p><strong>What if seat is already booked?</strong> You will see a clear error and can pick another seat.</p>
              </div>
              <form className="support-form" onSubmit={handleSupportSubmit}>
                <label htmlFor="support-msg">Message</label>
                <textarea
                  id="support-msg"
                  rows="4"
                  value={supportMessage}
                  onChange={(event) => setSupportMessage(event.target.value)}
                  placeholder="Describe your issue..."
                />
                <button 
                  className="mock-primary-btn" 
                  type="submit" 
                  disabled={isAnalyzingSentiment}
                >
                  {isAnalyzingSentiment ? 'AI Analyzing Sentiment...' : 'Send Message'}
                </button>
              </form>
            </div>

            {feedbackSentiments.length > 0 && (
              <div style={{ marginTop: '30px' }}>
                <h4 style={{ marginBottom: '15px' }}>AI Sentiment Feedback Log</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {feedbackSentiments.map(log => (
                    <div key={log.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.date}</span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold', 
                          padding: '2px 8px', 
                          borderRadius: '100px',
                          background: log.sentiment === 'Positive' ? '#ecfdf5' : '#fef2f2',
                          color: log.sentiment === 'Positive' ? '#059669' : '#ef4444'
                        }}>
                          AI Tone: {log.sentiment}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b' }}>{log.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : null}

        {activeTab === TABS.PROFILE ? (
          <section className="tab-panel">
            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-avatar">
                   {user?.photoURL ? (
                     <img src={user.photoURL} alt="Avatar" />
                   ) : (
                     <div className="avatar-placeholder">{user?.name?.[0] || 'U'}</div>
                   )}
                </div>
                <div className="profile-info-header">
                  <h3>{user?.name}</h3>
                  <p>{user?.role?.toUpperCase()}</p>
                </div>
              </div>

              <form className="profile-form" onSubmit={handleUpdateProfile}>
                {successMsg && <div className="success-banner">{successMsg}</div>}
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      value={profileData.name} 
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email (Verified)</label>
                    <input type="text" value={profileData.email} disabled className="disabled-input" />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CSE, IT, Mechanical"
                      value={profileData.department} 
                      onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Year of Study</label>
                    <select 
                      value={profileData.year} 
                      onChange={(e) => setProfileData({...profileData, year: e.target.value})}
                    >
                      <option value="">Select Year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="Enter 10-digit number"
                      value={profileData.phone} 
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="save-profile-btn" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        ) : null}

        {activeTab === TABS.ATTENDANCE ? (
          <section className="tab-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Student Attendance - {getCurrentMonthName()}</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span className="sync-badge">
                  <CheckCircle size={14} /> Academic Sync: Active
                </span>
                <span className="sync-badge erp">
                  <Zap size={14} /> ERP Bridge: Connected
                </span>
              </div>
            </div>

            <style>{`
              .sync-badge {
                display: flex;
                align-items: center;
                gap: 6px;
                background: #f0fdf4;
                color: #15803d;
                padding: 6px 14px;
                border-radius: 100px;
                font-size: 0.75rem;
                font-weight: 700;
                border: 1px solid #bbf7d0;
              }
              .sync-badge.erp {
                background: #eff6ff;
                color: #1d4ed8;
                border-color: #bfdbfe;
              }
            `}</style>
            <div className="profile-card">
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
                <h4>Monthly Attendance Overview</h4>
                <p>Calculated based on {getWorkingDaysInMonth()} working days in {getCurrentMonthName()}.</p>
                <div style={{ marginTop: '24px', display: 'flex', gap: '30px', justifyContent: 'center', background: '#f1f5f9', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{ margin: 0, color: '#059669', fontSize: '2.5rem' }}>
                      {(() => {
                        const currentMonthStr = new Date().toISOString().slice(0, 7);
                        const monthBooked = bookingHistory.filter(b => b.status === 'booked' && b.travelDate.startsWith(currentMonthStr)).length;
                        const wDays = getWorkingDaysInMonth();
                        return wDays > 0 ? Math.min(Math.round((monthBooked / wDays) * 100), 100) : 0;
                      })()}%
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Monthly Attendance</span>
                  </div>
                  <div style={{ textAlign: 'center', borderLeft: '2px solid #cbd5e1', paddingLeft: '30px' }}>
                    <h2 style={{ margin: 0, color: '#3b82f6', fontSize: '2.5rem' }}>
                      {bookingHistory.filter(b => b.status === 'booked' && b.travelDate.startsWith(new Date().toISOString().slice(0, 7))).length}
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Trips This Month</span>
                  </div>
                </div>
              </div>

              {bookingHistory.filter(b => b.status === 'booked').length > 0 && (
                <div className="history-table-wrap" style={{ marginTop: '30px' }}>
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Bus & Route</th>
                        <th>Sync Type</th>
                        <th>ERP Status</th>
                        <th>Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingHistory.filter(b => b.status === 'booked').map((record) => (
                        <tr key={record.bookingId || record.id}>
                          <td>{formatDate(record.travelDate)}</td>
                          <td>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{record.busName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{record.route}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>Biotic/Digital ID</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontSize: '0.8rem', fontWeight: '800' }}>
                              <Zap size={12} /> Sync Success
                            </div>
                          </td>
                          <td>
                            <span className="status-badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #10b981' }}>
                              Present
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : null}

      <style>{`
          .profile-card {
            background: #ffffff;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            margin-top: 10px;
          }
          .profile-header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 32px;
          }
          .profile-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            overflow: hidden;
            background: #f1f5f9;
            border: 3px solid #eff6ff;
          }
          .profile-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .avatar-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            color: #3b82f6;
            background: #eff6ff;
            font-weight: 800;
          }
          .profile-info-header h3 {
            margin: 0;
            font-size: 1.5rem;
            color: #0f172a;
            font-weight: 800;
          }
          .profile-info-header p {
            margin: 4px 0 0;
            color: #3b82f6;
            font-weight: 700;
            font-size: 0.8rem;
            letter-spacing: 0.05em;
          }
          .profile-form .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
          .profile-form .form-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .profile-form label {
            font-size: 0.85rem;
            font-weight: 700;
            color: #334155;
            letter-spacing: 0.01em;
          }
          .profile-form input, .profile-form select {
            padding: 12px 16px;
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            font-size: 0.95rem;
            transition: all 0.2s;
            color: #1e293b;
            font-weight: 500;
          }
          .profile-form input:focus, .profile-form select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
          }
          .disabled-input {
            background: #f1f5f9;
            color: #94a3b8;
            cursor: not-allowed;
          }
          .form-actions {
            margin-top: 40px;
            display: flex;
            justify-content: flex-end;
          }
          .save-profile-btn {
            background: #3b82f6;
            color: white;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 700;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
            box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
          }
          .save-profile-btn:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
          }
          .save-profile-btn:active {
            transform: translateY(0);
          }
          .success-banner {
            background: #f0fdf4;
            color: #166534;
            padding: 14px 20px;
            border-radius: 12px;
            margin-bottom: 28px;
            font-weight: 700;
            text-align: center;
            border: 1px solid #bbf7d0;
            font-size: 0.95rem;
          }
          
          @media (max-width: 768px) {
            .profile-form .form-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

      {page === PAGE.SEATS || page === PAGE.CONFIRMATION ? (
        <section className={`seat-modal ${page === PAGE.CONFIRMATION ? 'show-confirmed' : ''}`}>
          <div className="seat-modal-inner">
            <div className="phone-coral compact-top seat-modal-head">
              <p className="tiny-text">Select your seat</p>
              <h3>{selectedBus ? `${selectedBus.name} seat booking` : 'Select a bus first'}</h3>
              <button className="seat-close-btn" onClick={() => setPage(PAGE.DASHBOARD)}>
                Close
              </button>
            </div>

            <div className="phone-body">
              {error && <p className="error-banner" style={{ marginTop: '0', marginBottom: '14px' }}>{error}</p>}
              {selectedBus ? (
                <>
                  <div className="booking-slot-summary">
                    <div>
                      <p className="tiny-pill inline-pill">Seat Selection</p>
                      <h4>{selectedBus.name}</h4>
                      <p>
                        {selectedBus.fromCity} -&gt; {selectedBus.toCity}
                      </p>
                    </div>
                    <div className="slot-availability">
                      <span>{selectedBus?.isMock ? (45 - (mockBusSeats[selectedBus.id]?.length || 0)) : getSeatsLeft(selectedBus)} seats left</span>
                      <button className="mini-link" onClick={() => setPage(PAGE.DASHBOARD)}>
                        Back to dashboard
                      </button>
                    </div>
                  </div>

                  <div className="redbus-layout">
                    <div style={{ marginBottom: '20px', width: '100%', background: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={assistRequired} 
                          onChange={(e) => setAssistRequired(e.target.checked)}
                          style={{ width: '20px', height: '20px' }}
                        />
                        <div>
                          <strong style={{ display: 'block', color: '#1e40af' }}>Request Special Assistance (♿)</strong>
                          <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>Notify driver if you have mobility issues or injuries.</span>
                        </div>
                      </label>
                    </div>
                    <style>{`
                      .redbus-layout {
                        background: #ffffff;
                        border-radius: 12px;
                        padding: 24px;
                        border: 1px solid #e5e7eb;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        margin-top: 10px;
                        margin-bottom: 20px;
                      }
                      .redbus-legend {
                        display: flex;
                        justify-content: space-between;
                        width: 100%;
                        max-width: 350px;
                        margin-bottom: 24px;
                        color: #6b7280;
                        font-size: 0.85rem;
                        font-weight: 500;
                      }
                      .legend-item { display: flex; align-items: center; gap: 8px; }
                      .legend-box { width: 22px; height: 22px; border-radius: 6px; }
                      .bg-booked { background-color: #fca5a5; }
                      .bg-available { background-color: #d1d5db; }
                      .bg-selected { background-color: #f59e0b; }
                      
                      .steering-wheel {
                        width: 100%;
                        display: flex;
                        justify-content: flex-end;
                        padding-right: 15px;
                        margin-bottom: 10px;
                        font-size: 24px;
                      }

                      .main-deck {
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        padding-top: 10px;
                      }

                      .aisle-text {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%) rotate(-90deg);
                        color: #f3f4f6;
                        font-weight: 800;
                        font-size: 1.8rem;
                        letter-spacing: 6px;
                        white-space: nowrap;
                        pointer-events: none;
                      }

                      .seat-grid-half {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                      }
                      
                      .column-labels {
                        display: flex;
                        gap: 18px;
                        margin-bottom: 16px;
                        color: #9ca3af;
                        font-size: 0.85rem;
                        font-weight: 600;
                      }
                      .column-label {
                        width: 45px;
                        text-align: center;
                      }

                      .seat-row-pair {
                        display: flex;
                        gap: 18px;
                      }

                      .redbus-seat {
                        width: 45px;
                        height: 45px;
                        border-radius: 8px;
                        border: none;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-size: 0;
                      }
                      .redbus-seat:hover:not(.seat-booked) {
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        transform: translateY(-2px);
                      }
                      .seat-booked { background-color: #fca5a5; cursor: not-allowed; }
                      .seat-available { background-color: #d1d5db; }
                      .seat-selected { background-color: #f59e0b; }
                    `}</style>

                    <div className="redbus-legend">
                      <div className="legend-item"><div className="legend-box bg-booked"></div> Booked</div>
                      <div className="legend-item"><div className="legend-box bg-available"></div> Available</div>
                      <div className="legend-item"><div className="legend-box bg-selected"></div> Your Seat</div>
                    </div>

                    <div className="steering-wheel">
                      <span>🛞</span>
                    </div>

                    <div className="main-deck">
                      <div className="aisle-text" style={{ top: '40%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}>LOWER DECK</div>

                      <div style={{ display: 'flex', gap: '50px' }}>
                        {/* Left Half (A, B) */}
                        <div className="seat-grid-half">
                          <div className="column-labels"><div className="column-label">A</div><div className="column-label">B</div></div>
                          {Array.from({ length: 10 }).map((_, rowIndex) => {
                            const seatsLeft = [seatNumbers[rowIndex * 4], seatNumbers[rowIndex * 4 + 1]];
                            return (
                              <div className="seat-row-pair" key={`left-row-${rowIndex}`}>
                                {seatsLeft.map((seatNo, idx) => {
                                  if (!seatNo) return <div key={`empty-l-${idx}`} style={{ width: 45 }}></div>;
                                  const isMockBooked = mockBusSeats[selectedBus.id]?.includes(seatNo);
                                  let status = isMockBooked ? 'booked' : (selectedBus?.seats?.[seatNo]?.status || 'available');
                                  if (selectedSeats.includes(seatNo)) status = 'selected';
                                  return (
                                    <button
                                      key={seatNo}
                                      className={`redbus-seat seat-${status}`}
                                      disabled={status === 'booked'}
                                      onClick={() => handleSeatClick(seatNo)}
                                      title={`Seat ${seatNo}`}
                                    >
                                      {seatNo}
                                    </button>
                                  );
                                })}
                              </div>
                            )
                          })}
                        </div>

                        {/* Right Half (C, D) */}
                        <div className="seat-grid-half">
                          <div className="column-labels"><div className="column-label">C</div><div className="column-label">D</div></div>
                          {Array.from({ length: 10 }).map((_, rowIndex) => {
                            const seatsRight = [seatNumbers[rowIndex * 4 + 2], seatNumbers[rowIndex * 4 + 3]];
                            return (
                              <div className="seat-row-pair" key={`right-row-${rowIndex}`}>
                                {seatsRight.map((seatNo, idx) => {
                                  if (!seatNo) return <div key={`empty-r-${idx}`} style={{ width: 45 }}></div>;
                                  const isMockBooked = mockBusSeats[selectedBus.id]?.includes(seatNo);
                                  let status = isMockBooked ? 'booked' : (selectedBus?.seats?.[seatNo]?.status || 'available');
                                  if (selectedSeats.includes(seatNo)) status = 'selected';
                                  return (
                                    <button
                                      key={seatNo}
                                      className={`redbus-seat seat-${status}`}
                                      disabled={status === 'booked'}
                                      onClick={() => handleSeatClick(seatNo)}
                                      title={`Seat ${seatNo}`}
                                    >
                                      {seatNo}
                                    </button>
                                  );
                                })}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Last Row (5 seats) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '16px' }}>
                        {Array.from({ length: 5 }).map((_, idx) => {
                          const seatNo = seatNumbers[40 + idx];
                          if (!seatNo) return <div key={`empty-b-${idx}`} style={{ width: 45 }}></div>;
                          const isMockBooked = mockBusSeats[selectedBus.id]?.includes(seatNo);
                          let status = isMockBooked ? 'booked' : (selectedBus?.seats?.[seatNo]?.status || 'available');
                          if (selectedSeats.includes(seatNo)) status = 'selected';
                          return (
                            <button
                              key={seatNo}
                              className={`redbus-seat seat-${status}`}
                              disabled={status === 'booked'}
                              onClick={() => handleSeatClick(seatNo)}
                              title={`Seat ${seatNo}`}
                            >
                              {seatNo}
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  </div>

                  <div className="booking-footer compact-footer">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>
                        Selected: <strong>{selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}</strong>
                      </p>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Seats: {selectedSeats.length}</span>
                    </div>
                    <button className="mock-primary-btn" disabled={selectedSeats.length === 0 || loading} onClick={handleConfirmBooking}>
                      {loading ? 'Confirming...' : 'Confirm Booking'}
                    </button>
                  </div>

                  {bookingResult ? (
                    <div className="tracker-card small-tracker">
                      <h4>Booking Successful</h4>
                      <p>
                        {bookingResult.busName} - Seat {bookingResult.seatNumber}
                      </p>
                      <p>
                        {bookingResult.fromCity} -&gt; {bookingResult.toCity}
                      </p>
                      <p>Current stop: {bookingResult.routePoints[routeIndex] || bookingResult.fromCity}</p>
                      <a 
                        href="https://www.google.com/maps/dir/?api=1&destination=Bannari+Amman+Institute+of+Technology,+Sathyamangalam" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="mock-primary-btn" 
                        style={{ textDecoration: 'none', textAlign: 'center', display: 'block', marginTop: '12px' }}
                      >
                        Track on Google Maps
                      </a>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="empty-state">
                  <p>Select a bus first.</p>
                  <button className="mock-primary-btn" onClick={() => setPage(PAGE.DASHBOARD)}>
                    Go to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
        ) : null}
      </main>
    </div>
  </div>
  )
}
