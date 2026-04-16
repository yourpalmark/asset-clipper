const { extractMainContentAssets, MIN_IMG_WIDTH } = require('../content');

// Helper: build a minimal document from an HTML string using jsdom (provided by the test env).
function makeDoc(html) {
  const doc = document.implementation.createHTMLDocument('test');
  doc.body.innerHTML = html;
  return doc;
}

// Helper: build a document where a specific container wraps the content.
function makeDocWithContainer(containerHtml, outerHtml = '') {
  return makeDoc(outerHtml + containerHtml);
}

// ---------------------------------------------------------------------------
// Container selection
// ---------------------------------------------------------------------------

describe('container selection', () => {
  test('uses #main-content when present', () => {
    const doc = makeDoc(`
      <img src="https://example.com/outside.png" />
      <div id="main-content">
        <img src="https://example.com/inside.png" />
      </div>
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('inside.png');
  });

  test('uses .wiki-content for Confluence pages', () => {
    const doc = makeDoc(`
      <nav><img src="https://example.com/logo.png" /></nav>
      <div class="wiki-content">
        <img src="https://example.com/diagram.png" />
      </div>
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('diagram.png');
  });

  test('falls back to body when no known selector matches', () => {
    const doc = makeDoc(`<img src="https://example.com/fallback.png" />`);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('fallback.png');
  });

  test('prefers .wiki-content over #main-content (Confluence: #main-content wraps the full page)', () => {
    const doc = makeDoc(`
      <div id="main-content">
        <img src="https://example.com/outer.png" />
        <div class="wiki-content">
          <img src="https://example.com/article.png" />
        </div>
      </div>
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('article.png');
  });

  test('uses <main> element', () => {
    const doc = makeDoc(`
      <header><img src="https://example.com/header.png" /></header>
      <main><img src="https://example.com/content.png" /></main>
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('content.png');
  });

  test('uses [role="main"]', () => {
    const doc = makeDoc(`
      <div role="main"><img src="https://example.com/role-main.png" /></div>
      <div><img src="https://example.com/other.png" /></div>
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('role-main.png');
  });
});

// ---------------------------------------------------------------------------
// <img> elements
// ---------------------------------------------------------------------------

describe('<img> elements', () => {
  test('extracts a supported image', () => {
    const doc = makeDoc(`<img src="https://example.com/photo.jpg" />`);
    const [result] = extractMainContentAssets(doc);
    expect(result.url).toBe('https://example.com/photo.jpg');
    expect(result.filename).toBe('photo.jpg');
  });

  test('skips data: URIs', () => {
    const doc = makeDoc(`<img src="data:image/png;base64,abc123" />`);
    expect(extractMainContentAssets(doc)).toHaveLength(0);
  });

  test('skips unsupported extensions (e.g. .html)', () => {
    const doc = makeDoc(`<img src="https://example.com/page.html" />`);
    expect(extractMainContentAssets(doc)).toHaveLength(0);
  });

  test('deduplicates identical URLs', () => {
    const doc = makeDoc(`
      <img src="https://example.com/dup.png" />
      <img src="https://example.com/dup.png" />
    `);
    expect(extractMainContentAssets(doc)).toHaveLength(1);
  });

  test('extracts multiple distinct images', () => {
    const doc = makeDoc(`
      <img src="https://example.com/a.png" />
      <img src="https://example.com/b.gif" />
      <img src="https://example.com/c.webp" />
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.filename)).toEqual(['a.png', 'b.gif', 'c.webp']);
  });

  test('URL-decodes filenames from image src', () => {
    const doc = makeDoc(`<img src="https://example.com/my%20photo.png" />`);
    const [result] = extractMainContentAssets(doc);
    expect(result.filename).toBe('my photo.png');
  });
});

// ---------------------------------------------------------------------------
// <video> and <audio> elements
// ---------------------------------------------------------------------------

describe('<video> elements', () => {
  test('extracts video with src attribute', () => {
    const doc = makeDoc(`<video src="https://example.com/clip.mp4"></video>`);
    const [result] = extractMainContentAssets(doc);
    expect(result.filename).toBe('clip.mp4');
  });

  test('extracts <source> inside <video>', () => {
    const doc = makeDoc(`
      <video>
        <source src="https://example.com/clip.webm" type="video/webm" />
        <source src="https://example.com/clip.mp4" type="video/mp4" />
      </video>
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.filename)).toEqual(['clip.webm', 'clip.mp4']);
  });
});

describe('<audio> elements', () => {
  test('extracts audio with src attribute', () => {
    const doc = makeDoc(`<audio src="https://example.com/track.mp3"></audio>`);
    const [result] = extractMainContentAssets(doc);
    expect(result.filename).toBe('track.mp3');
  });

  test('extracts <source> inside <audio>', () => {
    const doc = makeDoc(`
      <audio>
        <source src="https://example.com/track.ogg" />
        <source src="https://example.com/track.mp3" />
      </audio>
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// <embed> and <object> elements
// ---------------------------------------------------------------------------

describe('<embed> elements', () => {
  test('extracts embedded PDF', () => {
    const doc = makeDoc(`<embed src="https://example.com/report.pdf" />`);
    const [result] = extractMainContentAssets(doc);
    expect(result.filename).toBe('report.pdf');
  });
});

describe('<object> elements', () => {
  test('extracts object data attribute', () => {
    const doc = makeDoc(`<object data="https://example.com/chart.svg"></object>`);
    const [result] = extractMainContentAssets(doc);
    expect(result.filename).toBe('chart.svg');
  });
});

// ---------------------------------------------------------------------------
// <a href> links — not extracted (links are navigation, not embedded assets)
// ---------------------------------------------------------------------------

describe('<a href> links', () => {
  test('does not extract links to PDFs', () => {
    const doc = makeDoc(`<a href="https://example.com/manual.pdf">Download</a>`);
    expect(extractMainContentAssets(doc)).toHaveLength(0);
  });

  test('does not extract links to Office documents', () => {
    const doc = makeDoc(`
      <a href="https://example.com/report.docx">Report</a>
      <a href="https://example.com/data.xlsx">Data</a>
    `);
    expect(extractMainContentAssets(doc)).toHaveLength(0);
  });

  test('does not extract links that look like files but go to wiki pages', () => {
    // e.g. Wikipedia File: pages — the href leads to an HTML page, not the file
    const doc = makeDoc(`<a href="https://en.wikipedia.org/wiki/File:Question_book-new.svg">img</a>`);
    expect(extractMainContentAssets(doc)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Small image filtering
// ---------------------------------------------------------------------------

describe('small image filtering', () => {
  test('skips images with explicit width below threshold', () => {
    const doc = makeDoc(`<img src="https://example.com/icon.png" width="${MIN_IMG_WIDTH - 1}" />`);
    expect(extractMainContentAssets(doc)).toHaveLength(0);
  });

  test('includes images with explicit width at the threshold', () => {
    const doc = makeDoc(`<img src="https://example.com/photo.png" width="${MIN_IMG_WIDTH}" />`);
    expect(extractMainContentAssets(doc)).toHaveLength(1);
  });

  test('includes images with no explicit width attribute', () => {
    // Lazy-loaded or CSS-sized images have no width attribute — do not skip them
    const doc = makeDoc(`<img src="https://example.com/photo.png" />`);
    expect(extractMainContentAssets(doc)).toHaveLength(1);
  });

  test('includes images with width="0" (attribute present but unset)', () => {
    const doc = makeDoc(`<img src="https://example.com/photo.png" width="0" />`);
    expect(extractMainContentAssets(doc)).toHaveLength(1);
  });

  test('skips small flag/icon images mixed with larger content images', () => {
    const doc = makeDoc(`
      <img src="https://example.com/flag.png" width="20" height="12" />
      <img src="https://example.com/album-cover.jpg" />
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('album-cover.jpg');
  });
});

// ---------------------------------------------------------------------------
// Confluence-realistic scenario
// ---------------------------------------------------------------------------

describe('Confluence page scenario', () => {
  test('extracts embedded images from a Confluence-style page, ignores links', () => {
    const url1 =
      'https://confluence.example.com/download/attachments/123/' +
      'Screenshot%202026-03-19%20at%2012.15.14%E2%80%AFPM.png' +
      '?version=1&modificationDate=1773902761577&api=v2';
    const url2 =
      'https://confluence.example.com/download/attachments/123/' +
      'Architecture%20Diagram.png?version=2&api=v2';

    const doc = makeDoc(`
      <div class="wiki-content">
        <p>Some text</p>
        <img src="${url1}" />
        <img src="${url2}" />
        <a href="https://confluence.example.com/display/PROJ/AnotherPage">Link to page</a>
        <a href="https://confluence.example.com/download/attachments/123/spec.pdf?api=v2">Spec</a>
      </div>
    `);

    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(2); // 2 embedded images only — links are not extracted

    const filenames = results.map((r) => r.filename);
    expect(filenames).toContain('Screenshot 2026-03-19 at 12.15.14 PM.png');
    expect(filenames).toContain('Architecture Diagram.png');
  });
});

// ---------------------------------------------------------------------------
// MediaWiki / Wikipedia selector
// ---------------------------------------------------------------------------

describe('MediaWiki selector', () => {
  test('uses #mw-content-text when present', () => {
    const doc = makeDoc(`
      <div id="mw-head"><img src="https://example.com/nav-icon.png" /></div>
      <div id="mw-content-text">
        <img src="https://example.com/article-image.jpg" />
      </div>
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('article-image.jpg');
  });

  test('uses .mw-parser-output when present', () => {
    const doc = makeDoc(`
      <div id="mw-content-text">
        <div class="mw-parser-output">
          <img src="https://example.com/article-image.jpg" />
        </div>
      </div>
    `);
    // #mw-content-text is matched first — image is still inside it
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('article-image.jpg');
  });
});
