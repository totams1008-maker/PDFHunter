import { findPdfCandidates, downloadPdfInPage } from "./page-tools.mjs";

const siteName = document.getElementById("site-name");
const status = document.getElementById("status");
const documents = document.getElementById("documents");
const resultCount = document.getElementById("result-count");
const rescan = document.getElementById("rescan");
let tabId = null;

function showStatus(message, error = false) {
  status.hidden = false;
  status.textContent = message;
  status.classList.toggle("error", error);
  documents.hidden = true;
}

function friendlyError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/Cannot access|Missing host permission|cannot be scripted|chrome:|extensions gallery|The extensions gallery/i.test(message)) {
    return "This tab cannot be accessed. Open the webpage displaying the PDF, then try again.";
  }
  return message;
}

async function scriptInFrame(frameId, func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    world: "MAIN",
    func,
    args
  });
  return results[0]?.result;
}

function readableFilename(candidate, pageTitle) {
  const generic = /^([\da-z_-]{18,}|documento|document|download|file)\.pdf$/i.test(candidate.name);
  const title = generic ? (pageTitle || "Notes") : candidate.name.replace(/\.pdf$/i, "");
  return (title || "Notes") + ".pdf";
}

async function scan() {
  rescan.disabled = true;
  showStatus("Scanning this tab for loaded PDFs…");
  resultCount.textContent = "—";
  documents.replaceChildren();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found.");
    tabId = tab.id;
    siteName.textContent = tab.title || tab.url || "Current tab";

    let responses;
    try {
      responses = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        world: "MAIN",
        func: findPdfCandidates
      });
    } catch {
      // A cross-origin or restricted iframe must not prevent scanning the top page.
      responses = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: findPdfCandidates
      });
    }

    const found = new Map();
    for (const response of responses) {
      const { frameId, result } = response;
      if (!result?.candidates) continue;
      for (const candidate of result.candidates) {
        if (!found.has(candidate.url)) {
          found.set(candidate.url, {
            ...candidate,
            frameId,
            pageTitle: result.title
          });
        }
      }
    }

    resultCount.textContent = String(found.size);
    if (found.size === 0) {
      showStatus("No PDF detected yet. Wait for the document viewer to load, refresh the webpage and scan again.");
      return;
    }

    status.hidden = true;
    documents.hidden = false;
    for (const candidate of found.values()) {
      documents.appendChild(renderDocument(candidate));
    }
  } catch (error) {
    showStatus(friendlyError(error), true);
    resultCount.textContent = "0";
  } finally {
    rescan.disabled = false;
  }
}

function renderDocument(candidate) {
  const card = document.createElement("div");
  card.className = "document";
  const row = document.createElement("div");
  row.className = "doc-row";
  const icon = document.createElement("span");
  icon.className = "doc-icon";
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.6"/><path d="M14 3v5h5M9 14h6M9 17h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const text = document.createElement("div");
  text.className = "doc-text";
  const name = document.createElement("div");
  name.className = "doc-name";
  const filename = readableFilename(candidate, candidate.pageTitle);
  name.textContent = filename;
  name.title = filename;
  const meta = document.createElement("div");
  meta.className = "doc-meta";
  meta.textContent = `${candidate.host} · ${candidate.source}`;
  text.append(name, meta);
  row.append(icon, text);

  const button = document.createElement("button");
  button.className = "download";
  button.type = "button";
  button.textContent = "↓  Download PDF";
  const message = document.createElement("p");
  message.className = "message";
  message.hidden = true;
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Preparing download…";
    message.hidden = true;
    message.classList.remove("error");
    try {
      const result = await scriptInFrame(
        candidate.frameId,
        downloadPdfInPage,
        [candidate.url, filename]
      );
      if (!result?.ok) throw new Error(result?.reason || "Download failed.");
      message.textContent = `Download requested (${(result.bytes / 1048576).toFixed(1)} MB). Check your Downloads folder.` + (result.warning ? ` ${result.warning}` : "");
      button.textContent = "✓  Download requested";
    } catch (error) {
      message.classList.add("error");
      message.textContent = friendlyError(error) + " If the server blocks the request, make sure the PDF is still open on the webpage.";
      button.disabled = false;
      button.textContent = "↻  Retry download";
    }
    message.hidden = false;
  });

  card.append(row, button, message);
  return card;
}

rescan.addEventListener("click", scan);
void scan();
