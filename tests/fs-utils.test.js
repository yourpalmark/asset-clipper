const { getOrCreateDir, fetchAndWrite } = require('../lib/fs-utils');

// ---------------------------------------------------------------------------
// Helpers: mock FileSystemDirectoryHandle and FileSystemFileHandle
// ---------------------------------------------------------------------------

function makeMockDirHandle(name = 'root') {
  const handle = {
    name,
    _children: {},
    getDirectoryHandle: jest.fn(async (childName, opts) => {
      if (!handle._children[childName]) {
        handle._children[childName] = makeMockDirHandle(childName);
      }
      return handle._children[childName];
    }),
    getFileHandle: jest.fn(async (filename) => makeMockFileHandle(filename)),
  };
  return handle;
}

function makeMockFileHandle(name = 'file.png') {
  const chunks = [];
  const writable = {
    write: jest.fn(async (data) => chunks.push(data)),
    close: jest.fn(async () => {}),
  };
  return {
    name,
    createWritable: jest.fn(async () => writable),
    _chunks: chunks,
  };
}

// ---------------------------------------------------------------------------
// getOrCreateDir
// ---------------------------------------------------------------------------

describe('getOrCreateDir', () => {
  test('returns the root handle when pathParts is empty', async () => {
    const root = makeMockDirHandle();
    const result = await getOrCreateDir(root, []);
    expect(result).toBe(root);
    expect(root.getDirectoryHandle).not.toHaveBeenCalled();
  });

  test('traverses a single-level path', async () => {
    const root = makeMockDirHandle();
    const result = await getOrCreateDir(root, ['raw']);
    expect(root.getDirectoryHandle).toHaveBeenCalledWith('raw', { create: true });
    expect(result.name).toBe('raw');
  });

  test('traverses a multi-level path in order', async () => {
    const root = makeMockDirHandle();
    const result = await getOrCreateDir(root, ['raw', 'assets', 'My Page']);

    expect(root.getDirectoryHandle).toHaveBeenCalledWith('raw', { create: true });
    const rawHandle = root._children['raw'];
    expect(rawHandle.getDirectoryHandle).toHaveBeenCalledWith('assets', { create: true });
    const assetsHandle = rawHandle._children['assets'];
    expect(assetsHandle.getDirectoryHandle).toHaveBeenCalledWith('My Page', { create: true });

    expect(result.name).toBe('My Page');
  });

  test('passes { create: true } for every segment', async () => {
    const root = makeMockDirHandle();
    await getOrCreateDir(root, ['a', 'b', 'c']);

    expect(root.getDirectoryHandle).toHaveBeenCalledWith('a', { create: true });
    expect(root._children['a'].getDirectoryHandle).toHaveBeenCalledWith('b', { create: true });
    expect(root._children['a']._children['b'].getDirectoryHandle).toHaveBeenCalledWith('c', { create: true });
  });

  test('propagates errors from getDirectoryHandle', async () => {
    const root = makeMockDirHandle();
    root.getDirectoryHandle.mockRejectedValueOnce(new Error('Permission denied'));
    await expect(getOrCreateDir(root, ['protected'])).rejects.toThrow('Permission denied');
  });
});

// ---------------------------------------------------------------------------
// fetchAndWrite
// ---------------------------------------------------------------------------

describe('fetchAndWrite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockSuccessfulFetch(mimeType = 'image/png') {
    const blob = new Blob(['fake-image-data'], { type: mimeType });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => blob,
    });
    return blob;
  }

  test('fetches URL with credentials: include', async () => {
    mockSuccessfulFetch();
    const dir = makeMockDirHandle();
    await fetchAndWrite('https://example.com/photo.png', 'photo.png', dir);
    expect(fetch).toHaveBeenCalledWith('https://example.com/photo.png', { credentials: 'include' });
  });

  test('creates a file handle with { create: true } and writes the blob', async () => {
    const blob = mockSuccessfulFetch();
    const dir = makeMockDirHandle();
    await fetchAndWrite('https://example.com/photo.png', 'photo.png', dir);

    expect(dir.getFileHandle).toHaveBeenCalledWith('photo.png', { create: true });

    const fileHandle = await dir.getFileHandle.mock.results[0].value;
    const writable = await fileHandle.createWritable.mock.results[0].value;
    expect(writable.write).toHaveBeenCalledWith(blob);
    expect(writable.close).toHaveBeenCalled();
  });

  test('closes the writable even after a successful write', async () => {
    mockSuccessfulFetch();
    const dir = makeMockDirHandle();
    await fetchAndWrite('https://example.com/photo.png', 'photo.png', dir);
    const fileHandle = await dir.getFileHandle.mock.results[0].value;
    const writable = await fileHandle.createWritable.mock.results[0].value;
    expect(writable.close).toHaveBeenCalledTimes(1);
  });

  test('throws on non-OK HTTP response', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const dir = makeMockDirHandle();
    await expect(fetchAndWrite('https://example.com/secret.png', 'secret.png', dir))
      .rejects.toThrow('HTTP 403');
  });

  test('throws on network error', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const dir = makeMockDirHandle();
    await expect(fetchAndWrite('https://example.com/photo.png', 'photo.png', dir))
      .rejects.toThrow('Failed to fetch');
  });

  test('works with a Confluence attachment URL', async () => {
    mockSuccessfulFetch();
    const dir = makeMockDirHandle();
    const url =
      'https://confluence.example.com/download/attachments/123/diagram.png?version=1&api=v2';
    await fetchAndWrite(url, 'diagram.png', dir);
    expect(fetch).toHaveBeenCalledWith(url, { credentials: 'include' });
    expect(dir.getFileHandle).toHaveBeenCalledWith('diagram.png', { create: true });
  });
});
