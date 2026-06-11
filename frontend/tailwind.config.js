/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#6366f1',
          hover:   '#4f46e5',
          light:   '#a5b4fc',
        },
        // Palette sombre cohérente pour toute l'app
        surface: {
          0: '#0f0f11',   // fond principal (très sombre)
          1: '#16161a',   // fond header/footer
          2: '#1c1c21',   // fond cartes/panneaux
          3: '#24242b',   // fond éléments interactifs
          4: '#2e2e38',   // fond hover
        },
        border: '#2e2e38',
      },
    },
  },
  plugins: [],
}
