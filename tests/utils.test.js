const { SUPPORTED_EXTENSIONS, decodeFilenameFromUrl, sanitiseTitle } = require('../lib/utils');

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
    // %20 → space, %E2%80%AF → narrow no-break space (U+202F)
    expect(result).toBe('Screenshot 2026-03-19 at 12.15.14\u202FPM.png');
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
});

// ---------------------------------------------------------------------------
// sanitiseTitle
// ---------------------------------------------------------------------------

describe('sanitiseTitle', () => {
  test('replaces illegal path characters with hyphens', () => {
    expect(sanitiseTitle('Title: With / Illegal * Chars?')).toBe('Title- With - Illegal - Chars-');
  });

  test('collapses multiple spaces into one', () => {
    expect(sanitiseTitle('Too   Many   Spaces')).toBe('Too Many Spaces');
  });

  test('trims leading and trailing whitespace', () => {
    expect(sanitiseTitle('  padded  ')).toBe('padded');
  });

  test('truncates titles longer than 80 characters', () => {
    const long = 'A'.repeat(100);
    expect(sanitiseTitle(long)).toHaveLength(80);
  });

  test('handles a normal Confluence page title unchanged', () => {
    expect(sanitiseTitle('My Project Overview')).toBe('My Project Overview');
  });

  test('replaces backslash', () => {
    expect(sanitiseTitle('path\\to\\thing')).toBe('path-to-thing');
  });

  test('replaces all illegal chars: / \\ : * ? " < > |', () => {
    expect(sanitiseTitle('/\\:*?"<>|')).toBe('---------');
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
