const { SUPPORTED_EXTENSIONS, decodeFilenameFromUrl, sanitiseFilename, sanitiseTitle } = require('../lib/utils');

// ---------------------------------------------------------------------------
// decodeFilenameFromUrl
// ---------------------------------------------------------------------------

describe('decodeFilenameFromUrl', () => {
  test('returns filename from a plain URL', () => {
    expect(decodeFilenameFromUrl('https://example.com/images/photo.png'))
      .toBe('photo.png');
  });

  test('URL-decodes percent-encoded spaces', () => {
    expect(decodeFilenameFromUrl('https://example.com/files/my%20file.pdf'))
      .toBe('my file.pdf');
  });

  test('decodes a real Confluence attachment URL', () => {
    const url =
      'https://confluence.example.com/download/attachments/2629805685/' +
      'Screenshot%202026-03-19%20at%2012.15.14%E2%80%AFPM.png' +
      '?version=1&modificationDate=1773902761577&api=v2';
    const result = decodeFilenameFromUrl(url);
    // %20 → space, %E2%80%AF (narrow no-break space) → normalized to regular space
    expect(result).toBe('Screenshot 2026-03-19 at 12.15.14 PM.png');
  });

  test('strips query string from filename', () => {
    expect(decodeFilenameFromUrl('https://example.com/file.pdf?token=abc&v=2'))
      .toBe('file.pdf');
  });

  test('returns null for a URL with no path filename', () => {
    expect(decodeFilenameFromUrl('https://example.com/')).toBeNull();
  });

  test('returns null for an invalid URL string', () => {
    expect(decodeFilenameFromUrl('not a url')).toBeNull();
  });

  test('returns null for a single-character last segment', () => {
    expect(decodeFilenameFromUrl('https://example.com/a')).toBeNull();
  });

  test('handles deeply nested paths', () => {
    expect(decodeFilenameFromUrl('https://cdn.example.com/a/b/c/d/report.xlsx'))
      .toBe('report.xlsx');
  });

  test('returns null for empty string', () => {
    expect(decodeFilenameFromUrl('')).toBeNull();
  });

  test('sanitises illegal filename chars (e.g. Wikipedia File: prefix)', () => {
    expect(decodeFilenameFromUrl('https://en.wikipedia.org/wiki/File:Question_book-new.svg'))
      .toBe('File-Question_book-new.svg');
  });
});

// ---------------------------------------------------------------------------
// sanitiseFilename
// ---------------------------------------------------------------------------

describe('sanitiseFilename', () => {
  test('replaces colon with hyphen', () => {
    expect(sanitiseFilename('File:image.png')).toBe('File-image.png');
  });

  test('replaces all illegal chars: / \\ : * ? " < > |', () => {
    expect(sanitiseFilename('a/b\\c:d*e?f"g<h>i|j.png')).toBe('a-b-c-d-e-f-g-h-i-j.png');
  });

  test('collapses multiple spaces', () => {
    expect(sanitiseFilename('my  file.png')).toBe('my file.png');
  });

  test('trims leading and trailing whitespace', () => {
    expect(sanitiseFilename('  file.png  ')).toBe('file.png');
  });

  test('leaves normal filenames unchanged', () => {
    expect(sanitiseFilename('diagram-v2.png')).toBe('diagram-v2.png');
  });

  test('preserves file extension', () => {
    expect(sanitiseFilename('report:final.pdf')).toBe('report-final.pdf');
  });
});

// ---------------------------------------------------------------------------
// sanitiseTitle
// ---------------------------------------------------------------------------

// sanitiseTitle mirrors Web Clipper's sanitizeFileName (Mac behaviour in tests
// since navigator is undefined in Node → non-Windows path is taken).
describe('sanitiseTitle', () => {
  test('removes colon (illegal on macOS)', () => {
    expect(sanitiseTitle('Title: Subtitle')).toBe('Title Subtitle');
  });

  test('removes forward slash (illegal on macOS)', () => {
    expect(sanitiseTitle('path/to/thing')).toBe('pathtothing');
  });

  test('preserves ? (legal on macOS, kept by Web Clipper)', () => {
    expect(sanitiseTitle('What is this?')).toBe('What is this?');
  });

  test('preserves * (legal on macOS, kept by Web Clipper)', () => {
    expect(sanitiseTitle('a*b')).toBe('a*b');
  });

  test('removes Obsidian-specific chars: # | ^ [ ]', () => {
    expect(sanitiseTitle('Title #1 | [tag] ^up')).toBe('Title 1 tag up');
  });

  test('removes | and collapses surrounding spaces (e.g. "Page | Site")', () => {
    expect(sanitiseTitle('My Page | Confluence')).toBe('My Page  Confluence'.replace(/\s+/g, ' ').trim());
  });

  test('collapses multiple spaces into one', () => {
    expect(sanitiseTitle('Too   Many   Spaces')).toBe('Too Many Spaces');
  });

  test('trims leading and trailing whitespace', () => {
    expect(sanitiseTitle('  padded  ')).toBe('padded');
  });

  test('truncates titles longer than 245 characters', () => {
    const long = 'A'.repeat(300);
    expect(sanitiseTitle(long)).toHaveLength(245);
  });

  test('handles a normal Confluence page title unchanged', () => {
    expect(sanitiseTitle('My Project Overview')).toBe('My Project Overview');
  });

  test('removes leading periods', () => {
    expect(sanitiseTitle('...hidden')).toBe('hidden');
  });

  test('returns Untitled for a title that becomes empty', () => {
    expect(sanitiseTitle('///')).toBe('Untitled');
  });
});

// ---------------------------------------------------------------------------
// SUPPORTED_EXTENSIONS
// ---------------------------------------------------------------------------

describe('SUPPORTED_EXTENSIONS', () => {
  const expected = [
    // images
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
    // documents
    'pdf', 'docx', 'xlsx', 'pptx',
    // video
    'mp4', 'mov',
    // audio
    'mp3', 'wav',
    // archives
    'zip',
  ];

  test.each(expected)('includes .%s', (ext) => {
    expect(SUPPORTED_EXTENSIONS.has(ext)).toBe(true);
  });

  test('does not include html', () => {
    expect(SUPPORTED_EXTENSIONS.has('html')).toBe(false);
  });

  test('does not include js', () => {
    expect(SUPPORTED_EXTENSIONS.has('js')).toBe(false);
  });

  test('does not include an empty string', () => {
    expect(SUPPORTED_EXTENSIONS.has('')).toBe(false);
  });
});
