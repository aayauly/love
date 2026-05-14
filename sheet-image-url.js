/**
 * Links pasted from Google Sheets are often Drive "open/view" pages — those are
 * HTML documents, so <img> fails even though the same URL works in a new tab.
 * Google may also return errors for embedded images when a third-party Referer is sent.
 */
(function (global) {
  "use strict";

  function normalizeSheetImageUrl(raw) {
    if (raw == null) return "";
    let url = String(raw).trim().replace(/^\uFEFF/, "");
    if (!url) return "";

    if (
      (url.startsWith('"') && url.endsWith('"')) ||
      (url.startsWith("'") && url.endsWith("'"))
    ) {
      url = url.slice(1, -1).trim();
    }

    if (/^https?:\/\/[^/]*googleusercontent\.com\//i.test(url)) return url;

    let fileId = null;
    const filePath = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (filePath) fileId = filePath[1];

    if (!fileId && /drive\.google\.com/.test(url)) {
      const idParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParam) fileId = idParam[1];
    }

    if (fileId) {
      return "https://drive.google.com/uc?export=view&id=" + fileId;
    }

    return url;
  }

  global.normalizeSheetImageUrl = normalizeSheetImageUrl;
})(typeof window !== "undefined" ? window : globalThis);
