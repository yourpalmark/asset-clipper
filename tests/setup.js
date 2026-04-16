// tests/setup.js
// Mocks for browser globals that don't exist in the jsdom test environment.

// Mirror what the browser does when lib/utils.js is loaded as a content script before content.js.
const { SUPPORTED_EXTENSIONS, decodeFilenameFromUrl, sanitiseTitle } = require('../lib/utils');
global.SUPPORTED_EXTENSIONS = SUPPORTED_EXTENSIONS;
global.decodeFilenameFromUrl = decodeFilenameFromUrl;
global.sanitiseTitle = sanitiseTitle;

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
  downloads: {
    download: jest.fn(),
    search: jest.fn(),
  },
};

global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

global.fetch = jest.fn();
