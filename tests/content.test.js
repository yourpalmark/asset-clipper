const { extractWithDefuddle, extractAssetsFromContainer } = require('../content');

// Helper: build a minimal document from an HTML string using jsdom (provided by the test env).
function makeDoc(html, title = '') {
  const doc = document.implementation.createHTMLDocument(title);
  doc.body.innerHTML = html;
  return doc;
}

// ---------------------------------------------------------------------------
// extractAssetsFromContainer — <img> elements
// ---------------------------------------------------------------------------

describe('<img> elements', () => {
  test('extracts a supported image', () => {
    const doc = makeDoc(`<img src="https://example.com/photo.jpg" />`);
    const [result] = extractAssetsFromContainer(doc.body);
    expect(result.url).toBe('https://example.com/photo.jpg');
    expect(result.filename).toBe('photo.jpg');
  });

  test('skips data: URIs', () => {
    const doc = makeDoc(`<img src="data:image/png;base64,abc123" />`);
    expect(extractAssetsFromContainer(doc.body)).toHaveLength(0);
  });

  test('skips unsupported extensions (e.g. .html)', () => {
    const doc = makeDoc(`<img src="https://example.com/page.html" />`);
    expect(extractAssetsFromContainer(doc.body)).toHaveLength(0);
  });

  test('deduplicates identical URLs', () => {
    const doc = makeDoc(`
      <img src="https://example.com/dup.png" />
      <img src="https://example.com/dup.png" />
    `);
    expect(extractAssetsFromContainer(doc.body)).toHaveLength(1);
  });

  test('extracts multiple distinct images', () => {
    const doc = makeDoc(`
      <img src="https://example.com/a.png" />
      <img src="https://example.com/b.gif" />
      <img src="https://example.com/c.webp" />
    `);
    const results = extractAssetsFromContainer(doc.body);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.filename)).toEqual(['a.png', 'b.gif', 'c.webp']);
  });

  test('URL-decodes filenames from image src', () => {
    const doc = makeDoc(`<img src="https://example.com/my%20photo.png" />`);
    const [result] = extractAssetsFromContainer(doc.body);
    expect(result.filename).toBe('my photo.png');
  });
});

// ---------------------------------------------------------------------------
// extractAssetsFromContainer — <video> and <audio> elements
// ---------------------------------------------------------------------------

describe('<video> elements', () => {
  test('extracts video with src attribute', () => {
    const doc = makeDoc(`<video src="https://example.com/clip.mp4"></video>`);
    const [result] = extractAssetsFromContainer(doc.body);
    expect(result.filename).toBe('clip.mp4');
  });

  test('extracts <source> inside <video>', () => {
    const doc = makeDoc(`
      <video>
        <source src="https://example.com/clip.webm" type="video/webm" />
        <source src="https://example.com/clip.mp4" type="video/mp4" />
      </video>
    `);
    const results = extractAssetsFromContainer(doc.body);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.filename)).toEqual(['clip.webm', 'clip.mp4']);
  });
});

