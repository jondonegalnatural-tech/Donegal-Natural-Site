// ─── MAIN.JS — Shared across all pages ────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  if (typeof Cart !== 'undefined') {
    initCartUI();
    Cart.loadCart();
  }
});

// ── Navigation ─────────────────────────────────────────────────────────────────
function initNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  hamburger?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('open');
  });

  // Close mobile menu on link click
  mobileMenu?.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => mobileMenu.classList.remove('open'))
  );

  // Scroll to anchor if URL has hash (e.g. wholesale.html#login)
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }
}

// ── Cart UI wiring ─────────────────────────────────────────────────────────────
function initCartUI() {
  if (typeof Cart === 'undefined') return;
  document.getElementById('cart-btn')?.addEventListener('click', Cart.openCart);
  document.getElementById('cart-close')?.addEventListener('click', Cart.closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', Cart.closeCart);
  document.getElementById('checkout-btn')?.addEventListener('click', Cart.checkout);
}

// ── Product Modal ──────────────────────────────────────────────────────────────
let currentProduct = null;

async function openProductModal(handle) {
  const modal = document.getElementById('product-modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;

  // Show modal with loading state
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  content.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted);">
      <div class="skeleton" style="height:16rem;border-radius:1rem;margin-bottom:1rem;"></div>
      <div class="skeleton" style="height:1.5rem;width:60%;margin:0 auto 1rem;"></div>
      <div class="skeleton" style="height:1rem;width:80%;margin:0 auto;"></div>
    </div>`;

  try {
    currentProduct = await ShopifyAPI.getProduct(handle);
    renderModal(currentProduct);
  } catch {
    content.innerHTML = '<p style="color:var(--muted);text-align:center;grid-column:1/-1;padding:2rem;">Could not load product details.</p>';
  }
}

function renderModal(product) {
  const content = document.getElementById('modal-content');
  if (!content || !product) return;

  const images = product.images.nodes;

  // ── Determine price and variant selector ─────────────────────────────────
  const localVariants = (typeof VARIANT_MAP !== 'undefined') ? VARIANT_MAP[product.handle] : null;
  const shopifyVariants = product.variants.nodes;
  const hasShopifyVariants = shopifyVariants.length > 1;

  let displayPrice;
  let variantOptions = '';

  if (localVariants && localVariants.length > 0) {
    displayPrice = localVariants[0].price;
    variantOptions = `
      <div class="modal-variants">
        <label>Select Option</label>
        <div class="variant-btn-group" id="modal-variant-group">
          ${localVariants.map((v, i) =>
            `<button type="button"
               class="variant-btn${i === 0 ? ' selected' : ''}"
               data-price="${v.price}"
               data-label="${v.label}"
               onclick="selectVariantBtn(this)">
               ${v.label}
             </button>`
          ).join('')}
        </div>
      </div>`;
  } else if (hasShopifyVariants) {
    const first = shopifyVariants[0];
    displayPrice = ShopifyAPI.formatPrice(first.price.amount, first.price.currencyCode);
    variantOptions = `
      <div class="modal-variants">
        <label>Select Option</label>
        <select id="modal-variant-select">
          ${shopifyVariants.map(v =>
            `<option value="${v.id}" data-price="${v.price.amount}" data-currency="${v.price.currencyCode}" ${!v.availableForSale ? 'disabled' : ''}>
              ${v.title}${!v.availableForSale ? ' (Out of stock)' : ''}
            </option>`
          ).join('')}
        </select>
      </div>`;
  } else {
    const shopifyPrice = ShopifyAPI.formatPrice(
      product.priceRange.minVariantPrice.amount,
      product.priceRange.minVariantPrice.currencyCode
    );
    displayPrice = (typeof RETAIL_PRICE_MAP !== 'undefined' && RETAIL_PRICE_MAP[product.handle])
      ? RETAIL_PRICE_MAP[product.handle]
      : (shopifyPrice !== '$0.00' ? shopifyPrice : 'Contact for pricing');
  }

  // ── Image gallery ─────────────────────────────────────────────────────────
  const galleryHtml = images.length > 0 ? `
    <div class="modal-gallery">
      <div class="modal-gallery-main" id="modal-gallery-main">
        <img src="${images[0].url}" alt="${images[0].altText || product.title}" id="modal-main-img">
        ${images.length > 1 ? `
          <button class="gallery-arrow gallery-prev" onclick="galleryNav(-1)" aria-label="Previous image">&#8249;</button>
          <button class="gallery-arrow gallery-next" onclick="galleryNav(1)" aria-label="Next image">&#8250;</button>
        ` : ''}
      </div>
      ${images.length > 1 ? `
        <div class="modal-thumbs" id="modal-thumbs">
          ${images.map((img, i) =>
            `<button class="modal-thumb${i === 0 ? ' active' : ''}" data-index="${i}" onclick="galleryGoTo(${i})" aria-label="Image ${i+1}">
               <img src="${img.url}" alt="${img.altText || product.title}">
             </button>`
          ).join('')}
        </div>
      ` : ''}
    </div>` : `<div class="modal-gallery"><div class="modal-gallery-main" style="font-size:4rem;display:flex;align-items:center;justify-content:center;">🐾</div></div>`;

  content.innerHTML = `
    ${galleryHtml}
    <div class="modal-info">
      ${product.productType ? `<span class="product-tag">${product.productType}</span>` : ''}
      <h2>${product.title}</h2>
      <div class="modal-price" id="modal-price">${displayPrice}</div>
      <p class="modal-desc">${product.description || 'All-natural, single-ingredient treat from Donegal Natural.'}</p>
      ${variantOptions}
      <button class="add-to-cart-btn" id="modal-add-btn" onclick="addToCartFromModal()">
        Add to Cart
      </button>
    </div>`;

  // Store images on window for gallery nav
  window._modalImages = images;
  window._modalImageIndex = 0;

  // Shopify select variant price update
  document.getElementById('modal-variant-select')?.addEventListener('change', e => {
    const opt = e.target.options[e.target.selectedIndex];
    document.getElementById('modal-price').textContent =
      ShopifyAPI.formatPrice(opt.dataset.price, opt.dataset.currency);
  });
}

// ── Gallery navigation ────────────────────────────────────────────────────────
function galleryNav(dir) {
  const images = window._modalImages || [];
  if (images.length < 2) return;
  window._modalImageIndex = (window._modalImageIndex + dir + images.length) % images.length;
  galleryGoTo(window._modalImageIndex);
}

function galleryGoTo(index) {
  const images = window._modalImages || [];
  if (!images[index]) return;
  window._modalImageIndex = index;

  const mainImg = document.getElementById('modal-main-img');
  if (mainImg) {
    mainImg.style.opacity = '0';
    setTimeout(() => {
      mainImg.src = images[index].url;
      mainImg.alt = images[index].altText || '';
      mainImg.style.opacity = '1';
    }, 120);
  }

  document.querySelectorAll('.modal-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === index);
  });
}

// ── Variant button click handler ───────────────────────────────────────────────
function selectVariantBtn(btn) {
  const group = document.getElementById('modal-variant-group');
  group?.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('modal-price').textContent = btn.dataset.price;
}

function addToCartFromModal() {
  if (typeof Cart === 'undefined') return;
  if (!currentProduct) return;

  // Check for local variant selection first
  const localVariants = (typeof VARIANT_MAP !== 'undefined') ? VARIANT_MAP[currentProduct.handle] : null;
  if (localVariants && localVariants.length > 0) {
    const selectedBtn = document.querySelector('#modal-variant-group .variant-btn.selected');
    const label = selectedBtn ? selectedBtn.dataset.label : localVariants[0].label;
    const price = selectedBtn ? selectedBtn.dataset.price : localVariants[0].price;
    const variantId = currentProduct.variants.nodes[0]?.id;
    if (!variantId) { showToast('Could not add to cart.', 'error'); return; }
    Cart.addItem(variantId, `${currentProduct.title} — ${label}`, price);
    closeProductModal();
    return;
  }

  // Shopify variant select fallback
  const select = document.getElementById('modal-variant-select');
  const variantId = select
    ? select.value
    : currentProduct.variants.nodes[0]?.id;

  if (!variantId) { showToast('Please select a variant.', 'error'); return; }

  // Look up retail price for single-variant products from RETAIL_PRICE_MAP
  let retailPrice = null;
  if (typeof RETAIL_PRICE_MAP !== 'undefined' && RETAIL_PRICE_MAP[currentProduct.handle]) {
    const mapVal = RETAIL_PRICE_MAP[currentProduct.handle];
    // Strip "Starting at " prefix and use the raw dollar string
    retailPrice = mapVal.replace('Starting at ', '').trim();
  }

  Cart.addItem(variantId, currentProduct.title, retailPrice);
  closeProductModal();
}

function closeProductModal() {
  document.getElementById('product-modal')?.classList.remove('open');
  document.body.style.overflow = '';
  currentProduct = null;
}

// Close modal on overlay click or close button
document.addEventListener('click', e => {
  if (e.target.id === 'product-modal' || e.target.id === 'modal-close') {
    closeProductModal();
  }
});

// Keyboard support
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeProductModal();
    if (typeof Cart !== 'undefined') Cart.closeCart();
  }
});
