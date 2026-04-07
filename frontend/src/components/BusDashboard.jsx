import React, { useState } from 'react';
import { MapPin, Clock, AlertCircle, ChevronRight, Search, Home, History, HelpCircle } from 'lucide-react';

export default function BusDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fromLocation, setFromLocation] = useState('Tiruppur');
  const [toLocation, setToLocation] = useState('Erode');
  const [selectedDate, setSelectedDate] = useState('2026-01-25');

  const summaryCards = [
    { label: 'Available Buses', value: '12', color: 'blue' },
    { label: 'Seats Available', value: '45', color: 'green' },
    { label: 'Next Bus Departure', value: '08:15 AM', color: 'purple' },
  ];

  const buses = [
    { id: 'BIT1', status: 'Available', occupancy: '12/45' },
    { id: 'BIT2', status: 'Available', occupancy: '28/45' },
    { id: 'BIT3', status: 'On the way', occupancy: '40/45' },
    { id: 'BIT4', status: 'Available', occupancy: '5/45' },
    { id: 'BIT5', status: 'Available', occupancy: '30/45' },
  ];

  const routeStops = ['Campus', 'Sathyamangalam', 'Erode'];

  const handleSearchClick = () => {
    alert(`Searching buses from ${fromLocation} to ${toLocation} on ${selectedDate}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-4 py-2 rounded-lg font-bold text-lg">
              🚌 CampusBus
            </div>
            <span className="text-gray-600 text-sm">Online Bus Booking System</span>
          </div>
          <div className="text-gray-600 text-sm">Welcome back!</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {summaryCards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-lg p-6 border-t-4"
              style={{
                borderTopColor:
                  card.color === 'blue' ? '#2563eb' : card.color === 'green' ? '#16a34a' : '#9333ea',
              }}
            >
              <div className="text-gray-600 text-sm font-medium mb-2">{card.label}</div>
              <div className="text-3xl font-bold text-gray-900">{card.value}</div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Section - Search and Bus List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bus Search Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Search size={24} className="text-blue-600" />
                Search Available Buses
              </h2>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* From Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                  <select
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option>Tiruppur</option>
                    <option>Coimbatore</option>
                    <option>Erode</option>
                    <option>Salem</option>
                  </select>
                </div>

                {/* To Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                  <select
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option>Erode</option>
                    <option>Coimbatore</option>
                    <option>Salem</option>
                    <option>Tiruppur</option>
                  </select>
                </div>
              </div>

              {/* Date Picker */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearchClick}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 rounded-lg transition duration-200 shadow-lg flex items-center justify-center gap-2"
              >
                <Search size={20} />
                Search Buses
              </button>
            </div>

            {/* Bus List Display */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin size={24} className="text-green-600" />
                Available Buses
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {buses.map((bus) => (
                  <div
                    key={bus.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-5 border-l-4 border-blue-600"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-blue-600">🚌 {bus.id}</h3>
                        <p className="text-gray-600 text-sm mt-1">Tiruppur → Erode</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          bus.status === 'Available'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {bus.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Occupancy: {bus.occupancy}</span>
                      <button className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 text-sm">
                        Book <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Section - Live Bus Tracker */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock size={24} className="text-purple-600" />
                Live Bus Tracker
              </h2>

              {/* Route Map */}
              <div className="bg-gradient-to-b from-blue-50 to-green-50 rounded-xl p-6 mb-6 border-2 border-blue-200">
                <div className="space-y-4">
                  {routeStops.map((stop, idx) => (
                    <div key={idx}>
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            idx === 1
                              ? 'bg-orange-500 border-orange-500'
                              : 'bg-gray-300 border-gray-300'
                          }`}
                        />
                        <span
                          className={`font-semibold ${
                            idx === 1 ? 'text-orange-600' : 'text-gray-700'
                          }`}
                        >
                          {stop}
                        </span>
                      </div>
                      {idx < routeStops.length - 1 && (
                        <div className="ml-2 pl-1 border-l-2 border-blue-300 h-8" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Bus Status */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-orange-600 mt-1" size={20} />
                  <div>
                    <p className="font-bold text-orange-900 text-sm">🚌 Bus BIT3</p>
                    <p className="text-orange-800 text-xs mt-1">Currently on the way</p>
                    <p className="text-orange-700 text-xs mt-2">
                      Passing through: <span className="font-semibold">Sathyamangalam</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Estimated Time:</span>
                  <span className="font-semibold text-gray-900">25 mins</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Distance Left:</span>
                  <span className="font-semibold text-gray-900">15 km</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation Tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-around md:justify-start md:gap-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Home size={20} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History size={20} />
            <span className="hidden sm:inline">Booking History</span>
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'support'
                ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HelpCircle size={20} />
            <span className="hidden sm:inline">Support & Help</span>
          </button>
        </div>
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-24" />
    </div>
  );
}
