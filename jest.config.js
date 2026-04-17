module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  moduleNameMapper: {
    '^defuddle$': '<rootDir>/tests/__mocks__/defuddle.js',
  },
};
