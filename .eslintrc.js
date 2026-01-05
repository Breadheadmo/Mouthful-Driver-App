module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    // Keep ESLint rules strict; Prettier will be enforced as an ESLint rule
    // Use Prettier's configuration for formatting (semi, quotes, etc.)
    'prettier/prettier': ['error', { semi: false }],
  },
}
