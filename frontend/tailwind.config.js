/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sterling: {
          bg: '#F8FAFC',         // slate 50 for background
          surface: '#FFFFFF',    // white for cards
          border: '#E2E8F0',     // light border
          text: '#0F172A',       // charcoal dark text
          muted: '#64748B',      // gray text
          blue: '#DC2626',       // actually red (kept name to avoid breaking classes)
          blueHover: '#B91C1C',  // darker red
          accent: '#10B981',     // emerald
          red: '#EF4444',        
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        blob: "blob 7s infinite",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        }
      }
    },
  },
  plugins: [],
}
