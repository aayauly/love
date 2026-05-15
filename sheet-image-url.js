/**
 * Product images from Google Sheet.
 * - ucarecdn.com → load directly (works on sites)
 * - *.ucarecd.net, imgbb, ibb.co → proxy (hotlink / embed blocked)
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

  function isImgbbUrl(url) {
    return /imgbb\.com|ibb\.co/i.test(url);
  }

  function isUploadcareCustomCdn(url) {
    return /\.ucarecd\.net/i.test(url);
  }

  function isUploadcareGlobalCdn(url) {
    return /ucarecdn\.com/i.test(url);
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
    var withoutScheme = url.replace(/^https?:\/\//, "");
    return (
      "https://images.weserv.nl/?url=" +
      encodeURIComponent(withoutScheme) +
      "&w=800&h=1000&fit=inside&output=jpg&n=-1"
    );
  }

  /** URLs that must not be loaded directly in <img> on loveballoon.kz */
  function mustProxyFirst(url) {
    if (isImgbbUrl(url)) return true;
    if (isUploadcareCustomCdn(url)) return true;
    return false;
  }

  function getLoadOrder(url) {
    var list = [];
    var seen = {};
    function add(u) {
      if (u && !seen[u]) {
        seen[u] = true;
        list.push(u);
      }
    }

    if (mustProxyFirst(url)) {
      add(proxyUrl(url));
      add(url);
    } else if (isUploadcareGlobalCdn(url)) {
      add(url);
      add(proxyUrl(url));
    } else {
      add(url);
      add(proxyUrl(url));
    }

    return list;
  }

  function setProductImage(imgEl, rawUrl) {
    if (!imgEl) return "";
    var url = normalizeSheetImageUrl(rawUrl);
    if (!url) return "";

    var urls = getLoadOrder(url);
    var idx = 0;

    if (/drive\.google|googleusercontent/i.test(url)) {
      imgEl.referrerPolicy = "no-referrer";
    } else {
      imgEl.removeAttribute("referrerpolicy");
    }

    function tryNext() {
      if (idx >= urls.length) {
        imgEl.onerror = null;
        imgEl.onload = null;
        return;
      }
      imgEl.onerror = function () {
        idx++;
        tryNext();
      };
      imgEl.onload = function () {
        imgEl.onerror = null;
      };
      imgEl.src = urls[idx++];
    }

    tryNext();
    return url;
  }

  global.normalizeSheetImageUrl = normalizeSheetImageUrl;
  global.findImageFieldName = findImageFieldName;
  global.getRowImageUrl = getRowImageUrl;
  global.setProductImage = setProductImage;
  global.applyProductImage = setProductImage;
  global.observeProductImage = setProductImage;
})(typeof window !== "undefined" ? window : globalThis);
