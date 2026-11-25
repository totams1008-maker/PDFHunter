import assert from "node:assert/strict";
import test from "node:test";
import { findPdfCandidates, downloadPdfInPage } from "../page-tools.mjs";

test("detects a Wuolah PDF and ignores PDF.js scripts", () => {
  const original = {
    performance: globalThis.performance,
    document: globalThis.document,
    location: globalThis.location
  };

  try {
    globalThis.performance = {
      getEntriesByType(type) {
        if (type === "resource") return [
          { name: "https://cdn.wuolahstatic.com/api/views/document/abc/documento-123.pdf" },
          { name: "https://example.com/pdf.worker.min.js" },
          { name: "https://example.com/manual.PDF?download=1" },
          { name: "https://cdn.wuolahstatic.com/api/views/document/abc/documento-123.pdf" }
        ];
        return [];
      }
    };
    globalThis.location = { href: "https://wuolah.com/documento" };
    globalThis.document = {
      baseURI: "https://wuolah.com/documento",
      title: "Tema 1 - Wuolah",
      querySelectorAll() { return [{ getAttribute(name) { return name === "href" ? "/otro.pdf" : null; } }]; }
    };

    const result = findPdfCandidates();
    assert.equal(result.title, "Tema 1 - Wuolah");
    assert.equal(result.candidates.length, 3);
    assert.equal(result.candidates[0].name, "documento-123.pdf");
    assert.equal(result.candidates[2].url, "https://wuolah.com/otro.pdf");
  } finally {
    Object.assign(globalThis, original);
  }
});

test("downloads a valid PDF through the original tab", async () => {
  const original = {
    fetch: globalThis.fetch,
    document: globalThis.document,
    setTimeout: globalThis.setTimeout
  };
  const oldCreate = URL.createObjectURL;
  const oldRevoke = URL.revokeObjectURL;
  let clicked = false;
  let downloadName = "";
  let credentials = "";

  try {
    globalThis.fetch = async (_url, options) => {
      credentials = options.credentials;
      return { ok: true, blob: async () => new Blob(["%PDF-1.7\nTEST"], { type: "application/pdf" }) };
    };
    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = () => {};
    globalThis.document = {
      createElement() {
        return { style: {}, click() { clicked = true; downloadName = this.download; }, remove() {} };
      },
      body: { appendChild() {} }
    };
    globalThis.setTimeout = () => 1;

    const result = await downloadPdfInPage("https://wuolah.com/test.pdf", "examen: parcial.pdf");
    assert.equal(result.ok, true);
    assert.equal(clicked, true);
    assert.equal(downloadName, "examen- parcial.pdf");
    assert.equal(credentials, "include");
  } finally {
    Object.assign(globalThis, original);
    URL.createObjectURL = oldCreate;
    URL.revokeObjectURL = oldRevoke;
  }
});

test("rejects HTML disguised as a PDF", async () => {
  const oldFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      blob: async () => new Blob(["<html>Login</html>"], { type: "text/html" })
    });
    const result = await downloadPdfInPage("https://wuolah.com/test.pdf", "test.pdf");
    assert.equal(result.ok, false);
    assert.match(result.reason, /text\/html/);
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test("accepts a PDF header after leading bytes", async () => {
  const oldFetch = globalThis.fetch;
  const oldDocument = globalThis.document;
  const oldSetTimeout = globalThis.setTimeout;
  const oldCreate = URL.createObjectURL;
  const oldRevoke = URL.revokeObjectURL;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      blob: async () => new Blob(["\ufeff\n%PDF-1.7\nTEST"], { type: "application/octet-stream" })
    });
    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = () => {};
    globalThis.document = {
      createElement: () => ({ style: {}, click() {}, remove() {} }),
      body: { appendChild() {} }
    };
    globalThis.setTimeout = () => 1;

    const result = await downloadPdfInPage("https://wuolah.com/test.pdf", "notes.pdf");
    assert.equal(result.ok, true);
    assert.equal(result.warning, null);
  } finally {
    globalThis.fetch = oldFetch;
    globalThis.document = oldDocument;
    globalThis.setTimeout = oldSetTimeout;
    URL.createObjectURL = oldCreate;
    URL.revokeObjectURL = oldRevoke;
  }
});

test("accepts a PDF MIME type and exposes a validation warning", async () => {
  const oldFetch = globalThis.fetch;
  const oldDocument = globalThis.document;
  const oldSetTimeout = globalThis.setTimeout;
  const oldCreate = URL.createObjectURL;
  const oldRevoke = URL.revokeObjectURL;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      headers: { get: () => "application/pdf" },
      blob: async () => new Blob(["unexpected prefix"], { type: "application/pdf" })
    });
    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = () => {};
    globalThis.document = {
      createElement: () => ({ style: {}, click() {}, remove() {} }),
      body: { appendChild() {} }
    };
    globalThis.setTimeout = () => 1;

    const result = await downloadPdfInPage("https://wuolah.com/test.pdf", "notes.pdf");
    assert.equal(result.ok, true);
    assert.match(result.warning, /could not be verified/);
  } finally {
    globalThis.fetch = oldFetch;
    globalThis.document = oldDocument;
    globalThis.setTimeout = oldSetTimeout;
    URL.createObjectURL = oldCreate;
    URL.revokeObjectURL = oldRevoke;
  }
});