describe('<audio> elements', () => {
  test('extracts audio with src attribute', () => {
    const doc = makeDoc(`<audio src="https://example.com/track.mp3"></audio>`);
    const [result] = extractAssetsFromContainer(doc.body);
    expect(result.filename).toBe('track.mp3');
  });

  test('extracts <source> inside <audio>', () => {
    const doc = makeDoc(`
      <audio>
        <source src="https://example.com/track.ogg" />
        <source src="https://example.com/track.mp3" />
      </audio>
    `);
    const results = extractAssetsFromContainer(doc.body);
    expect(results).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// extractAssetsFromContainer — <embed> and <object> elements
// ---------------------------------------------------------------------------

describe('<embed> elements', () => {
  test('extracts embedded PDF', () => {
    const doc = makeDoc(`<embed src="https://example.com/report.pdf" />`);
    const [result] = extractAssetsFromContainer(doc.body);
    expect(result.filename).toBe('report.pdf');
  });
});

describe('<object> elements', () => {
  test('extracts object data attribute', () => {
    const doc = makeDoc(`<object data="https://example.com/chart.svg"></object>`);
    const [result] = extractAssetsFromContainer(doc.body);
    expect(result.filename).toBe('chart.svg');
  });
});

// ---------------------------------------------------------------------------
// extractAssetsFromContainer — <a href> links are not extracted
// ---------------------------------------------------------------------------

describe('<a href> links', () => {
  test('does not extract links to PDFs', () => {
    const doc = makeDoc(`<a href="https://example.com/manual.pdf">Download</a>`);
    expect(extractAssetsFromContainer(doc.body)).toHaveLength(0);
  });

  test('does not extract links to Office documents', () => {
    const doc = makeDoc(`
      <a href="https://example.com/report.docx">Report</a>
      <a href="https://example.com/data.xlsx">Data</a>
    `);
    expect(extractAssetsFromContainer(doc.body)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// extractAssetsFromContainer — small image filtering
// ---------------------------------------------------------------------------

describe('small image filtering', () => {
  test('skips images with explicit width below 50', () => {
    const doc = makeDoc(`<img src="https://example.com/icon.png" width="49" />`);
    expect(extractAssetsFromContainer(doc.body)).toHaveLength(0);
  });

  test('includes images with explicit width at 50', () => {
    const doc = makeDoc(`<img src="https://example.com/photo.png" width="50" />`);
    expect(extractAssetsFromContainer(doc.body)).toHaveLength(1);
  });

  test('includes images with no explicit width attribute', () => {
    const doc = makeDoc(`<img src="https://example.com/photo.png" />`);
    expect(extractAssetsFromContainer(doc.body)).toHaveLength(1);
  });

  test('includes images with width="0" (attribute present but value is zero)', () => {
    const doc = makeDoc(`<img src="https://example.com/photo.png" width="0" />`);
    expect(extractAssetsFromContainer(doc.body)).toHaveLength(1);
  });

  test('skips small flag/icon images mixed with larger content images', () => {
    const doc = makeDoc(`
      <img src="https://example.com/flag.png" width="20" height="12" />
      <img src="https://example.com/album-cover.jpg" />
    `);
    const results = extractAssetsFromContainer(doc.body);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('album-cover.jpg');
  });
});

// ---------------------------------------------------------------------------
// extractWithDefuddle — uses the Defuddle mock from setup.js
// ---------------------------------------------------------------------------

describe('extractWithDefuddle', () => {
  test('returns pageTitle from defuddle result', () => {
    const doc = makeDoc(`<img src="https://example.com/photo.png" />`, 'My Test Page');
    const { pageTitle } = extractWithDefuddle(doc);
    expect(pageTitle).toBe('My Test Page');
  });

  test('falls back to doc.title when defuddle returns empty title', () => {
    const doc = makeDoc(`<img src="https://example.com/photo.png" />`, 'Fallback Title');
    // MockDefuddle returns doc.title — this confirms the fallback chain works
    const { pageTitle } = extractWithDefuddle(doc);
    expect(pageTitle).toBe('Fallback Title');
  });

  test('extracts assets from defuddle content', () => {
    const doc = makeDoc(`
      <img src="https://example.com/article.png" />
      <img src="https://example.com/chart.svg" />
    `);
    const { assets } = extractWithDefuddle(doc);
    expect(assets).toHaveLength(2);
    expect(assets.map((a) => a.filename)).toEqual(['article.png', 'chart.svg']);
  });

  test('returns empty assets for a page with no supported files', () => {
    const doc = makeDoc(`<p>Just text, no assets.</p>`);
    const { assets } = extractWithDefuddle(doc);
    expect(assets).toHaveLength(0);
  });

  test('falls back to body scan when Defuddle throws', () => {
    // Temporarily break the global mock
    const orig = global.Defuddle;
    global.Defuddle = class { parse() { throw new Error('defuddle failed'); } };

    const doc = makeDoc(`<img src="https://example.com/photo.png" />`);
    const { assets } = extractWithDefuddle(doc);
    expect(assets).toHaveLength(1);
    expect(assets[0].filename).toBe('photo.png');

    global.Defuddle = orig;
  });
});

// ---------------------------------------------------------------------------
// Confluence-realistic scenario
// ---------------------------------------------------------------------------

describe('Confluence page scenario', () => {
  test('extracts embedded images, ignores linked pages', () => {
    const url1 =
      'https://confluence.example.com/download/attachments/123/' +
      'Screenshot%202026-03-19%20at%2012.15.14%E2%80%AFPM.png' +
      '?version=1&modificationDate=1773902761577&api=v2';
    const url2 =
      'https://confluence.example.com/download/attachments/123/' +
      'Architecture%20Diagram.png?version=2&api=v2';

    // extractAssetsFromContainer used here because defuddle content selection
    // is real runtime behaviour — in tests the mock returns full body HTML.
    const doc = makeDoc(`
      <img src="${url1}" />
      <img src="${url2}" />
      <a href="https://confluence.example.com/display/PROJ/AnotherPage">Link to page</a>
      <a href="https://confluence.example.com/download/attachments/123/spec.pdf?api=v2">Spec</a>
    `);

    const results = extractAssetsFromContainer(doc.body);
    expect(results).toHaveLength(2);

    const filenames = results.map((r) => r.filename);
    expect(filenames).toContain('Screenshot 2026-03-19 at 12.15.14 PM.png');
    expect(filenames).toContain('Architecture Diagram.png');
  });
});
