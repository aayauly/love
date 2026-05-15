/**
 * Product images from Google Sheets (Uploadcare CDN).
 * Do NOT rewrite *.ucarecd.net → ucarecdn.com (different projects → 404).
 */
(function (global) {
  "use strict";

  var PRODUCT_IMG_PLACEHOLDER =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZThlOGU4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtc2l6ZT0iMjAiPtCk0L7RgtC+PC90ZXh0Pjwvc3ZnPg==";

  var MAX_CONCURRENT = 5;
  var queue = [];
  var active = 0;

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

  /** Find photo column even if header text varies. */
  function findImageFieldName(fields) {
    if (!fields || !fields.length) return null;
    for (var i = 0; i < fields.length; i++) {
      if (/фото|photo/i.test(fields[i])) return fields[i];
    }
    return fields[1] || fields[0];
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
    var filePath = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (filePath) fileId = filePath[1];
    if (!fileId && /drive\.google\.com/.test(url)) {
      var idParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParam) fileId = idParam[1];
    }
    if (fileId) {
      return "https://drive.google.com/uc?export=view&id=" + fileId;
    }

    return url;
  }

  function proxyImageUrl(url) {
    return (
      "https://images.weserv.nl/?url=" +
      encodeURIComponent(url.replace(/^https?:\/\//, "")) +
      "&w=750&h=1000&fit=inside&we&output=jpg"
    );
  }

  function getProductImageCandidates(raw) {
    var url = normalizeSheetImageUrl(raw);
    if (!url) return [];

    var seen = {};
    var list = [];
    function add(u) {
      if (u && !seen[u]) {
        seen[u] = true;
        list.push(u);
      }
    }

    add(url);

    if (isUploadcareUrl(url)) {
      var base = url.match(/^(https?:\/\/[^/]+\/[a-f0-9-]{36})/i);
      if (base) {
        add(base[1] + "/");
        add(base[1] + "/-/resize/750x/");
        add(base[1] + "/-/format/auto/-/quality/smart/");
      }
      add(proxyImageUrl(url));
    }

    return list;
  }

  function referrerPolicyForUrl(url) {
    return isGoogleImageUrl(url) ? "no-referrer" : "";
  }

  function loadImageNow(imgEl, rawUrl, placeholder, done) {
    var candidates = getProductImageCandidates(rawUrl);
    var fallback = placeholder || PRODUCT_IMG_PLACEHOLDER;
    var idx = 0;
    var generation = 0;

    function finish() {
      imgEl.onload = null;
      imgEl.onerror = null;
      if (done) done();
    }

    function failAll() {
      imgEl.src = fallback;
      finish();
    }

    function tryNext() {
      if (idx >= candidates.length) {
        failAll();
        return;
      }
      var gen = ++generation;
      var tryUrl = candidates[idx++];

      imgEl.referrerPolicy = referrerPolicyForUrl(tryUrl);
      imgEl.onload = function () {
        if (gen !== generation) return;
        finish();
      };
      imgEl.onerror = function () {
        if (gen !== generation) return;
        window.setTimeout(tryNext, 80);
      };
      imgEl.src = tryUrl;
    }

    tryNext();
    return candidates[0] || "";
  }

  function drainQueue() {
    while (active < MAX_CONCURRENT && queue.length) {
      var job = queue.shift();
      active++;
      loadImageNow(job.imgEl, job.rawUrl, job.placeholder, function () {
        active--;
        drainQueue();
      });
    }
  }

  function applyProductImage(imgEl, rawUrl, placeholder) {
    if (!imgEl) return normalizeSheetImageUrl(rawUrl);
    queue.push({ imgEl: imgEl, rawUrl: rawUrl, placeholder: placeholder });
    drainQueue();
    return normalizeSheetImageUrl(rawUrl);
  }

  function observeProductImage(imgEl, rawUrl, placeholder) {
    if (!imgEl) return;
    if (!("IntersectionObserver" in global)) {
      applyProductImage(imgEl, rawUrl, placeholder);
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        applyProductImage(imgEl, rawUrl, placeholder);
      },
      { rootMargin: "300px", threshold: 0.01 }
    );
    io.observe(imgEl);
  }

  global.PRODUCT_IMG_PLACEHOLDER = PRODUCT_IMG_PLACEHOLDER;
  global.normalizeSheetImageUrl = normalizeSheetImageUrl;
  global.findImageFieldName = findImageFieldName;
  global.getRowImageUrl = getRowImageUrl;
  global.getProductImageCandidates = getProductImageCandidates;
  global.applyProductImage = applyProductImage;
  global.observeProductImage = observeProductImage;
  global.referrerPolicyForUrl = referrerPolicyForUrl;
})(typeof window !== "undefined" ? window : globalThis);
