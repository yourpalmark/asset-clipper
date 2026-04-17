// tests/setup.js
// Mocks for browser globals that don't exist in the jsdom test environment.

// Mirror what the browser does when lib/utils.js is loaded as a content script before content.js.
const { SUPPORTED_EXTENSIONS, decodeFilenameFromUrl, sanitiseFilename, sanitiseTitle } = require('../lib/utils');
global.SUPPORTED_EXTENSIONS = SUPPORTED_EXTENSIONS;
global.decodeFilenameFromUrl = decodeFilenameFromUrl;
global.sanitiseFilename = sanitiseFilename;
global.sanitiseTitle = sanitiseTitle;

// Mirror what the browser does when lib/defuddle.bundle.js is loaded before content.js.
// In tests we don't need real content scoring — the mock returns the full body HTML
// so that extractAssetsFromContainer tests work against predictable containers.
global.Defuddle = class MockDefuddle {
  constructor(doc) {
    this.doc = doc;
  }
  parse() {
    return {
      title: this.doc.title || '',
      content: this.doc.body ? this.doc.body.innerHTML : '',
    };
  }
};

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
