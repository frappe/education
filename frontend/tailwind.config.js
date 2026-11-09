module.exports = {
  presets: [require('frappe-ui/src/utils/tailwind.config')],
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      /* DS-01 APPROVED v0.1 (DP-01…DP-03). Additive only; preset palette untouched. */
      colors: {
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#4154F1',
          600: '#3543D6',
          700: '#2F3DBE',
        },
        canvas: '#F8FAFC',
      },
    },
  },
  plugins: [],
}
