// ─── CART STATE & DRAWER ─────────────────────────────────────────────────────
const Cart = (() => {
  const CART_ID_KEY = 'dn_cart_id';
  let cartId = null;
  let cartData = null;

  // Persist cart ID in sessionStorage (works in all browsers, no cookies needed)
  function getStoredCartId() {
    try { return sessionStorage.getItem(CART_ID_KEY); } catch { return null; }
  }
  function setStoredCartId(id) {
    try { sessionStorage.setItem(CART_ID_KEY, id); } catch {}
  }

  async function ensureCart() {
    if (cartId) return cartId;
    const stored = getStoredCartId();
    if (stored) { cartId = stored; return cartId; }
    const cart = await ShopifyAPI.createCart();
    cartId = cart.id;
    setStoredCartId(cartId);
    return cartId;
  }

  async function addItem(variantId, productTitle, variantPrice) {
    // variantPrice is optional — used when a local variant (not Shopify) is selected
    try {
      const id = await ensureCart();
      cartData = await ShopifyAPI.addToCart(id, variantId, 1);
      // If a local variant label was passed in productTitle (e.g. "Braided Bully Sticks — 6""),
      // store a note so the cart can display the correct variant name
      if (variantPrice) {
        // Store local variant overrides keyed by variantId
        const overrides = JSON.parse(sessionStorage.getItem('dn_variant_overrides') || '{}');
        overrides[variantId] = { title: productTitle, price: variantPrice };
        sessionStorage.setItem('dn_variant_overrides', JSON.stringify(overrides));
      }
      renderCart();
      openCart();
      showToast(`Added "${productTitle}" to cart`);
    } catch (e) {
      showToast('Could not add to cart. Please try again.', 'error');
    }
  }

  async function updateItem(lineId, quantity) {
    try {
      const id = await ensureCart();
      cartData = await ShopifyAPI.updateCartLine(id, lineId, quantity);
      renderCart();
    } catch (e) {
      showToast('Could not update cart.', 'error');
    }
  }

  async function loadCart() {
    const stored = getStoredCartId();
    if (!stored) return;
    try {
      cartId = stored;
      cartData = await ShopifyAPI.getCart(cartId);
      renderCart();
    } catch {}
  }

  function renderCart() {
    const itemsEl  = document.getElementById('cart-items');
    const footerEl = document.getElementById('cart-footer');
    const countEl  = document.getElementById('cart-count');
    if (!itemsEl) return;

    const lines = cartData?.lines?.nodes || [];
    const totalQty = lines.reduce((s, l) => s + l.quantity, 0);

    // Update badge
    if (countEl) {
      countEl.textContent = totalQty;
      countEl.classList.toggle('visible', totalQty > 0);
    }

    if (lines.length === 0) {
      itemsEl.innerHTML = '<div class="cart-empty">Your cart is empty.<br><br><a href="shop.html" style="color:var(--green);font-weight:700;">Browse treats →</a></div>';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    // Load any variant price overrides stored at add-to-cart time
    const overrides = JSON.parse(sessionStorage.getItem('dn_variant_overrides') || '{}');

    let cartSubtotal = 0;

    itemsEl.innerHTML = lines.map(line => {
      const v = line.merchandise;
      const imgUrl = v.product.images.nodes[0]?.url;
      const handle = v.product.handle;

      // ── Determine the correct retail unit price ───────────────────────────
      // 1. Check sessionStorage for a variant-specific price set at add-to-cart
      const override = overrides[v.id];
      let unitPrice = null;
      let variantLabel = v.title !== 'Default Title' ? v.title : '';

      if (override && override.price) {
        // override.price is like "$1.00" — strip $ and parse
        unitPrice = parseFloat(override.price.replace(/[^0-9.]/g, ''));
        if (override.title && override.title.includes('—')) {
          variantLabel = override.title.split('—').slice(1).join('—').trim();
        }
      }

      // 2. Fall back to RETAIL_PRICE_MAP — use the first numeric price found
      if (!unitPrice && typeof RETAIL_PRICE_MAP !== 'undefined' && RETAIL_PRICE_MAP[handle]) {
        const mapVal = RETAIL_PRICE_MAP[handle];
        const parsed = parseFloat(mapVal.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed > 0) unitPrice = parsed;
      }

      // 3. Last resort: Shopify stored price (should rarely be needed)
      if (!unitPrice) {
        const sp = parseFloat(v.price.amount);
        unitPrice = sp > 0 ? sp : 0;
      }

      const lineTotal = (unitPrice * line.quantity).toFixed(2);
      cartSubtotal += parseFloat(lineTotal);

      return `
        <div class="cart-item">
          <div class="cart-item-img">
            ${imgUrl ? `<img src="${imgUrl}" alt="${v.product.title}">` : '🐾'}
          </div>
          <div>
            <div class="cart-item-title">${v.product.title}</div>
            ${variantLabel ? `<div class="cart-item-variant">${variantLabel}</div>` : ''}
            <div class="cart-item-qty">
              <button class="qty-btn" onclick="Cart.updateItem('${line.id}', ${line.quantity - 1})" aria-label="Decrease">−</button>
              <input class="qty-input" type="number" min="0" value="${line.quantity}"
                onchange="Cart.updateItem('${line.id}', Math.max(0, parseInt(this.value)||0))"
                onclick="this.select()"
                aria-label="Quantity">
              <button class="qty-btn" onclick="Cart.updateItem('${line.id}', ${line.quantity + 1})" aria-label="Increase">+</button>
            </div>
          </div>
          <div class="cart-item-price">$${lineTotal}</div>
        </div>`;
    }).join('');

    if (footerEl) {
      footerEl.style.display = 'block';
      document.getElementById('cart-subtotal').textContent =
        '$' + cartSubtotal.toFixed(2);
    }
  }

  function openCart() {
    document.getElementById('cart-drawer')?.classList.add('open');
    document.getElementById('cart-overlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    document.getElementById('cart-drawer')?.classList.remove('open');
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function checkout() {
    if (cartData?.checkoutUrl) {
      window.location.href = cartData.checkoutUrl;
    } else {
      showToast('Add items to your cart first.', 'error');
    }
  }

  return { addItem, updateItem, loadCart, openCart, closeCart, checkout, renderCart };
})();

// ── Toast notifications ────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
