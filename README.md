# Asset Clipper

A Chrome extension that downloads all main-content assets (images, PDFs, documents, video, audio, and more) from the current page directly to a folder of your choice, using your active browser session. Designed to work alongside [Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-clipper) and the companion [Asset Swapper](https://github.com/yourpalmark/asset-swapper) Obsidian plugin for sites that serve assets behind authentication (e.g. Confluence).

---

## The problem

Obsidian Web Clipper saves page content as markdown, but assets are stored as remote URLs. For sites like Confluence that require authentication, those URLs only work while you have an active session. Obsidian's internal browser has no access to your Chrome cookies, so assets show as broken links.

## The solution

Asset Clipper runs inside Chrome (where your session is active), downloads assets at clip time, and saves them into a folder named after the page — ready for the companion [Asset Swapper](https://github.com/yourpalmark/asset-swapper) Obsidian plugin to rewrite the URLs in the clipped note to point to the local files.

---

## Workflow

1. Open a page in Chrome (e.g. a Confluence page you're logged into)
2. Clip the page with **Obsidian Web Clipper** → note saved, e.g. `My Page.md`
3. Click the **Asset Clipper** toolbar button → assets downloaded to `<Asset Location>/My Page/`
4. In Obsidian, open `My Page.md` and run **Asset Swapper: Swap assets for current file** → remote URLs rewritten to local wikilinks

---

## Installation

Asset Clipper is not yet published to the Chrome Web Store. To install it manually:

1. Clone or download this repository
2. Run `npm install && npm run build` inside the `asset-clipper` folder
3. Open Chrome and go to `chrome://extensions`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** and select the `asset-clipper` folder

---

## Configuration

Click **Browse…** in the popup to set your **Asset Location** — the folder where downloaded assets will be saved. The extension uses the browser's File System Access API to write directly to any folder you choose, with no need to change Chrome's download location.

- If no folder is set, assets are saved to your system **Downloads** folder
- The folder permission is remembered across browser sessions
- Assets are always saved into a subfolder named after the page title: `<Asset Location>/<Page Title>/`

---

## Supported asset types

| Category  | Extensions |
|-----------|-----------|
| Images    | `png` `jpg` `jpeg` `gif` `webp` `svg` `ico` `bmp` `tiff` `avif` `heic` |
| Documents | `pdf` `doc` `docx` `xls` `xlsx` `ppt` `pptx` `odt` `ods` `odp` `csv` `txt` `rtf` |
| Video     | `mp4` `webm` `mov` `avi` `mkv` `m4v` |
| Audio     | `mp3` `wav` `ogg` `m4a` `flac` `aac` |
| Archives  | `zip` `tar` `gz` `7z` |

---

## Notes

- Content detection uses [defuddle](https://github.com/kepano/defuddle) — the same library as Obsidian Web Clipper — so Asset Clipper scans exactly the same content area that Web Clipper clips from
- Only assets embedded in the **main content area** of the page are downloaded — nav icons, logos, and decorative elements are excluded
- Small images (explicit width below 50 px) are skipped as likely icons or flags
- Filenames are URL-decoded (spaces and encoded characters are restored)
- If a file with the same name already exists in the destination folder it will be overwritten
- The page title is sanitised to a safe folder name (illegal characters replaced, trailing separators stripped)

---

## Development

```bash
npm install   # install dependencies
npm run build # bundle defuddle for the extension (required before loading unpacked)
npm test      # run unit tests
```

To regenerate icons:

```bash
node generate_icons.js
```
