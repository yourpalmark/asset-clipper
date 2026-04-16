// tests/setup.js
// Mocks for browser globals that don't exist in the jsdom test environment.

global.chrome = {
  runtime: {
    onMessage: { addListener: jest.fn() },
    lastError: null,
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

global.fetch = jest.fn();
