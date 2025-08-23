const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: withOpacity('--bg-primary'),
        surface: withOpacity('--input-bg'),
        border: withOpacity('--border-color'),
        text: withOpacity('--text-primary'),
        accent: withOpacity('--accent-color'),
      },
    },
  },
  plugins: [],
};

