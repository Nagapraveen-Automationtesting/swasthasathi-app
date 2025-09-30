module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', '*.config.js'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
      runtime: 'automatic', // For React 17+ JSX transform
    },
  },
  plugins: ['react-refresh'],
  rules: {
    'react/jsx-no-target-blank': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Disable React import requirement for JSX (React 17+ with Vite)
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    // Allow unused variables that start with underscore
    'no-unused-vars': [
      'warn', // Changed from 'error' to 'warn' to be less strict
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    // Turn off prop-types requirement since we're not using TypeScript
    'react/prop-types': 'off',
    // Allow JSX in .js files
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    // Allow unescaped entities (common in React apps)
    'react/no-unescaped-entities': 'off',
    // Allow lexical declarations in case blocks
    'no-case-declarations': 'off',
    // Make React Hooks exhaustive-deps a warning instead of error
    'react-hooks/exhaustive-deps': 'warn',
    // Rules of hooks should remain as error
    'react-hooks/rules-of-hooks': 'error',
  },
}
