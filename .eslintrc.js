module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  globals: {
    // Frontend libraries loaded via CDN
    'd3': 'readonly',
    'Chart': 'readonly',
    'io': 'readonly'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'semi': ['error', 'always'],
    'quotes': ['warn', 'single']
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      env: {
        jest: true
      }
    },
    {
      files: ['public/js/**/*.js'],
      env: {
        browser: true,
        es2021: true
      }
    }
  ]
};