# CazaPDF

**Find and download PDFs hidden inside web document viewers.**

CazaPDF is a lightweight Chromium extension designed to detect PDF resources that a webpage has already loaded, including some PDF.js-based document viewers such as Wuolah. Instead of manually scrolling through a document and copying one page at a time, CazaPDF tries to retrieve the original PDF file from the same page where it is displayed.

> [!NOTE]
> CazaPDF is an independent project. It is not affiliated with, endorsed by, or maintained by Wuolah or Google.

## Features

- Detects PDF URLs from loaded page resources, document links, and supported viewer endpoints.
- Requests the PDF from the website's own context, retaining the permissions and session the webpage already has.
- Verifies the response starts with a valid PDF signature before starting a download.
- Works on demand: no background tracking, external API, or permanent access to browsing history.
- Built with Manifest V3 and plain HTML, CSS, and JavaScript—no dependencies or build step.

## Install (Chrome, Brave, or Edge)

1. Click **Code → Download ZIP** on this GitHub repository, or download a source release.
2. Extract the ZIP. **Do not select the ZIP file itself during installation.**
3. Open `chrome://extensions` (or `brave://extensions` / `edge://extensions`).
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the folder containing `manifest.json`.
6. Optionally pin **CazaPDF** to the browser toolbar.

**Note:** The source archive may have a top-level folder named `CazaPDF-main`; select that folder if it directly contains `manifest.json`.

## How to use

1. Open the document viewer on a website such as Wuolah.
2. Wait for the first page of the PDF to render.
3. Click the **CazaPDF** toolbar icon.
4. Click **Download PDF** next to the detected file.
5. Check your Downloads folder.

If nothing is detected, reload the webpage, wait for the viewer to load, and scan again.

## How it works

CazaPDF checks the [Resource Timing API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming) and PDF-like links visible in the current document. For detected URLs, it executes a `fetch()` request in the **main world of the active webpage** using the existing session credentials. When the response is a valid PDF, it creates a temporary Blob URL to request a download.

The extension asks for only two permissions:

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporary access to the page when the user clicks the extension |
| `scripting` | Scan for PDF resources and start the download in the active page |

No file content, browsing data, or personal information is sent to any server operated by this project.

## Limitations

- Websites can restrict access through authorization, CORS, expiring links, or other server rules. CazaPDF does not bypass these restrictions.
- Some PDFs loaded entirely within workers or inaccessible cross-origin frames may not appear in the page's resource list.
- It does not reconstruct scanned documents from image tiles, perform OCR, or unlock paid downloads.
- The download button requests a download; whether the browser completes it depends on browser settings and server behavior.

## Run tests

Node.js 20 or newer is recommended.

```bash
node --test tests/test.mjs
```

## Project structure

```text
manifest.json      Extension metadata and permissions
popup.html         Popup markup
popup.css          Popup styles
popup.mjs          Popup behavior
page-tools.mjs     PDF discovery and download logic
icon*.png          Toolbar icons
tests/test.mjs     Automated tests
```

## License

No license has been selected yet. Public repository visibility alone does not grant reuse rights. The maintainer can add an open-source license later.
