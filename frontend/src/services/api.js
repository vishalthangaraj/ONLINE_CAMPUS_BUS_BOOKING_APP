import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cb_jwt')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export const apiService = {
  // Auth endpoints
  login: (payload) => axiosInstance.post('/auth/login', payload),
  googleLogin: (payload) => axiosInstance.post('/auth/google', payload),

  // Buses endpoints
  getBuses: () => axiosInstance.get('/buses'),
  getBusById: (id) => axiosInstance.get(`/buses/${id}`),

  // Trips endpoints
  getTrips: () => axiosInstance.get('/trips'),
  getTripsForBus: (busId) => axiosInstance.get(`/trips/bus/${busId}`),
  getTripSeatMap: (tripId) => axiosInstance.get(`/bookings/trip/${tripId}/seat-map`),

  // Bookings endpoints
  createBooking: (data) => axiosInstance.post('/bookings', data),
  getUserBookings: () => axiosInstance.get('/bookings/user'),
  getBookingDetails: (bookingId) => axiosInstance.get(`/bookings/${bookingId}`),
  cancelBooking: (bookingId) => axiosInstance.post(`/bookings/${bookingId}/cancel`),

  // Routes endpoints
  getRoutes: () => axiosInstance.get('/routes'),

  // Admin endpoints
  getDashboardStats: () => axiosInstance.get('/admin/stats'),
  getAllBuses: () => axiosInstance.get('/admin/buses'),
  getAllBookings: () => axiosInstance.get('/admin/bookings'),
}

export const shimApiService = {
  seedBuses: () => axiosInstance.post('/shim/seed'),
  getBuses: () => axiosInstance.get('/shim/buses'),
  getUserBookings: (userId) => axiosInstance.get(`/shim/bookings/user?userId=${userId}`),
  createBooking: (data) => axiosInstance.post('/shim/bookings', data),
  getMockState: (date) => axiosInstance.get(`/shim/mock-state/${date}`),
  updateMockState: (date, data) => axiosInstance.post(`/shim/mock-state/${date}`, data),
  cancelBooking: (bookingId) => axiosInstance.post(`/shim/bookings/cancel/${bookingId}`)
}

export default axiosInstance
