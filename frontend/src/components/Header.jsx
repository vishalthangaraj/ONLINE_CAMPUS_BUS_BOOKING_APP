import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Header({ onLogout }) {
  const navigate = useNavigate()

  return (
    <header className="bg-white shadow-soft sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="text-3xl">🚌</div>
          <h1 className="text-xl font-bold text-gray-800 hidden sm:block">CampusRide</h1>
        </div>

        <nav className="flex items-center gap-6">
          <button
            onClick={() => navigate('/')}
            className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/my-bookings')}
            className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
          >
            My Bookings
          </button>
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  )
}
