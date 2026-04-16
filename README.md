# Asset Clipper

A Chrome extension that downloads all main-content assets (images, PDFs, documents, video, audio, and more) from the current page directly into your Obsidian vault, using your active browser session. Designed to work alongside [Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-clipper) for sites that serve assets behind authentication (e.g. Confluence).

## The problem

Obsidian Web Clipper saves page content as markdown, but assets are stored as URLs. For sites like Confluence that require authentication, those URLs only work while you have an active session. Obsidian's internal browser has no access to your Chrome cookies, so assets show as broken links.

## The solution

Asset Clipper runs inside Chrome (where your session is active), downloads assets at clip time, and saves them directly to your vault. A companion Obsidian plugin — [Asset Swapper](https://github.com/yourpalmark/asset-swapper) — then rewrites the asset URLs in the clipped note to point to the local files.

## Workflow

1. Open a page in Chrome (e.g. a Confluence page you're logged into)
2. Clip the page with Obsidian Web Clipper → markdown saved to `raw/`
3. Click the Asset Clipper toolbar button → assets downloaded to `raw/assets/<Page Title>/`
4. In Obsidian, run **Asset Swapper: Swap all assets for current file** → URLs rewritten to local wikilinks

## Installation

Asset Clipper is not yet published to the Chrome Web Store. To install it manually:

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `asset-clipper` folder

## Configuration

Click **Select vault folder** in the popup and choose your Obsidian vault's root folder. The extension uses the browser's File System Access API to write directly to your vault — no need to change Chrome's download location.

The browser will remember the folder permission across sessions.

## Notes

**Supported asset types:**
- Images: `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `ico`, `bmp`, `tiff`, `avif`, `heic`
- Documents: `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `odt`, `ods`, `odp`, `csv`, `txt`, `rtf`
- Video: `mp4`, `webm`, `mov`, `avi`, `mkv`, `m4v`
- Audio: `mp3`, `wav`, `ogg`, `m4a`, `flac`, `aac`
- Archives: `zip`, `tar`, `gz`, `7z`

**Notes:**
- Only assets in the main content area of the page are downloaded (nav icons, logos, unrelated links, etc. are excluded)
- Filenames are URL-decoded (spaces are restored, encoded characters are resolved)
- If the same filename already exists in the destination folder, it will be overwritten
