/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'IBM Plex Mono'", "monospace"],
        display: ["'Space Mono'", "monospace"],
      },
      colors: {
        void: "#020308",
        vault: "#080f1a",
        cipher: "#0d1f35",
        nox: "#00ff88",
        noxDim: "#00cc6a",
        noxGlow: "rgba(0,255,136,0.15)",
        credit: "#00d4ff",
        creditDim: "#0099cc",
        warn: "#ff6b35",
        muted: "#3a4a5c",
        panel: "#0a1628",
      },
      animation: {
        "pulse-nox": "pulseNox 2s ease-in-out infinite",
        "scan": "scan 3s linear infinite",
        "flicker": "flicker 4s step-end infinite",
      },
      keyframes: {
        pulseNox: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        flicker: {
          "0%, 95%, 100%": { opacity: "1" },
          "96%": { opacity: "0.8" },
          "97%": { opacity: "1" },
          "98%": { opacity: "0.6" },
          "99%": { opacity: "1" },
        },
      },
      boxShadow: {
        nox: "0 0 20px rgba(0,255,136,0.3), 0 0 60px rgba(0,255,136,0.1)",
        credit: "0 0 20px rgba(0,212,255,0.3), 0 0 60px rgba(0,212,255,0.1)",
        panel: "inset 0 1px 0 rgba(0,255,136,0.1), 0 4px 24px rgba(0,0,0,0.8)",
      },
    },
  },
  plugins: [],
};
