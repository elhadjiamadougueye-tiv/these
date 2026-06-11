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
        // Accent Claude AI : orange/terracotta chaud
        accent: {
          DEFAULT: '#d97757',
          hover:   '#c96442',
          light:   '#e8a989',
        },
        // Palette Claude AI : tons beige/crème chauds (light mode)
        surface: {
          0: '#faf9f7',   // fond principal (crème très clair)
          1: '#f5f0e8',   // fond sidebar / header
          2: '#ffffff',   // fond cartes/panneaux (blanc pur)
          3: '#f0ebe3',   // fond éléments interactifs (beige léger)
          4: '#e8e0d5',   // fond hover (beige moyen)
        },
        border: '#e2d9ce',
        // Textes
        ink: {
          DEFAULT: '#1a1612',  // texte principal brun très foncé
          2: '#4a3f35',        // texte secondaire brun moyen
          3: '#6b5e52',        // texte tertiaire brun clair
          4: '#9b8b7e',        // texte désactivé/placeholder
        },
      },
    },
  },
  plugins: [],
}
