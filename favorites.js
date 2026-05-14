// ========== ПЕРЕМЕННЫЕ ==========
function toProductImgUrl(raw) {
  return typeof normalizeSheetImageUrl === "function"
    ? normalizeSheetImageUrl(raw)
    : String(raw || "").trim();
}

const baseCSVUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTbtBsnRAE2vVA4sCdHNUnH_3Rao9DlTnzZxs_C9ate6mA2KA6_WeQsfZaxluCmjBv61Frn-eoIXyoL/pub?output=csv&sheet=Лист1";

let items = [],
  fields = [];
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

// ========== MENU / BURGER ==========
const burgerMenu = document.getElementById("burger_menu");
const overlayEl = document.getElementById("overlay");
const openBurgerBtns = document.querySelectorAll(
  '.icon-button[onclick="openMenu()"]'
);
const closeBurgerBtns = document.querySelectorAll(".close-icon, #overlay");

function openMenu() {
  burgerMenu?.classList.add("open");
  overlayEl?.classList.add("active");
}

function closeMenu() {
  burgerMenu?.classList.remove("open");
  overlayEl?.classList.remove("active");
}

// Навешиваем слушатели
openBurgerBtns.forEach((btn) => btn.addEventListener("click", openMenu));
closeBurgerBtns.forEach((btn) => btn.addEventListener("click", closeMenu));

// ========== ЗАГРУЗКА И РЕНДЕР ИЗБРАННЫХ ==========
function loadFavorites() {
  Papa.parse(baseCSVUrl + "&cb=" + Date.now(), {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete(r) {
      fields = r.meta.fields;
      items = r.data;
      renderFavorites();
    },
  });
}

function renderFavorites() {
  const grid = document.getElementById("favoritesGrid");
  const warning = document.getElementById("emptyFavWarning");
  grid.innerHTML = "";

  // фильтруем товары по именам в favorites
  const favItems = items.filter((item) => favorites.includes(item[fields[0]]));
  if (favItems.length === 0) {
    warning.style.display = "block";
    return;
  }
  warning.style.display = "none";

  favItems.forEach((raw) => {
    const name = raw[fields[0]] || "";
    const img = toProductImgUrl(raw[fields[1]] || "");
    const price = raw[fields[2]] || "";
    const desc = raw[fields[3]] || "";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-img-wrap">
        <img loading="lazy" class='all-products-img' src="${img}" referrerpolicy="no-referrer" decoding="async" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'240\' height=\'160\'><rect width=\'100%\' height=\'100%\' fill=\'%23e8e8e8\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'20\'>Фото</text></svg>'">
    <img
      class="heart-icon ${favorites.includes(name) ? "favorited" : ""}"
      src="./images/${
        favorites.includes(name) ? "heart_icon_after" : "heart_icon_before"
      }.svg"
      alt="Избранное"
    />
  </div>
  <p>${name}</p>
  <p class="price">${price} ₸</p>
    `;

    // открыть модалку
    card.addEventListener("click", () => openModal({ name, img, price, desc }));

    // убрать из избранного
    card.querySelector(".heart-icon").addEventListener("click", (e) => {
      e.stopPropagation();
      favorites = favorites.filter((n) => n !== name);
      localStorage.setItem("favorites", JSON.stringify(favorites));
      renderFavorites();
    });

    grid.appendChild(card);
  });
}

// ========== МОДАЛКА ==========
function openModal({ name, img, price, desc }) {
  const modal     = document.getElementById('modal');
  const overlay   = modal.querySelector('#modalOverlay');
  const content   = modal.querySelector('#modalContent');
  const imgEl     = modal.querySelector('#modalImg');
  const titleEl   = modal.querySelector('#modalTitle');
  const priceEl   = modal.querySelector('#modalPrice');
  const descEl    = modal.querySelector('#modalDesc');
  const addBtn    = modal.querySelector('#addToCartBtn');
  const orderBtn  = modal.querySelector('#orderSingleBtn');
  const closeBtn  = modal.querySelector('#closeModal');

  // наполняем
  imgEl.referrerPolicy = "no-referrer";
  imgEl.src           = img;
  titleEl.textContent = name;
  priceEl.textContent = price + ' ₸';
  descEl.textContent  = desc;
  modal.style.display = 'flex';

  // очищаем старые слушатели
  overlay.replaceWith(overlay.cloneNode(true));
  content.replaceWith(content.cloneNode(true));
  addBtn.replaceWith(addBtn.cloneNode(true));
  orderBtn.replaceWith(orderBtn.cloneNode(true));
  closeBtn.replaceWith(closeBtn.cloneNode(true));

  // заново получить элементы
  const newOverlay  = modal.querySelector('#modalOverlay');
  const newContent  = modal.querySelector('#modalContent');
  const newAddBtn   = modal.querySelector('#addToCartBtn');
  const newOrderBtn = modal.querySelector('#orderSingleBtn');
  const newCloseBtn = modal.querySelector('#closeModal');

  // клик по оверлею закрывает
  newOverlay.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // клики внутри контента не всплывают
  newContent.addEventListener('click', e => {
    e.stopPropagation();
  });

  // крестик тоже закрывает
  newCloseBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // добавление в корзину
  newAddBtn.addEventListener('click', () => {
    const cart = JSON.parse(localStorage.getItem('cartItems') || '[]');
    cart.push({ name, img, price });
    localStorage.setItem('cartItems', JSON.stringify(cart));
    modal.style.display = 'none';
  });

  // заказ в WhatsApp — с первого клика!
  newOrderBtn.addEventListener('click', e => {
    e.stopPropagation();
    const message = encodeURIComponent(
      `Здравствуйте! Хочу заказать:\n\n${name} — ${price} ₸\n\nОписание: ${desc}`
    );
    window.open(
      `https://api.whatsapp.com/send?phone=+77013971888&text=${message}`,
      '_blank'
    );
    modal.style.display = 'none';
  });
}


// ========== INIT ==========
document.addEventListener("DOMContentLoaded", loadFavorites);
