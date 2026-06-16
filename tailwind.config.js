/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"], // Menggunakan format array shadcn
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}', // Memastikan semua file ter-scan
  ],
  theme: {
    container: { // Konfigurasi container standar shadcn
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: { 
        // Ini adalah "jembatan" ajaib.
        // Ini memberitahu Tailwind untuk menggunakan variabel CSS dari globals.css
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: { // Diperlukan oleh shadcn
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: { // Diperlukan oleh shadcn
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in-up": { // Animasi kustom Anda (SUDAH ADA)
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
        },
        
        // --- TAMBAHAN BARU (Fase 0) ---
        "fade-in": {
          from: { opacity: 0, transform: "scale(0.95)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        // --- ---
        
        // --- TAMBAHAN BARU (POIN 4) ---
        "pop-in": {
          "from": { opacity: "0", transform: "scale(0.95) translateY(-10%)" },
          "to": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "pop-out": {
          "from": { opacity: "1", transform: "scale(1) translateY(0)" },
          "to": { opacity: "0", transform: "scale(0.95) translateY(-10%)" },
        }
        // --- ---
      },
      animation: { // Diperlukan oleh shadcn
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards", // (SUDAH ADA)

        // --- TAMBAHAN BARU (Fase 0) ---
        "fade-in": "fade-in 0.3s ease-out forwards",
        // --- ---
        
        // --- TAMBAHAN BARU (POIN 4) ---
        "pop-in": "pop-in 0.2s ease-out",
        "pop-out": "pop-out 0.15s ease-in",
        // --- ---
      },
    },
  },
  plugins: [require("tailwindcss-animate")], // Pastikan ini ada
}