/**
 * Product images from Google Sheet (Uploadcare, ImgBB, Google Drive).
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

  function getUploadcareUuid(url) {
    var m = url.match(
      /\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
    );
    return m ? m[1] : null;
  }

  function isImgbbUrl(url) {
    return /imgbb\.com|ibb\.co/i.test(url);
  }

  function isUploadcareUrl(url) {
    return /ucarecd\.net|ucarecdn\.com/i.test(url);
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

  function corsProxyUrl(url) {
    return "https://corsproxy.io/?" + encodeURIComponent(url);
  }

  /** Build list of URLs to try (order matters). */
  function getLoadOrder(url) {
    var seen = {};
    var list = [];
    function add(u) {
      if (u && !seen[u]) {
        seen[u] = true;
        list.push(u);
      }
    }

    var uuid = getUploadcareUuid(url);

    if (isImgbbUrl(url)) {
      add(proxyUrl(url));
      add(corsProxyUrl(url));
      add(url);
      return list;
    }

    if (isUploadcareUrl(url) && uuid) {
      var suffix = "";
      var sm = url.match(/\/[a-f0-9-]{36}(\/.*)?$/i);
      if (sm && sm[1]) suffix = sm[1];

      add("https://ucarecdn.com/" + uuid + suffix);
      add("https://ucarecdn.com/" + uuid + "/");
      add("https://ucarecdn.com/" + uuid + "/-/resize/750x/");
      add(url);
      add(proxyUrl(url));
      add(corsProxyUrl(url));
      return list;
    }

    add(url);
    add(proxyUrl(url));
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
        window.setTimeout(tryNext, 50);
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
