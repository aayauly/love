/**
 * Product images from Google Sheet (Uploadcare). Use URL as-is from the sheet.
 */
(function (global) {
  "use strict";

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

  function findImageFieldName(fields) {
    if (!fields || !fields.length) return null;
    for (var i = 0; i < fields.length; i++) {
      if (/фото|photo/i.test(fields[i])) return fields[i];
    }
    return fields[1] || null;
  }

  function getRowImageUrl(item, fields) {
    if (!item) return "";
    var key = findImageFieldName(fields);
    return key ? item[key] : "";
  }

  function normalizeSheetImageUrl(raw) {
    var url = cleanRawUrl(raw);
    if (!url) return "";

    if (/^https?:\/\/[^/]*googleusercontent\.com\//i.test(url)) return url;

    var fileId = null;
    var m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m) fileId = m[1];
    if (!fileId && /drive\.google\.com/.test(url)) {
      var p = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (p) fileId = p[1];
    }
    if (fileId) {
      return "https://drive.google.com/uc?export=view&id=" + fileId;
    }
    return url;
  }

  function proxyUrl(url) {
    return (
      "https://images.weserv.nl/?url=" +
      encodeURIComponent(url.replace(/^https?:\/\//, "")) +
      "&w=800&h=1000&fit=inside&output=jpg"
    );
  }

  /** Set image src on an element already in the document. */
  function setProductImage(imgEl, rawUrl) {
    if (!imgEl) return "";
    var url = normalizeSheetImageUrl(rawUrl);
    if (!url) return "";

    if (/drive\.google|googleusercontent/i.test(url)) {
      imgEl.referrerPolicy = "no-referrer";
    } else {
      imgEl.removeAttribute("referrerpolicy");
    }

    var triedProxy = false;
    imgEl.onload = function () {
      imgEl.onerror = null;
    };
    imgEl.onerror = function () {
      if (!triedProxy && /ucarecd|ucarecdn/i.test(url)) {
        triedProxy = true;
        imgEl.src = proxyUrl(url);
        return;
      }
      imgEl.onerror = null;
    };
    imgEl.src = url;
    return url;
  }

  global.normalizeSheetImageUrl = normalizeSheetImageUrl;
  global.findImageFieldName = findImageFieldName;
  global.getRowImageUrl = getRowImageUrl;
  global.setProductImage = setProductImage;
  global.applyProductImage = setProductImage;
  global.observeProductImage = setProductImage;
})(typeof window !== "undefined" ? window : globalThis);
