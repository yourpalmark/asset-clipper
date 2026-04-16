const { extractMainContentAssets } = require('../content');

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

  test('prefers #main-content over .wiki-content', () => {
    const doc = makeDoc(`
      <div class="wiki-content">
        <img src="https://example.com/wiki.png" />
      </div>
      <div id="main-content">
        <img src="https://example.com/main.png" />
      </div>
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('main.png');
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
// <a href> links
// ---------------------------------------------------------------------------

describe('<a href> links', () => {
  test('extracts links to supported file types', () => {
    const doc = makeDoc(`<a href="https://example.com/manual.pdf">Download</a>`);
    const [result] = extractMainContentAssets(doc);
    expect(result.filename).toBe('manual.pdf');
  });

  test('extracts links to Office documents', () => {
    const doc = makeDoc(`
      <a href="https://example.com/report.docx">Report</a>
      <a href="https://example.com/data.xlsx">Data</a>
    `);
    const results = extractMainContentAssets(doc);
    expect(results).toHaveLength(2);
  });

  test('ignores links to HTML pages', () => {
    const doc = makeDoc(`<a href="https://example.com/other-page.html">Link</a>`);
    expect(extractMainContentAssets(doc)).toHaveLength(0);
  });

  test('ignores links with no file extension', () => {
    const doc = makeDoc(`<a href="https://example.com/some-page">Link</a>`);
    expect(extractMainContentAssets(doc)).toHaveLength(0);
  });

  test('ignores javascript: hrefs', () => {
    const doc = makeDoc(`<a href="javascript:void(0)">Click</a>`);
    expect(extractMainContentAssets(doc)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Confluence-realistic scenario
// ---------------------------------------------------------------------------

describe('Confluence page scenario', () => {
  test('extracts attachment images from a Confluence-style page', () => {
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
    expect(results).toHaveLength(3); // 2 images + 1 PDF

    const filenames = results.map((r) => r.filename);
    expect(filenames).toContain('Screenshot 2026-03-19 at 12.15.14 PM.png');
    expect(filenames).toContain('Architecture Diagram.png');
    expect(filenames).toContain('spec.pdf');
  });
});
