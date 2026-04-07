/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        'primary-dark': '#1d4ed8',
        'seat-available': '#e5e7eb',
        'seat-selected': '#10b981',
        'seat-occupied': '#6b7280',
        'seat-premium': '#fbbf24',
        'seat-booked': '#ef4444',
      },
      boxShadow: {
        soft: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
