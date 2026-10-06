/** @type {import('tailwindcss').Config} */

// Atelier Deux-Cé design tokens (Refero) — see DESIGN.md
const tokens = {
  colors: {
    ink: '#000000',
    canvas: '#ffffff',
    linen: '#eee5da',
    sage: '#d8ddc6',
    driftwood: '#d8d0c5',
    olive: '#afb371',
    taupe: '#9c978a',
    pebble: '#aaaaa4',
    garden: '#259558', // footer only
  },
  // Token scale 8/12/18/24/40/48px maps to Tailwind's 2/3/4.5/6/10/12
  spacing: {
    4.5: '18px',
  },
  fontSize: {
    caption: ['16px', { lineHeight: '1.2', letterSpacing: '0.04em' }],
    body: ['17px', { lineHeight: '1.2', letterSpacing: '0.02em' }],
    subheading: ['20px', { lineHeight: '1.2', letterSpacing: '0.02em' }],
    heading: ['24px', { lineHeight: '1.2', letterSpacing: '0.02em' }],
  },
};

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Print-flat system: no radii, no shadows
    borderRadius: { none: '0px' },
    boxShadow: { none: 'none' },
    extend: {
      colors: tokens.colors,
      spacing: tokens.spacing,
      fontSize: tokens.fontSize,
      fontWeight: {
        normal: '400',
        semibold: '600',
      },
      letterSpacing: {
        body: '0.02em',
        label: '0.04em',
      },
      fontFamily: {
        sans: ['Helvetica', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        serif: ['minion-3', '"Cormorant Garamond"', '"EB Garamond"', 'serif'],
      },
    },
  },
  plugins: [],
};
