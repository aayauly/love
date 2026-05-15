// script.js — drop-in replacement for your page

// Simple global menu controls (used by inline onclick attributes in HTML)
function openMenu() {
  const burgerMenu = document.getElementById('burger_menu');
  const overlay = document.getElementById('overlay');
  burgerMenu?.classList.add('open');
  overlay?.classList.add('active');
}

function closeMenu() {
  const burgerMenu = document.getElementById('burger_menu');
  const overlay = document.getElementById('overlay');
  burgerMenu?.classList.remove('open');
  overlay?.classList.remove('active');
}

// run when DOM is ready
function ready(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

ready(() => {
  function toProductImgUrl(raw) {
    return typeof normalizeSheetImageUrl === "function"
      ? normalizeSheetImageUrl(raw)
      : String(raw || "").trim();
  }

  // ====== GLOBALS ======
  let processedItems = [];
  let fields = [];
  let activeCategory = "all";
  let searchTerm = "";
  let specialFilter = null;
  let birthFilterWord = null;
  let popularFilterWord = null;
  let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

  // ====== ELEMENTS (queried after DOM ready) ======
  const loader = document.getElementById("loader");
  // choose header title inside header to avoid duplicate footer id
  const headerTitleEl = document.querySelector("header #header-title");
  const searchBtn = document.getElementById("searchBtn");
  const modal = document.getElementById("modal");
  const modalOverlay = document.getElementById("modalOverlay");
  const modalContent = document.getElementById("modalContent");
  const modalCloseBtn = document.getElementById("closeModal");

  // ====== UTILS ======
  function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function normalizeType(text) {
    const norm = (text || "").toLowerCase();
    return ["сердце", "сердца", "сердец"].includes(norm) ? "сердце" : norm;
  }

  function updateHeaderTitle(key) {
    const labels = {
      all: "LOVE BALLOON",
      women: "Для Девушек",
      men: "Для Мужчин",
      boys: "Для Мальчиков",
      girls: "Для Девочек",
      baby_boy: "Выписка (мальчик)",
      baby_girl: "Выписка (девочка)",
      child: "Ребенку",
      man: "Мужчине",
      woman: "Девушке",
      birth: "День Рождения",
      popular: "Популярные товары",
      gender_party: "Гендер party",
    };
    const t = labels[key] || labels.all;
    if (headerTitleEl) {
      // headerTitleEl may contain an <a> — update text content safely
      headerTitleEl.textContent = t;
    }
  }

  // ====== MODAL OPEN/CLOSE ======
  function openModal({ name = "", img = "", price = "", desc = "" } = {}) {
    if (!modal) return;
    // fill modal fields if exist
    const imgEl = modal.querySelector("#modalImg");
    const titleEl = modal.querySelector("#modalTitle");
    const priceEl = modal.querySelector("#modalPrice");
    const descEl = modal.querySelector("#modalDesc");

    if (imgEl) {
      imgEl.referrerPolicy = "no-referrer";
      if (typeof setProductImage === "function") {
        setProductImage(imgEl, img);
      } else {
        imgEl.src = toProductImgUrl(img);
      }
    }
    if (titleEl) titleEl.textContent = name || "";
    if (priceEl) priceEl.textContent = price ? price + " ₸" : "";
    if (descEl) descEl.textContent = desc || "";

    // show modal (your HTML uses inline style display:none)
    modal.style.display = "flex";
    document.body.style.overflow = "hidden"; // optional: lock background scroll

    // Attach modal controls (remove old listeners by cloning nodes)
    const overlayEl = modal.querySelector('#modalOverlay');
    const contentEl = modal.querySelector('#modalContent');
    const addBtn = modal.querySelector('#addToCartBtn');
    const orderBtn = modal.querySelector('#orderSingleBtn');
    const closeBtn = modal.querySelector('#closeModal');

    // If elements exist, replace them with clones to clear previous listeners
    if (overlayEl) overlayEl.replaceWith(overlayEl.cloneNode(true));
    if (contentEl) contentEl.replaceWith(contentEl.cloneNode(true));
    if (addBtn) addBtn.replaceWith(addBtn.cloneNode(true));
    if (orderBtn) orderBtn.replaceWith(orderBtn.cloneNode(true));
    if (closeBtn) closeBtn.replaceWith(closeBtn.cloneNode(true));

    // Re-query fresh elements
    const newOverlay = modal.querySelector('#modalOverlay');
    const newContent = modal.querySelector('#modalContent');
    const newAddBtn = modal.querySelector('#addToCartBtn');
    const newOrderBtn = modal.querySelector('#orderSingleBtn');
    const newCloseBtn = modal.querySelector('#closeModal');

    // wiring
    newOverlay?.addEventListener('click', () => {
      closeModal();
    });

    newContent?.addEventListener('click', (e) => e.stopPropagation());

    newCloseBtn?.addEventListener('click', () => {
      closeModal();
    });

    newAddBtn?.addEventListener('click', () => {
      const cart = JSON.parse(localStorage.getItem('cartItems') || '[]');
      cart.push({ name, img, price });
      localStorage.setItem('cartItems', JSON.stringify(cart));
      closeModal();
    });

    newOrderBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const message = encodeURIComponent(
        `Здравствуйте! Хочу заказать:\n\n${name} — ${price} ₸\n\nОписание: ${desc}`
      );
      window.open(
        `https://api.whatsapp.com/send?phone=+77013971888&text=${message}`,
        '_blank'
      );
      closeModal();
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "";
  }

  // Wire modal close controls (use existing ids/classes from your HTML)
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeModal();
    });
  }

  // clicking overlay element inside modal (you have #modalOverlay)
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      e.stopPropagation();
      closeModal();
    });
  }

  // clicking outside content but inside modal wrapper:
  if (modal) {
    modal.addEventListener("click", (e) => {
      // if click target is the modal wrapper itself (not modalContent), close
      if (e.target === modal) closeModal();
    });
  }

  // Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // prevent modalContent clicks from bubbling to modal wrapper
  if (modalContent) {
    modalContent.addEventListener("click", (e) => e.stopPropagation());
  }

  // ====== FILTER PANEL ======
  const filterOpenBtn = document.getElementById('filter-open-btn');
  const filterCloseBtn = document.getElementById('filter-close-btn');
  const filterMenu = document.getElementById('filter-menu');
  const filterOverlay = document.getElementById('filter-overlay');

  function openFilter() {
    filterMenu?.classList.add('open');
    // small delay to allow CSS transition
    setTimeout(() => filterMenu?.classList.add('visible'), 10);
    filterOverlay?.classList.add('active');
  }

  function closeFilter() {
    filterMenu?.classList.remove('visible');
    // wait for opacity transition then remove from layout
    setTimeout(() => filterMenu?.classList.remove('open'), 300);
    filterOverlay?.classList.remove('active');
  }

  filterOpenBtn?.addEventListener('click', (e) => { e.stopPropagation(); openFilter(); });
  filterCloseBtn?.addEventListener('click', (e) => { e.stopPropagation(); closeFilter(); });
  filterOverlay?.addEventListener('click', closeFilter);

  // ====== WHATSAPP ORDER ======
  function openWhatsAppOrder(name, price, desc, imgUrl, kaspiUrl) {
    const text =
      `Здравствуйте! Хочу заказать:\n\n` +
      `${name} — ${price} ₸\n` +
      `Описание: ${desc}\n\n` +
      `Фото товара: ${imgUrl}\n\n` +
      `💳 Оплата: ${kaspiUrl}`;

    const encoded = encodeURIComponent(text);
    const whatsappLink = `https://api.whatsapp.com/send?phone=+77013971888&text=${encoded}`;

    const newWin = window.open(whatsappLink, "_blank");
    if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
      window.location.href = whatsappLink;
    }
    closeModal();
  }

  // ====== RENDER CARDS ======
  function renderCards() {
    const prod = document.getElementById("products");
    if (!prod) return;
    prod.innerHTML = "";
    let cnt = 0;

    const activeTypes = [...document.querySelectorAll(".types .tag.active p")].map(el => normalizeType(el.textContent.trim()));
    const activeColors = [...document.querySelectorAll(".colors .tag.active p")].map(el => el.textContent.trim().toLowerCase());

    for (const item of processedItems) {
      const name = item[fields[0]] || "";
      const imgRaw =
        typeof getRowImageUrl === "function"
          ? getRowImageUrl(item, fields)
          : item[fields[1]] || "";
      const img = toProductImgUrl(imgRaw);
      const price = item[fields[2]] || "";
      const desc = item[fields[3]] || "";
      const category = (item[fields[4]] || "").toLowerCase();
      const colors = (item[fields[5]] || "").split(",").map(s => s.trim().toLowerCase());
      const extraBirth = (item[fields[6]] || "").toLowerCase();
      const extraPopular = (item[fields[7]] || "").toLowerCase();

      // category filters
      if (specialFilter) {
        if (!specialFilter.includes(category)) continue;
      } else if (birthFilterWord) {
        if (!extraBirth.includes(birthFilterWord)) continue;
      } else if (popularFilterWord) {
        if (!extraPopular.includes(popularFilterWord)) continue;
      } else if (activeCategory !== "all") {
        if (category !== activeCategory) continue;
      }

      // types/colors/search
      if (activeTypes.length && !activeTypes.every(t => normalizeType(desc.toLowerCase()).includes(t))) continue;
      if (activeColors.length && !activeColors.every(c => colors.includes(c))) continue;
      if (searchTerm && !(name + " " + desc).toLowerCase().includes(searchTerm)) continue;

      cnt++;
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-img-wrap">
          <img class="heart-icon ${favorites.includes(name) ? "favorited" : ""}"
               src="./images/${favorites.includes(name) ? "heart_icon_after" : "heart_icon_before"}.svg"
               alt="Избранное">
        </div>
        <div class="card-title">
          <p>${name}</p>
          <p class="price">${price} ₸</p>
          <button class="order-now">Заказать</button>
        </div>
      `;

      const imgWrap = card.querySelector(".card-img-wrap");
      const productImg = document.createElement("img");
      productImg.className = "all-products-img";
      productImg.alt = name;
      productImg.loading = "lazy";
      productImg.decoding = "async";
      productImg.referrerPolicy = "no-referrer";
      imgWrap.insertBefore(productImg, imgWrap.firstChild);

      prod.appendChild(card);

      if (typeof setProductImage === "function") {
        setProductImage(productImg, imgRaw);
      } else {
        productImg.src = img;
      }

      // Order button — stop propagation (so card click doesn't open modal)
      const orderBtn = card.querySelector(".order-now");
      if (orderBtn) {
        orderBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const kaspiUrl = "https://pay.kaspi.kz/pay/pizgc94e";
          openWhatsAppOrder(name, price, desc, img, kaspiUrl);
        });
      }

      // clicking card opens modal
      card.addEventListener("click", () => openModal({ name, img, price, desc }));

      const heart = card.querySelector(".heart-icon");
      heart?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (favorites.includes(name)) {
          favorites = favorites.filter(n => n !== name);
          heart.src = "./images/heart_icon_before.svg";
          heart.classList.remove("favorited");
        } else {
          favorites.push(name);
          heart.src = "./images/heart_icon_after.svg";
          heart.classList.add("favorited");
        }
        saveFavorites();
      });
    }

    const matchesEl = document.getElementById("matchesCount");
    if (matchesEl) matchesEl.textContent = cnt === 1 ? "1 совпадение" : `${cnt} совпадений`;
  }

  const debouncedRender = debounce(renderCards, 200);

  // ====== FILTERS SETUP ======
  function initFilters() {
    document.querySelectorAll(".tag").forEach(tag => {
      tag.onclick = e => {
        e.stopPropagation();
        const txt = tag.textContent.trim().toLowerCase();
        tag.classList.toggle("active");
        const activeBox = document.querySelector(".active-tags");
        if (tag.classList.contains("active")) {
          if (!activeBox.querySelector(`[data-tag="${txt}"]`)) {
            const el = document.createElement("div");
            el.className = "active-tag";
            el.dataset.tag = txt;
            const col = tag.querySelector(".color");
            if (col) el.appendChild(col.cloneNode(true));
            el.appendChild(Object.assign(document.createElement("span"), { textContent: txt }));
            el.appendChild(Object.assign(document.createElement("span"), { className: "remove-tag", textContent: "✕" }));
            activeBox.appendChild(el);
          }
        } else {
          activeBox.querySelector(`[data-tag="${txt}"]`)?.remove();
        }
        debouncedRender();
      };
    });

    document.querySelector(".active-tags")?.addEventListener("click", e => {
      if (e.target.classList.contains("remove-tag")) {
        const el = e.target.closest(".active-tag");
        const txt = el.dataset.tag;
        el.remove();
        document.querySelectorAll(".tag").forEach(t => {
          if (t.textContent.trim().toLowerCase() === txt) t.classList.remove("active");
        });
        debouncedRender();
      }
    });
  }

  // ====== SEARCH button ======
  if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (document.getElementById("searchInput")) return;

      const input = document.createElement("input");
      Object.assign(input, {
        id: "searchInput",
        type: "text",
        placeholder: "Поиск товаров...",
        style: "width:300px;padding:10px;border-radius:20px;"
      });

      input.addEventListener("input", ev => {
        searchTerm = ev.target.value.trim().toLowerCase();
        debouncedRender();
      });

      input.addEventListener("keydown", ev => {
        if (ev.key === "Escape") {
          searchTerm = "";
          debouncedRender();
          if (headerTitleEl) input.replaceWith(headerTitleEl);
        }
      });

      if (headerTitleEl) headerTitleEl.replaceWith(input);
      input.focus();
    });
  }

  // ====== CATEGORY LIST (simple) ======
  document.querySelectorAll("#categoryList a[data-cat]").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      specialFilter = null;
      document.getElementById("categoryList")?.classList.remove("hide-category-list");
      activeCategory = a.dataset.cat;
      document.querySelectorAll("#categoryList a").forEach(x => x.classList.remove("active"));
      a.classList.add("active");
      // closeMenu(); // you use inline open/close handlers
      debouncedRender();
    });
  });

  document.querySelectorAll(".category h3").forEach(h3 => {
    h3.addEventListener("click", () => {
      document.querySelectorAll("#categoryList a").forEach(x => x.classList.remove("active"));
      activeCategory = "all";

      let key;
      const text = h3.textContent.trim();
      if (text === "РЕБЕНКУ") {
        specialFilter = ["boys", "girls", "baby_boy", "baby_girl"];
        key = "child";
      } else if (text === "МУЖЧИНЕ") {
        specialFilter = ["men"];
        key = "man";
      } else if (text === "ДЕВУШКЕ") {
        specialFilter = ["women"];
        key = "woman";
      } else {
        specialFilter = null;
        key = "all";
      }

      document.querySelectorAll(".category h3").forEach(x => x.classList.remove("active"));
      h3.classList.add("active");
      updateHeaderTitle(key);
      debouncedRender();
    });
  });

  // ====== SLIDER DRAG (if categoryList exists) ======
  const slider = document.querySelector(".category-slider") || document.getElementById("categoryList");
  if (slider) {
    let isDown = false, startX, scrollLeft;
    slider.addEventListener('mousedown', e => {
      isDown = true;
      slider.classList.add('dragging');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => {
      isDown = false;
      slider.classList.remove('dragging');
    });
    slider.addEventListener('mouseup', () => {
      isDown = false;
      slider.classList.remove('dragging');
    });
    slider.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      slider.scrollLeft = scrollLeft - walk;
    });
    // touch
    slider.addEventListener('touchstart', e => {
      startX = e.touches[0].pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('touchmove', e => {
      const x = e.touches[0].pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      slider.scrollLeft = scrollLeft - walk;
    });
  }

  // ====== LOAD DATA & START ======
  function loadAndInit() {
    const urlCat = new URLSearchParams(window.location.search).get("cat");
    const urlSpecial = new URLSearchParams(window.location.search).get("special");

    if (urlCat) {
      activeCategory = urlCat;
      document.querySelectorAll("#categoryList a[data-cat]").forEach(x => x.classList.remove("active"));
      const sel = document.querySelector(`#categoryList a[data-cat="${urlCat}"]`);
      if (sel) sel.classList.add("active");
      updateHeaderTitle(activeCategory);
    }

    if (urlSpecial === "baby") {
      specialFilter = ["baby_boy", "baby_girl"];
      updateHeaderTitle("baby");
      document.getElementById("categoryList")?.classList.add("hide-category-list");
    } else if (urlSpecial === "birth") {
      activeCategory = "all";
      specialFilter = null;
      birthFilterWord = "birth";
      updateHeaderTitle("birth");
      document.getElementById("categoryList")?.classList.add("hide-category-list");
    } else if (urlSpecial === "popular") {
      activeCategory = "all";
      specialFilter = null;
      birthFilterWord = null;
      popularFilterWord = "yes";
      updateHeaderTitle("popular");
      document.getElementById("categoryList")?.classList.add("hide-category-list");
    }

    loader && (loader.style.display = "block");

    // PapaParse (make sure papaparse is loaded)
    Papa.parse(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTbtBsnRAE2vVA4sCdHNUnH_3Rao9DlTnzZxs_C9ate6mA2KA6_WeQsfZaxluCmjBv61Frn-eoIXyoL/pub?output=csv&sheet=Лист1&cb=" + Date.now(),
      {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete(r) {
          fields = r.meta.fields;
          processedItems = r.data;
          initFilters();
          renderCards();
          loader && (loader.style.display = "none");
        },
        error(err) {
          console.error("PapaParse error:", err);
          loader && (loader.style.display = "none");
        }
      }
    );
  }

  // start
  loadAndInit();
});
