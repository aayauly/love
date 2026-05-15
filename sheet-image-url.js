/**
 * Normalize image URLs from Google Sheets for use in <img src>.
 * - Google Drive "view" links → direct image URL
 * - Uploadcare custom CDN (*.ucarecd.net) → ucarecdn.com + fallbacks on error
 */
(function (global) {
  "use strict";

  var PRODUCT_IMG_PLACEHOLDER =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZThlOGU4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtc2l6ZT0iMjAiPtCk0L7RgtC+PC90ZXh0Pjwvc3ZnPg==";

  function cleanRawUrl(raw) {
    if (raw == null) return "";
    var url = String(raw).trim().replace(/^\uFEFF/, "");
    if (!url) return "";
    if (
      (url.charAt(0) === '"' && url.charAt(url.length - 1) === '"') ||
      (url.charAt(0) === "'" && url.charAt(url.length - 1) === "'")
    ) {
      url = url.slice(1, -1).trim();
    }
    return url;
  }

  function isGoogleImageUrl(url) {
    return /drive\.google|googleusercontent|ggpht\.com/i.test(url);
  }

  function isUploadcareUrl(url) {
    return /ucarecd\.net|ucarecdn\.com/i.test(url);
  }

  /** Primary URL used in WhatsApp / cart (first candidate). */
  function normalizeSheetImageUrl(raw) {
    var url = cleanRawUrl(raw);
    if (!url) return "";

    if (/^https?:\/\/[^/]*googleusercontent\.com\//i.test(url)) return url;

    var fileId = null;
    var filePath = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (filePath) fileId = filePath[1];
    if (!fileId && /drive\.google\.com/.test(url)) {
      var idParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParam) fileId = idParam[1];
    }
    if (fileId) {
      return "https://drive.google.com/uc?export=view&id=" + fileId;
    }

    if (isUploadcareUrl(url)) {
      return normalizeUploadcarePrimary(url);
    }

    return url;
  }

  function normalizeUploadcarePrimary(url) {
    var m = url.match(
      /^https?:\/\/(?:[a-z0-9-]+\.)?ucarecd\.net\/([a-f0-9-]{36})(\/.*)?$/i
    );
    if (m) {
      return "https://ucarecdn.com/" + m[1] + (m[2] || "/");
    }
    return url;
  }

  /** Ordered list of URLs to try in <img> (primary + fallbacks). */
  function getProductImageCandidates(raw) {
    var primary = normalizeSheetImageUrl(raw);
    if (!primary) return [];

    var seen = {};
    var list = [];
    function add(u) {
      if (u && !seen[u]) {
        seen[u] = true;
        list.push(u);
      }
    }

    var rawClean = cleanRawUrl(raw);
    if (rawClean) add(rawClean);
    add(primary);

    var uuidMatch = primary.match(
      /\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(\/.*)?$/i
    );
    if (uuidMatch && isUploadcareUrl(primary)) {
      var uuid = uuidMatch[1];
      var suffix = uuidMatch[2] || "/";
      add("https://ucarecdn.com/" + uuid + suffix);
      add("https://ucarecdn.com/" + uuid + "/-/resize/750x/");
      add("https://ucarecdn.com/" + uuid + "/");

      var custom = rawClean.match(
        /^https?:\/\/([a-z0-9-]+\.ucarecd\.net)\/([a-f0-9-]{36})(\/.*)?$/i
      );
      if (custom) {
        add("https://" + custom[1] + "/" + custom[2] + (custom[3] || "/"));
      }
    }

    return list;
  }

  function referrerPolicyForUrl(url) {
    return isGoogleImageUrl(url) ? "no-referrer" : "";
  }

  /**
   * Load product photo with automatic fallbacks (fixes most Uploadcare / Drive issues).
   */
  function applyProductImage(imgEl, rawUrl, placeholder) {
    if (!imgEl) return normalizeSheetImageUrl(rawUrl);
    var candidates = getProductImageCandidates(rawUrl);
    var fallback = placeholder || PRODUCT_IMG_PLACEHOLDER;
    var idx = 0;

    function tryNext() {
      if (idx >= candidates.length) {
        imgEl.onerror = null;
        imgEl.onload = null;
        imgEl.src = fallback;
        return;
      }
      var url = candidates[idx++];
      imgEl.referrerPolicy = referrerPolicyForUrl(url);
      imgEl.onload = function () {
        imgEl.onerror = null;
        imgEl.onload = null;
      };
      imgEl.onerror = tryNext;
      imgEl.src = url;
    }

    tryNext();
    return candidates[0] || "";
  }

  global.PRODUCT_IMG_PLACEHOLDER = PRODUCT_IMG_PLACEHOLDER;
  global.normalizeSheetImageUrl = normalizeSheetImageUrl;
  global.getProductImageCandidates = getProductImageCandidates;
  global.applyProductImage = applyProductImage;
  global.referrerPolicyForUrl = referrerPolicyForUrl;
})(typeof window !== "undefined" ? window : globalThis);
