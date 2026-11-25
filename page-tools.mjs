/**
 * These functions are injected into the active website's MAIN world.
 * IMPORTANT: both functions must remain self-contained because Chromium
 * serializes them when using chrome.scripting.executeScript({ func }).
 */

export function findPdfCandidates() {
  const results = [];
  const seen = new Set();

  function add(raw, source) {
    if (typeof raw !== "string" || !raw || raw.length > 8192) return;
    let url;
    try {
      url = new URL(raw, document.baseURI);
    } catch {
      return;
    }
    if (!/^https?:$/.test(url.protocol)) return;
    const address = url.href;
    const isPdf = /\.pdf(?:$|[?#])/i.test(address);
    const isWuolahViewer = /\/api\/views\/document\//i.test(url.pathname);
    if ((!isPdf && !isWuolahViewer) || seen.has(address)) return;
    seen.add(address);

    let name = "document.pdf";
    try {
      const lastSegment = decodeURIComponent(url.pathname.split("/").pop() || "");
      if (/\.pdf$/i.test(lastSegment)) name = lastSegment;
    } catch {
      // Keep the fallback name if a URL contains invalid percent escapes.
    }

    results.push({
      url: address,
      name,
      host: url.hostname,
      source
    });
  }

  for (const item of performance.getEntriesByType("resource")) {
    add(item.name, "Loaded resource");
  }
  for (const item of performance.getEntriesByType("navigation")) {
    add(item.name, "Open document");
  }

  add(location.href, "Current tab");

  for (const element of document.querySelectorAll(
    'a[href], iframe[src], embed[src], object[data], source[src]'
  )) {
    add(
      element.getAttribute("href") ||
      element.getAttribute("src") ||
      element.getAttribute("data"),
      "Page link"
    );
  }

  return {
    title: document.title || "Document",
    pageUrl: location.href,
    candidates: results.slice(0, 100)
  };
}

export async function downloadPdfInPage(url, filename) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      return { ok: false, reason: "The URL must use HTTP or HTTPS." };
    }

    // Fetching from MAIN runs with the page's origin, Referer, and credentials.
    // It does not require an extension-wide host permission.
    // Prefer the already-loaded browser cache when the page has fetched this
    // PDF. Some viewers use a CDN that behaves differently on repeat requests.
    const response = await fetch(url, {
      credentials: "include",
      cache: "force-cache"
    });
    if (!response.ok) {
      return { ok: false, reason: `The server returned HTTP ${response.status}.` };
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      return { ok: false, reason: "The downloaded file is empty." };
    }

    // A PDF header is not required to start at byte zero; it can appear a
    // little later in the file. The earlier version rejected those documents.
    // Match the behavior of our successful manual-console download as a
    // fallback: accept a response explicitly served as application/pdf.
    const mime = response.headers?.get?.("content-type") || blob.type || "unknown";
    const header = await blob.slice(0, 1024).text();
    const hasPdfHeader = header.includes("%PDF-");
    const hasPdfMime = /(?:^|\s)application\/pdf(?:\s*;|\s*$)/i.test(mime);
    if (!hasPdfHeader && !hasPdfMime) {
      return {
        ok: false,
        reason: `The server returned ${mime} (${blob.size} bytes), not a PDF. It may be a login or access-denied response.`
      };
    }

    let safeName = String(filename || "notes.pdf")
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 110);
    if (!/\.pdf$/i.test(safeName)) safeName += ".pdf";

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = safeName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);

    return {
      ok: true,
      bytes: blob.size,
      filename: safeName,
      warning: hasPdfHeader ? null : "The server identified this as a PDF, but its header could not be verified. Check that the downloaded file opens correctly."
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}
