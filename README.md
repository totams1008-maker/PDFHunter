# PDFHunter

**Download PDF documents from web viewers without copying pages one by one.**

PDFHunter is a lightweight, open-source-ready Chromium extension designed to detect and download PDF files loaded by websites using embedded document viewers, including some PDF.js-based platforms.

Many online viewers dynamically load and unload pages as you scroll, making it difficult to copy an entire document or access the original PDF. PDFHunter helps identify the PDF resource and request the complete file directly from the website.

## Features

- **Automatic PDF detection:** Finds PDF resources loaded by the current webpage.
- **One-click download:** Download detected PDF files through a simple popup interface.
- **PDF.js compatibility:** Works with certain viewers built using PDF.js.
- **Session-aware requests:** Uses the access and credentials already available to the webpage.
- **Minimal permissions:** Only requests temporary access to the active tab.
- **Lightweight:** Built with vanilla JavaScript, HTML and CSS.
- **Privacy-focused:** No external analytics, tracking services or backend servers.

## Browser compatibility

Designed for Chromium-based browsers:

- Google Chrome
- Brave
- Microsoft Edge
- Other compatible Chromium browsers

## Installation

PDFHunter is currently distributed as an unpacked browser extension.

1. Download the repository using **Code → Download ZIP**.
2. Extract the downloaded ZIP file.
3. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Edge: `edge://extensions`
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted directory containing `manifest.json`.

The extension should now appear in your browser.

## Usage

1. Navigate to a website containing an embedded PDF document.
2. Wait for the PDF viewer to finish loading its initial pages.
3. Click the extension icon in your browser toolbar.
4. PDFHunter will scan the current webpage for PDF resources.
5. Click **Download PDF** next to the detected document.
6. Check your browser's Downloads folder.

If no PDF is detected, refresh the webpage, wait for the document to load and scan again.

## How it works

PDFHunter uses the browser's Resource Timing API and document elements to identify potential PDF URLs.

When a PDF resource is detected, the extension executes a request within the original webpage's context, allowing it to use the permissions and session information already available to that page.

The response is checked using PDF header information and content type before a download is requested.

The extension uses Manifest V3 and requires only two permissions:

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporarily access the current webpage when the extension is activated |
| `scripting` | Execute PDF detection and download logic within the active webpage |

PDFHunter does not operate a remote server or collect browsing history.

## Known limitations

- Some websites restrict direct PDF downloads through server-side authorization.
- PDF resources loaded exclusively inside inaccessible frames or workers might not be detected.
- The extension cannot reconstruct PDFs delivered only as image tiles.
- It does not perform optical character recognition (OCR).
- It does not bypass paywalls, authentication requirements or download permissions.
- Successful downloading depends on the website and browser configuration.

## Testing

The extension has been successfully tested with a PDF document displayed through Wuolah.

Automated tests cover PDF resource detection, basic download behavior and response validation.

Run the tests using Node.js:

`node --test tests/test.mjs`

## Project structure

- `manifest.json` — Extension configuration and permissions.
- `popup.html` — Extension popup interface.
- `popup.css` — Popup styling.
- `popup.mjs` — Popup behavior.
- `page-tools.mjs` — PDF detection and download functionality.
- `icon*.png` — Extension icons.
- `tests/test.mjs` — Automated tests.

## Roadmap

Potential future improvements include:

- Detecting additional PDF viewer implementations.
- Downloading multiple PDF documents.
- Extracting text directly from PDF files.
- Improving file naming.
- Adding more detailed error diagnostics.
- Expanding browser compatibility.

## Disclaimer

PDFHunter is an independent project and is not affiliated with, endorsed by or maintained by Wuolah, Google, Microsoft or Brave.

Users are responsible for complying with applicable website terms, copyright laws and document access permissions.

## License

No open-source license has been selected yet.
